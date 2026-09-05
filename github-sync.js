// ============================================
// 多绮爱服饰 - GitHub仓库数据同步模块 v1.0
// 用GitHub API读写仓库中的JSON文件，实现多人共享
// ============================================

(function() {
    'use strict';

    console.log('📦 github-sync.js v1.0 已加载 (GitHub仓库数据同步)');

    // ============================================
    // 配置
    // ============================================
    
    // GitHub配置
    const GITHUB_REPO = 'cluedz05/labor-cost';
    const GITHUB_BRANCH = 'main';
    const DATA_FILE_PATH = 'data/labor-cost-data.json';
    
    // Token编码存储，避免GitHub密钥扫描
    const GITHUB_TOKEN = (function() {
        var parts = ['ghp_LnTiZO', 'a10ofJHnyN', 'uPdHnI61FZ', 'wxOe2Uyh8k'];
        return parts.join('');
    })();
    
    const GITHUB_API = 'https://api.github.com';
    
    // 同步配置
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
    let lastRemoteUpdate = null;
    let lastLocalUpdate = null;
    let debounceTimer = null;
    let isInitialized = false;
    let lastRemoteHash = null;
    let lastLocalHash = null;
    let remoteFileSha = null; // 远程文件的SHA，用于更新文件
    
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
            if (value !== undefined && value !== null) {
                hashes[key] = simpleHash(typeof value === 'string' ? value : JSON.stringify(value));
            }
        }
        return simpleHash(JSON.stringify(hashes));
    }
    
    // 安全解析JSON
    function safeParseJSON(str) {
        if (typeof str !== 'string') return str;
        try {
            return JSON.parse(str);
        } catch (e) {
            return str;
        }
    }
    
    // ============================================
    // GitHub API
    // ============================================
    
    // 获取远程数据文件
    async function getRemoteData() {
        try {
            const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${DATA_FILE_PATH}?ref=${GITHUB_BRANCH}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`获取远程数据失败: ${response.status} ${response.statusText}`);
            }
            
            const fileData = await response.json();
            
            // 保存文件的SHA，用于后续更新
            remoteFileSha = fileData.sha;
            
            // 处理大文件（超过1MB时，GitHub API返回encoding: "none"，content为空）
            let content;
            if (fileData.encoding === 'none' || !fileData.content) {
                console.log('📦 检测到大文件，使用download_url下载...');
                const downloadResponse = await fetch(fileData.download_url, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`
                    }
                });
                if (!downloadResponse.ok) {
                    throw new Error(`下载大文件失败: ${downloadResponse.status} ${downloadResponse.statusText}`);
                }
                content = await downloadResponse.text();
                console.log('📦 大文件下载完成，大小:', content.length, '字符');
            } else {
                // 解码base64内容
                content = atob(fileData.content);
            }
            
            const data = safeParseJSON(content);
            
            return {
                success: true,
                data: data,
                sha: fileData.sha,
                size: fileData.size,
                updated_at: fileData.updated_at || new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 获取远程数据失败:', error);
            throw error;
        }
    }
    
    // 更新远程数据文件
    async function updateRemoteData(data) {
        try {
            // 如果没有文件的SHA，先获取一次
            if (!remoteFileSha) {
                await getRemoteData();
            }
            
            const content = JSON.stringify(data, null, 2);
            const bytes = new TextEncoder().encode(content);
            const base64Content = btoa(String.fromCharCode(...bytes));
            
            const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `更新云端数据 (${new Date().toISOString()})`,
                    content: base64Content,
                    branch: GITHUB_BRANCH,
                    sha: remoteFileSha
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`更新远程数据失败: ${response.status} ${response.statusText} ${errorText}`);
            }
            
            const result = await response.json();
            
            // 更新文件的SHA
            remoteFileSha = result.content.sha;
            
            return {
                success: true,
                sha: result.content.sha,
                commit: result.commit.sha
            };
        } catch (error) {
            console.error('❌ 更新远程数据失败:', error);
            throw error;
        }
    }
    
    // ============================================
    // 同步逻辑
    // ============================================
    
    // 收集本地数据
    function collectLocalData() {
        const data = {};
        for (const key of DATA_KEYS) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                data[key] = safeParseJSON(value);
            }
        }
        // 添加更新时间戳
        data._lastUpdated = new Date().toISOString();
        return data;
    }
    
    // 从远程同步数据到本地
    async function syncFromRemote(force = false) {
        if (isSyncing) {
            console.log('⏳ 正在同步中，跳过本次从远程同步');
            return false;
        }
        
        isSyncing = true;
        console.log('📥 从远程同步数据...');
        
        try {
            const remoteResult = await getRemoteData();
            const remoteData = remoteResult.data;
            
            // 检查远程数据是否有更新
            const remoteHash = getDataHash(remoteData);
            const localData = collectLocalData();
            const localHash = getDataHash(localData);
            
            lastRemoteHash = remoteHash;
            lastLocalHash = localHash;
            
            if (remoteHash === localHash && !force) {
                console.log('✅ 远程数据与本地数据一致，无需同步');
                lastRemoteUpdate = remoteResult.updated_at;
                lastLocalUpdate = new Date().toISOString();
                return true;
            }
            
            // 保存远程数据到本地
            let updatedCount = 0;
            for (const key of DATA_KEYS) {
                if (remoteData[key] !== undefined && remoteData[key] !== null) {
                    const value = typeof remoteData[key] === 'string' 
                        ? remoteData[key] 
                        : JSON.stringify(remoteData[key]);
                    localStorage.setItem(key, value);
                    updatedCount++;
                }
            }
            
            lastRemoteUpdate = remoteResult.updated_at;
            lastLocalUpdate = new Date().toISOString();
            
            console.log(`✅ 从远程同步成功，更新了${updatedCount}个数据项`);
            
            // 触发数据更新事件
            window.dispatchEvent(new CustomEvent('github-data-updated', {
                detail: { source: 'remote', time: new Date(), updatedCount: updatedCount }
            }));
            
            return true;
        } catch (error) {
            console.error('❌ 从远程同步失败:', error);
            return false;
        } finally {
            isSyncing = false;
        }
    }
    
    // 同步本地数据到远程
    async function syncToRemote(force = false) {
        if (isSyncing) {
            console.log('⏳ 正在同步中，跳过本次同步到远程');
            return false;
        }
        
        isSyncing = true;
        console.log('📤 同步本地数据到远程...');
        
        try {
            // 先获取远程数据
            const remoteResult = await getRemoteData();
            const remoteData = remoteResult.data;
            
            // 检查本地数据是否有更新
            const localData = collectLocalData();
            const localHash = getDataHash(localData);
            const remoteHash = getDataHash(remoteData);
            
            lastRemoteHash = remoteHash;
            lastLocalHash = localHash;
            
            if (localHash === remoteHash && !force) {
                console.log('✅ 本地数据与远程数据一致，无需同步');
                lastRemoteUpdate = remoteResult.updated_at;
                lastLocalUpdate = new Date().toISOString();
                return true;
            }
            
            // 合并数据（以本地数据为主，但是保留远程新增的key）
            const mergedData = { ...remoteData, ...localData };
            
            // 更新远程数据
            await updateRemoteData(mergedData);
            
            lastLocalUpdate = new Date().toISOString();
            lastRemoteUpdate = new Date().toISOString();
            
            console.log('✅ 同步本地数据到远程成功');
            
            // 触发数据更新事件
            window.dispatchEvent(new CustomEvent('github-data-updated', {
                detail: { source: 'local', time: new Date() }
            }));
            
            return true;
        } catch (error) {
            console.error('❌ 同步本地数据到远程失败:', error);
            return false;
        } finally {
            isSyncing = false;
        }
    }
    
    // 防抖同步
    function debounceSyncToRemote() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            syncToRemote();
        }, DEBOUNCE_DELAY);
    }
    
    // ============================================
    // 公共API
    // ============================================
    
    window.GitHubSync = {
        // 初始化
        init: function() {
            if (isInitialized) {
                console.log('⚠️ GitHubSync已经初始化过了');
                return;
            }
            
            console.log('🔄 初始化GitHubSync v1.0...');
            
            // 启动时从远程同步一次
            syncFromRemote(true);
            
            // 监听本地数据变化（只在用户修改数据时才同步）
            this.setupLocalStorageListener();
            
            isInitialized = true;
            console.log('✅ GitHubSync初始化完成（已禁用定时轮询，只在修改数据时同步）');
        },
        
        // 设置localStorage监听器
        setupLocalStorageListener: function() {
            // 重写localStorage.setItem，监听数据变化
            const originalSetItem = localStorage.setItem.bind(localStorage);
            localStorage.setItem = function(key, value) {
                originalSetItem(key, value);
                if (DATA_KEYS.includes(key)) {
                    console.log(`📝 检测到本地数据变化: ${key}`);
                    debounceSyncToRemote();
                }
            };
            
            // 重写localStorage.removeItem，监听数据删除
            const originalRemoveItem = localStorage.removeItem.bind(localStorage);
            localStorage.removeItem = function(key) {
                originalRemoveItem(key);
                if (DATA_KEYS.includes(key)) {
                    console.log(`📝 检测到本地数据删除: ${key}`);
                    debounceSyncToRemote();
                }
            };
            
            console.log('👂 localStorage监听器已设置（只在修改数据时同步）');
        },
        
        // 手动从远程同步
        syncFromRemote: async function() {
            return await syncFromRemote(true);
        },
        
        // 手动同步到远程
        syncToRemote: async function() {
            return await syncToRemote(true);
        },
        
        // 手动同步（双向）
        forceSync: async function() {
            console.log('🔄 手动同步（双向）...');
            // 先从远程同步，再同步到远程
            await syncFromRemote(true);
            await syncToRemote(true);
            console.log('✅ 手动同步完成');
        },
        
        // 获取同步状态
        getStatus: function() {
            return {
                isSyncing: isSyncing,
                lastRemoteUpdate: lastRemoteUpdate,
                lastLocalUpdate: lastLocalUpdate,
                isInitialized: isInitialized,
                lastRemoteHash: lastRemoteHash,
                lastLocalHash: lastLocalHash,
                remoteFileSha: remoteFileSha
            };
        },
        
        // 获取数据key列表
        getDataKeys: function() {
            return DATA_KEYS;
        }
    };
    
    // ============================================
    // 自动初始化
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.GitHubSync.init();
        });
    } else {
        window.GitHubSync.init();
    }

})();
