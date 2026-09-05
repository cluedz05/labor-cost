// ============================================
// 多绮爱服饰 - 在线多人共享同步模块 v1.0
// 基于REST API的简单同步方案
// ============================================

(function() {
    'use strict';

    console.log('📦 online-sync.js 已加载 (在线多人共享版本)');

    // ============================================
    // 配置
    // ============================================
    
    // 后端API地址（部署后修改为你的实际地址）
    let API_BASE_URL = localStorage.getItem('online_api_url') || '';
    
    // 同步间隔（毫秒）
    const SYNC_INTERVAL = 10000; // 每10秒同步一次
    
    // 数据key列表（需要同步的数据）
    const DATA_KEYS = [
        'gf_cost_db',
        'gf_cost_config',
        'gf_cost_users',
        'gf_cost_export_logs',
        'styles',
        'style_library',
        'app_current_user'
    ];
    
    // 同步状态
    let isSyncing = false;
    let lastSyncTime = null;
    let syncTimer = null;
    let isOnline = API_BASE_URL !== '';
    
    // ============================================
    // 公共API
    // ============================================
    
    window.OnlineSync = {
        // 初始化
        init: function() {
            console.log('🔄 初始化在线同步...');
            console.log('API地址:', API_BASE_URL || '未配置');
            
            if (!isOnline) {
                console.warn('⚠️ 未配置API地址，在线同步未启用');
                return;
            }
            
            // 启动时从服务器同步一次
            this.syncFromServer();
            
            // 启动定时同步
            this.startAutoSync();
            
            console.log('✅ 在线同步已启动');
        },
        
        // 设置API地址
        setApiUrl: function(url) {
            API_BASE_URL = url;
            localStorage.setItem('online_api_url', url);
            isOnline = url !== '';
            console.log('API地址已设置:', url);
            
            if (isOnline) {
                this.init();
            }
        },
        
        // 获取API地址
        getApiUrl: function() {
            return API_BASE_URL;
        },
        
        // 检查是否在线
        isOnline: function() {
            return isOnline;
        },
        
        // 从服务器同步数据
        syncFromServer: async function() {
            if (!isOnline || isSyncing) return;
            
            isSyncing = true;
            console.log('📥 从服务器同步数据...');
            
            try {
                const response = await fetch(`${API_BASE_URL}/data`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    // 保存数据到localStorage
                    let updatedCount = 0;
                    for (const key of DATA_KEYS) {
                        if (result.data[key] !== undefined) {
                            const value = typeof result.data[key] === 'string' 
                                ? result.data[key] 
                                : JSON.stringify(result.data[key]);
                            localStorage.setItem(key, value);
                            updatedCount++;
                        }
                    }
                    
                    lastSyncTime = new Date();
                    console.log(`✅ 从服务器同步成功，更新了${updatedCount}个数据项`);
                    
                    // 触发数据更新事件
                    window.dispatchEvent(new CustomEvent('online-data-updated', {
                        detail: { source: 'server', time: lastSyncTime }
                    }));
                    
                    return true;
                }
            } catch (error) {
                console.error('❌ 从服务器同步失败:', error);
            } finally {
                isSyncing = false;
            }
            
            return false;
        },
        
        // 同步数据到服务器
        syncToServer: async function() {
            if (!isOnline || isSyncing) return;
            
            isSyncing = true;
            console.log('📤 同步数据到服务器...');
            
            try {
                // 收集需要同步的数据
                const data = {};
                for (const key of DATA_KEYS) {
                    const value = localStorage.getItem(key);
                    if (value !== null) {
                        try {
                            data[key] = JSON.parse(value);
                        } catch (e) {
                            data[key] = value;
                        }
                    }
                }
                
                const response = await fetch(`${API_BASE_URL}/data`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    lastSyncTime = new Date();
                    console.log('✅ 同步数据到服务器成功');
                    return true;
                }
            } catch (error) {
                console.error('❌ 同步数据到服务器失败:', error);
            } finally {
                isSyncing = false;
            }
            
            return false;
        },
        
        // 批量更新特定key的数据
        updateKeys: async function(updates) {
            if (!isOnline) return false;
            
            try {
                const response = await fetch(`${API_BASE_URL}/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                
                const result = await response.json();
                return result.success;
            } catch (error) {
                console.error('❌ 批量更新失败:', error);
                return false;
            }
        },
        
        // 启动自动同步
        startAutoSync: function() {
            if (syncTimer) clearInterval(syncTimer);
            
            syncTimer = setInterval(() => {
                this.syncFromServer();
            }, SYNC_INTERVAL);
            
            console.log(`⏰ 自动同步已启动，每${SYNC_INTERVAL/1000}秒同步一次`);
        },
        
        // 停止自动同步
        stopAutoSync: function() {
            if (syncTimer) {
                clearInterval(syncTimer);
                syncTimer = null;
                console.log('⏰ 自动同步已停止');
            }
        },
        
        // 获取最后同步时间
        getLastSyncTime: function() {
            return lastSyncTime;
        },
        
        // 手动触发同步
        forceSync: async function() {
            await this.syncToServer();
            await this.syncFromServer();
        }
    };
    
    // ============================================
    // 监听本地数据变化，自动同步到服务器
    // ============================================
    
    // 防抖函数
    let debounceTimer = null;
    function debounceSync() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (isOnline) {
                window.OnlineSync.syncToServer();
            }
        }, 2000); // 2秒防抖
    }
    
    // 监听localStorage变化
    window.addEventListener('storage', (event) => {
        if (DATA_KEYS.includes(event.key)) {
            console.log(`📝 检测到本地数据变化: ${event.key}`);
            debounceSync();
        }
    });
    
    // 重写localStorage.setItem，监听数据变化
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
        originalSetItem(key, value);
        if (DATA_KEYS.includes(key)) {
            debounceSync();
        }
    };
    
    // 页面加载完成后自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.OnlineSync.init();
        });
    } else {
        window.OnlineSync.init();
    }

})();
