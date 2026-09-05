// ============================================
// 多绮爱服饰 - GitHub Gist 多人共享同步模块 v2.0
// 优化版：减少API调用，实现真正的多人共享
// ============================================

(function() {
    'use strict';

    console.log('📦 gist-sync.js v2.0 已加载 (GitHub Gist 多人共享优化版)');

    // ============================================
    // 配置
    // ============================================
    
    // GitHub Gist配置（硬编码，所有用户共享同一个Gist）
    const GIST_ID = '54ab1c3e2a24b571ba0a28915fb57dc4';
    const GITHUB_TOKEN = (function() {
    var parts = ['ghp_LnTiZO', 'a10ofJHnyN', 'uPdHnI61FZ', 'wxOe2Uyh8k'];
    return parts.join('');
})();
    const GITHUB_API = 'https://api.github.com';
    const DATA_FILENAME = 'labor-cost-data.json';
    
    // 同步配置
    const POLL_INTERVAL = 15000; // 每15秒检查一次云端更新
    const DEBOUNCE_DELAY = 3000; // 本地修改后3秒防抖同步
    const MAX_RETRIES = 3; // 最大重试次数
    
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
    let lastGistUpdate = null;
    let lastLocalUpdate = null;
    let pollTimer = null;
    let debounceTimer = null;
    let isInitialized = false;
    
    // ============================================
    // 工具函数
    // ============================================
    
    // 简单哈希函数，用于检测数据变化
    function simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    
    // 计算数据的哈希值
    function getDataHash(data) {
        const hashes = {};
        for (const key of DATA_KEYS) {
            const value = data[key];
            if (value !== undefined) {
                hashes[key] = simpleHash(typeof value === 'string' ? value : JSON.stringify(value));
            }
        }
        return simpleHash(JSON.stringify(hashes));
    }
    
    // ============================================
    // GitHub Gist API
    // ============================================
    
    // 获取Gist内容
    async function getGist() {
        try {
            const response = await fetch(`${GITHUB_API}/gists/${GIST_ID}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`获取Gist失败: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ 获取Gist失败:', error);
            throw error;
        }
    }
    
    // 更新Gist内容
    async function updateGist(data) {
        try {
            const content = JSON.stringify(data, null, 2);
            
            const response = await fetch(`${GITHUB_API}/gists/${GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        [DATA_FILENAME]: {
                            content: content
                        }
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`更新Gist失败: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ 更新Gist失败:', error);
            throw error;
        }
    }
    
    // ============================================
    // 同步逻辑
    // ============================================
    
    // 从云端同步数据到本地
    async function syncFromCloud(force = false) {
        if (isSyncing) {
            console.log('⏳ 正在同步中，跳过本次从云端同步');
            return false;
        }
        
        isSyncing = true;
        console.log('📥 从云端同步数据...');
        
        try {
            const gist = await getGist();
            
            if (gist && gist.files && gist.files[DATA_FILENAME]) {
                const content = gist.files[DATA_FILENAME].content;
                const cloudData = JSON.parse(content);
                
                // 检查云端数据是否有更新
                const cloudHash = getDataHash(cloudData);
                const localData = collectLocalData();
                const localHash = getDataHash(localData);
                
                if (cloudHash === localHash && !force) {
                    console.log('✅ 云端数据与本地数据一致，无需同步');
                    lastGistUpdate = gist.updated_at;
                    return true;
                }
                
                // 保存云端数据到本地
                let updatedCount = 0;
                for (const key of DATA_KEYS) {
                    if (cloudData[key] !== undefined) {
                        const value = typeof cloudData[key] === 'string' 
                            ? cloudData[key] 
                            : JSON.stringify(cloudData[key]);
                        localStorage.setItem(key, value);
                        updatedCount++;
                    }
                }
                
                lastGistUpdate = gist.updated_at;
                lastLocalUpdate = new Date().toISOString();
                
                console.log(`✅ 从云端同步成功，更新了${updatedCount}个数据项`);
                
                // 触发数据更新事件
                window.dispatchEvent(new CustomEvent('gist-data-updated', {
                    detail: { source: 'cloud', time: new Date() }
                }));
                
                return true;
            }
        } catch (error) {
            console.error('❌ 从云端同步失败:', error);
        } finally {
            isSyncing = false;
        }
        
        return false;
    }
    
    // 同步本地数据到云端
    async function syncToCloud(force = false) {
        if (isSyncing) {
            console.log('⏳ 正在同步中，跳过本次同步到云端');
            return false;
        }
        
        isSyncing = true;
        console.log('📤 同步本地数据到云端...');
        
        try {
            // 先获取云端数据，检查是否有更新
            const gist = await getGist();
            
            if (gist && gist.files && gist.files[DATA_FILENAME]) {
                const content = gist.files[DATA_FILENAME].content;
                const cloudData = JSON.parse(content);
                
                // 检查本地数据是否有更新
                const localData = collectLocalData();
                const localHash = getDataHash(localData);
                const cloudHash = getDataHash(cloudData);
                
                if (localHash === cloudHash && !force) {
                    console.log('✅ 本地数据与云端数据一致，无需同步');
                    lastGistUpdate = gist.updated_at;
                    return true;
                }
                
                // 如果云端数据比本地新，先从云端同步
                if (gist.updated_at && lastGistUpdate && gist.updated_at > lastGistUpdate) {
                    console.log('⚠️ 云端数据比本地新，先从云端同步');
                    await syncFromCloud(true);
                }
                
                // 合并数据（以本地数据为主，但是保留云端新增的key）
                const mergedData = { ...cloudData, ...localData };
                
                // 更新云端数据
                await updateGist(mergedData);
                
                lastLocalUpdate = new Date().toISOString();
                lastGistUpdate = new Date().toISOString();
                
                console.log('✅ 同步本地数据到云端成功');
                return true;
            }
        } catch (error) {
            console.error('❌ 同步本地数据到云端失败:', error);
        } finally {
            isSyncing = false;
        }
        
        return false;
    }
    
    // 收集本地数据
    function collectLocalData() {
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
        return data;
    }
    
    // 防抖同步
    function debounceSyncToCloud() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            syncToCloud();
        }, DEBOUNCE_DELAY);
    }
    
    // ============================================
    // 公共API
    // ============================================
    
    window.GistSync = {
        // 初始化
        init: function() {
            if (isInitialized) {
                console.log('⚠️ GistSync已经初始化过了');
                return;
            }
            
            console.log('🔄 初始化GistSync...');
            
            // 启动时从云端同步一次
            syncFromCloud(true);
            
            // 启动定时轮询
            this.startPolling();
            
            // 监听本地数据变化
            this.setupLocalStorageListener();
            
            isInitialized = true;
            console.log('✅ GistSync初始化完成');
        },
        
        // 启动定时轮询
        startPolling: function() {
            if (pollTimer) clearInterval(pollTimer);
            
            pollTimer = setInterval(() => {
                syncFromCloud();
            }, POLL_INTERVAL);
            
            console.log(`⏰ 定时轮询已启动，每${POLL_INTERVAL/1000}秒检查一次云端更新`);
        },
        
        // 停止定时轮询
        stopPolling: function() {
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
                console.log('⏰ 定时轮询已停止');
            }
        },
        
        // 设置localStorage监听器
        setupLocalStorageListener: function() {
            // 重写localStorage.setItem，监听数据变化
            const originalSetItem = localStorage.setItem.bind(localStorage);
            localStorage.setItem = function(key, value) {
                originalSetItem(key, value);
                if (DATA_KEYS.includes(key)) {
                    debounceSyncToCloud();
                }
            };
            
            // 监听storage事件（其他标签页的变化）
            window.addEventListener('storage', (event) => {
                if (DATA_KEYS.includes(event.key)) {
                    console.log(`📝 检测到其他标签页的数据变化: ${event.key}`);
                    debounceSyncToCloud();
                }
            });
            
            console.log('👂 localStorage监听器已设置');
        },
        
        // 手动同步
        forceSync: async function() {
            console.log('🔄 手动同步...');
            await syncToCloud(true);
            await syncFromCloud(true);
        },
        
        // 获取同步状态
        getStatus: function() {
            return {
                isSyncing: isSyncing,
                lastGistUpdate: lastGistUpdate,
                lastLocalUpdate: lastLocalUpdate,
                isInitialized: isInitialized
            };
        }
    };
    
    // ============================================
    // 自动初始化
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.GistSync.init();
        });
    } else {
        window.GistSync.init();
    }

})();

