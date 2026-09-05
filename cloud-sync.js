// ============================================
// 多绮爱服饰 - 云端实时同步模块 v7.0
// 自建后端版本：Vercel Functions + Upstash Redis
// 不再依赖Supabase，完全可控，没有流量配额限制
// ============================================

(function() {
    'use strict';

    // 版本号
    const CLOUD_SYNC_VERSION = 'v7.0';
    console.log('📦 cloud-sync.js 版本:', CLOUD_SYNC_VERSION, '(自建后端版本)');

    // ============================================
    // 配置
    // ============================================
    
    // 后端API地址（部署Vercel后替换成你的域名）
    // 可以在管理后台配置，也可以直接修改这里
    let API_BASE_URL = localStorage.getItem('cloud_api_base_url') || '';
    
    // 如果没有配置，使用默认的占位地址（用户需要部署后配置）
    if (!API_BASE_URL) {
        API_BASE_URL = 'https://your-project.vercel.app/api';
        console.warn('⚠️ 未配置后端API地址，请在管理后台配置你的Vercel API地址');
    }
    
    console.log('📡 后端API地址:', API_BASE_URL);

    // 数据key列表（保持和之前一致）
    const DATA_KEYS = [
        'gf_cost_db',           // 主要数据（款式、工序、回收站）
        'gf_cost_config',       // 配置
        'gf_cost_users',        // 用户
        'gf_cost_backups',      // 备份
        'gf_cost_export_logs',  // 导出记录
        'styles',               // 旧版本款式数据（兼容）
        'style_library',        // 款式库
        'app_users',            // 应用用户
        'app_current_user',     // 当前用户
        'backups',              // 备份数据
        'app_auto_backups'      // 自动备份
    ];
    
    const LAST_SYNC_KEY = 'cloud_sync_last_sync';
    
    // ============================================
    // 状态变量
    // ============================================
    let syncTimer = null;
    let isSyncing = false;
    let justSyncedFromCloud = false;
    let justSyncedTimer = null;
    let pageLoadTime = Date.now();
    let isApplyingCloudChange = false; // 标志：正在应用云端变化，避免触发自动同步
    
    // 优化：减少频繁同步 - 同步间隔限制
    let lastSyncTime = 0;
    const MIN_SYNC_INTERVAL = 3000; // 最少3秒才能同步一次
    
    // 记录上次同步的数据hash，只同步变化的数据
    let lastSyncHashes = {};
    
    // SSE实时连接
    let eventSource = null;
    let sseConnected = false;
    
    // ============================================
    // 工具函数
    // ============================================
    
    // 简单的hash函数，用于检测数据变化
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    
    // 压缩款式图片（简化版）
    function compressImagesInData(dataStr) {
        try {
            const data = JSON.parse(dataStr);
            
            // 压缩款式中的图片
            if (data.styles && Array.isArray(data.styles)) {
                for (const style of data.styles) {
                    if (style.images && Array.isArray(style.images)) {
                        style.images = style.images.map(img => {
                            if (typeof img === 'string' && img.length > 100000) {
                                console.log(`🖼️ 压缩款式图片: ${style.name}, 原大小: ${img.length} 字节`);
                                return img; // 暂时返回原图，后续可以添加Canvas压缩
                            }
                            return img;
                        });
                    }
                    if (style.image && typeof style.image === 'string' && style.image.length > 100000) {
                        console.log(`🖼️ 压缩款式图片: ${style.name}, 原大小: ${style.image.length} 字节`);
                    }
                }
            }
            
            return JSON.stringify(data);
        } catch(e) {
            return dataStr;
        }
    }

    // ============================================
    // API调用函数
    // ============================================
    
    // 通用API请求
    async function apiRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API请求错误 [${endpoint}]:`, error);
            throw error;
        }
    }
    
    // 上传单个数据
    async function uploadData(key, value) {
        try {
            const result = await apiRequest('/data', {
                method: 'POST',
                body: JSON.stringify({ key, value }),
            });
            return result.success;
        } catch (error) {
            console.error(`上传失败 ${key}:`, error);
            return false;
        }
    }
    
    // 下载单个数据
    async function downloadData(key) {
        try {
            const result = await apiRequest(`/data?key=${encodeURIComponent(key)}`, {
                method: 'GET',
            });
            return result.found ? result.value : null;
        } catch (error) {
            console.error(`下载失败 ${key}:`, error);
            return null;
        }
    }
    
    // 批量上传数据
    async function batchUploadData(data) {
        try {
            const result = await apiRequest('/batch', {
                method: 'POST',
                body: JSON.stringify({ data }),
            });
            return result.success;
        } catch (error) {
            console.error('批量上传失败:', error);
            return false;
        }
    }
    
    // 批量下载数据
    async function batchDownloadData(keys = null) {
        try {
            let endpoint = '/batch';
            if (keys && keys.length > 0) {
                endpoint += `?keys=${keys.join(',')}`;
            }
            const result = await apiRequest(endpoint, {
                method: 'GET',
            });
            return result.success ? result.data : {};
        } catch (error) {
            console.error('批量下载失败:', error);
            return {};
        }
    }

    // ============================================
    // SSE实时同步
    // ============================================
    
    function initRealtime() {
        if (eventSource) {
            eventSource.close();
        }
        
        try {
            console.log('📡 正在连接实时同步...');
            eventSource = new EventSource(`${API_BASE_URL}/realtime`);
            
            eventSource.addEventListener('connected', (event) => {
                sseConnected = true;
                console.log('✅ 实时同步已连接');
                showToast('📡 实时同步已连接');
            });
            
            eventSource.addEventListener('data_updated', (event) => {
                console.log('🔴 收到数据更新通知');
                // 延迟一点再同步，避免频繁同步
                setTimeout(() => {
                    if (!isApplyingCloudChange) {
                        syncFromCloud(true);
                    }
                }, 500);
            });
            
            eventSource.addEventListener('heartbeat', (event) => {
                // 心跳包，不需要处理
            });
            
            eventSource.onerror = (error) => {
                sseConnected = false;
                console.warn('⚠️ 实时同步连接断开，正在自动重连...');
                // EventSource会自动重连，不需要手动处理
            };
            
        } catch (error) {
            console.error('实时同步初始化失败:', error);
            // 降级为轮询
            startFallbackPolling();
        }
    }
    
    // 降级方案：轮询（每10秒检查一次更新）
    let pollingTimer = null;
    function startFallbackPolling() {
        if (pollingTimer) clearInterval(pollingTimer);
        console.log('🔄 启动轮询降级方案（每10秒检查一次）...');
        pollingTimer = setInterval(() => {
            if (!isSyncing && !isApplyingCloudChange) {
                console.log('🔄 轮询：检查云端最新数据...');
                syncFromCloud(true);
            }
        }, 10000);
    }

    // ============================================
    // 同步到云端（用户修改数据后自动调用）
    // 优化：只同步变化的数据，减少流量消耗
    // ============================================
    async function syncToCloud() {
        if (isSyncing) return;
        
        // 同步间隔限制，最少3秒才能同步一次
        const now = Date.now();
        if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
            console.log(`⏳ 同步间隔限制，等待${Math.ceil((MIN_SYNC_INTERVAL - (now - lastSyncTime)) / 1000)}秒后再同步`);
            if (syncTimer) clearTimeout(syncTimer);
            syncTimer = setTimeout(() => {
                syncToCloud();
            }, MIN_SYNC_INTERVAL - (now - lastSyncTime));
            return;
        }
        
        isSyncing = true;
        lastSyncTime = now;
        console.log('☁️ 开始同步到云端（只同步变化的数据）...');
        
        let successCount = 0;
        const changedData = {};
        
        for (const key of DATA_KEYS) {
            const localData = localStorage.getItem(key);
            if (localData !== null) {
                // 计算数据hash，只同步变化的数据
                const dataHash = simpleHash(localData);
                if (lastSyncHashes[key] === dataHash) {
                    // 数据没有变化，跳过同步
                    continue;
                }
                
                // 压缩款式图片
                let dataToUpload = localData;
                if (key === 'gf_cost_db') {
                    dataToUpload = compressImagesInData(localData);
                }
                
                changedData[key] = dataToUpload;
            }
        }
        
        // 批量上传变化的数据
        if (Object.keys(changedData).length > 0) {
            const success = await batchUploadData(changedData);
            if (success) {
                successCount = Object.keys(changedData).length;
                // 更新hash记录
                for (const key of Object.keys(changedData)) {
                    lastSyncHashes[key] = simpleHash(localStorage.getItem(key));
                }
                console.log(`✅ 批量上传成功: ${successCount} 项变化数据`);
            } else {
                console.error('❌ 批量上传失败');
            }
        } else {
            console.log('ℹ️ 没有变化的数据，跳过同步');
        }
        
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        isSyncing = false;
        
        if (successCount > 0) {
            showToast(`☁️ 已同步到云端 (${successCount}项)`);
        }
    }

    // ============================================
    // 从云端同步所有数据（手动/页面加载时调用）
    // 优化：只下载变化的数据，减少流量消耗
    // ============================================
    async function syncFromCloud(silent = false) {
        if (isSyncing) return;
        
        isSyncing = true;
        
        if (!silent) {
            console.log('📥 开始从云端同步...');
        }
        
        // 设置标志：正在应用云端变化，避免触发自动同步
        isApplyingCloudChange = true;
        
        let successCount = 0;
        
        try {
            // 批量下载所有数据
            const allData = await batchDownloadData();
            
            for (const [key, value] of Object.entries(allData)) {
                if (DATA_KEYS.includes(key) && value !== null) {
                    localStorage.setItem(key, value);
                    // 更新hash记录
                    lastSyncHashes[key] = simpleHash(value);
                    successCount++;
                }
            }
        } catch (error) {
            console.error('从云端同步失败:', error);
        }
        
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        
        // 清除标志
        setTimeout(() => {
            isApplyingCloudChange = false;
        }, 100);
        
        // 设置数据保护标志，3秒内不要同步回去（避免循环同步）
        justSyncedFromCloud = true;
        if (justSyncedTimer) clearTimeout(justSyncedTimer);
        justSyncedTimer = setTimeout(() => {
            justSyncedFromCloud = false;
        }, 3000);
        
        isSyncing = false;
        
        if (!silent) {
            console.log(`✅ 同步完成，成功下载 ${successCount} 项数据`);
            if (successCount > 0) {
                showToast(`📥 已从云端恢复 (${successCount}项)`);
            }
        }
        
        // 触发数据更新事件，让页面刷新
        try {
            window.dispatchEvent(new CustomEvent('cloudDataUpdated', { 
                detail: { silent: silent, source: 'cloud' }
            }));
        } catch(e) {}
        
        return true;
    }

    // ============================================
    // 自动同步（用户修改数据后同步到云端）
    // 优化：增加延迟到1秒，合并连续的修改，减少频繁同步
    // ============================================
    function scheduleAutoSync() {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncToCloud();
        }, 1000); // 1秒后自动同步（合并连续修改，减少流量）
    }

    // ============================================
    // 监听本地数据变化
    // ============================================
    function setupAutoSync() {
        // 监听其他标签页的变化
        window.addEventListener('storage', (e) => {
            if (DATA_KEYS.includes(e.key) && !isApplyingCloudChange) {
                console.log('📥 检测到其他标签页的数据变化，触发自动同步');
                scheduleAutoSync();
            }
        });
        
        // 重写setItem监听当前页面的变化
        const originalSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function(key, value) {
            originalSetItem(key, value);
            // 只要是DATA_KEYS，且不是正在应用云端变化，就触发自动同步
            if (DATA_KEYS.includes(key) && !isApplyingCloudChange && !justSyncedFromCloud) {
                console.log('📝 检测到本地数据变化，触发自动同步:', key);
                scheduleAutoSync();
            }
        };
    }

    // ============================================
    // 页面聚焦时检查云端最新数据
    // ============================================
    function initFocusSync() {
        window.addEventListener('focus', () => {
            console.log('👁️ 页面聚焦，检查云端最新数据...');
            // 页面聚焦时，从云端同步一次（静默模式）
            setTimeout(() => {
                if (!isSyncing && !isApplyingCloudChange) {
                    syncFromCloud(true);
                }
            }, 500);
        });
    }

    // ============================================
    // Toast提示
    // ============================================
    function showToast(message) {
        const existing = document.getElementById('realtimeToast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.id = 'realtimeToast';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px 20px;border-radius:10px;font-size:14px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================
    // 配置API地址（供管理后台调用）
    // ============================================
    function setApiBaseUrl(url) {
        API_BASE_URL = url;
        localStorage.setItem('cloud_api_base_url', url);
        console.log('✅ 后端API地址已更新:', url);
        
        // 重新初始化实时连接
        initRealtime();
        
        // 立即同步一次
        setTimeout(() => {
            syncFromCloud(true);
        }, 500);
    }
    
    function getApiBaseUrl() {
        return API_BASE_URL;
    }

    // ============================================
    // 初始化
    // ============================================
    function init() {
        console.log('🚀 多绮爱服饰云端实时同步模块 v7.0 启动（自建后端版本）...');
        
        // 设置自动同步监听
        setupAutoSync();
        
        // 设置页面聚焦同步
        initFocusSync();
        
        // 初始化实时同步
        initRealtime();
        
        // 页面加载时从云端同步一次
        setTimeout(() => {
            syncFromCloud(true);
        }, 500);
    }

    // ============================================
    // 暴露全局函数
    // ============================================
    window.CloudSync = {
        init: init,
        syncToCloud: syncToCloud,
        syncFromCloud: syncFromCloud,
        setApiBaseUrl: setApiBaseUrl,
        getApiBaseUrl: getApiBaseUrl,
        getRealtimeStatus: () => sseConnected ? '已连接' : '未连接',
        version: CLOUD_SYNC_VERSION,
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
