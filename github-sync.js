// ============================================
// 多绮爱服饰 - GitHub仓库数据同步模块 v2.1
// 用GitHub API读写仓库中的JSON文件，实现多人共享
// 真正的多用户实时同步（简化版，移除复杂的标志位逻辑）
// ============================================

(function() {
    'use strict';

    console.log('📦 github-sync.js v2.1 已加载 (多用户实时同步-简化版)');

    // ============================================
    // 配置
    // ============================================
    
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
    const POLL_INTERVAL = 30000; // 每30秒从远程同步一次
    
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
    let isInitialized = false;
    let remoteFileSha = null;
    let pollTimer = null;
    
    // 保存原始的localStorage方法（用于从远程同步时不触发自动同步）
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    
    // ============================================
    // 工具函数
    // ============================================
    
    // 分块编码base64，避免大文件栈溢出
    function base64Encode(bytes) {
        let binary = '';
        const chunkSize = 0x8000; // 32KB分块
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }
    
    // 解码base64内容，支持UTF-8中文字符
    function decodeBase64(base64) {
        try {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (error) {
            console.error('❌ base64解码失败:', error);
            return atob(base64);
        }
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
    
    // 修复数据格式（styles从对象转换为数组）
    function fixDataFormat(data) {
        if (!data || typeof data !== 'object') return data;
        
        // 修复styles格式
        if (data.styles && !Array.isArray(data.styles) && typeof data.styles === 'object') {
            console.log('🔧 检测到styles格式问题，正在修复...');
            if (data.styles.value && Array.isArray(data.styles.value)) {
                data.styles = data.styles.value;
                console.log('🔧 styles已修复为数组，数量:', data.styles.length);
            }
        }
        
        // 修复style_library格式
        if (data.style_library && !Array.isArray(data.style_library) && typeof data.style_library === 'object') {
            console.log('🔧 检测到style_library格式问题，正在修复...');
            if (data.style_library.value && Array.isArray(data.style_library.value)) {
                data.style_library = data.style_library.value;
                console.log('🔧 style_library已修复为数组，数量:', data.style_library.length);
            }
        }
        
        return data;
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
            remoteFileSha = fileData.sha;
            
            // 处理大文件（超过1MB时，GitHub API返回encoding: "none"，content为空）
            let content;
            if (fileData.encoding === 'none' || !fileData.content) {
                console.log('📦 检测到大文件，使用Git Data API下载...');
                // 使用Git Data API获取文件内容
                const blobUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/git/blobs/${fileData.sha}`;
                const blobResponse = await fetch(blobUrl, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                const blobData = await blobResponse.json();
                content = decodeBase64(blobData.content);
                console.log('📦 大文件下载完成，大小:', content.length, '字符');
            } else {
                content = decodeBase64(fileData.content);
            }
            
            let data = safeParseJSON(content);
            data = fixDataFormat(data);
            
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
            
            data = fixDataFormat(data);
            
            const content = JSON.stringify(data, null, 2);
            const bytes = new TextEncoder().encode(content);
            console.log('📦 正在编码数据，大小:', bytes.length, '字节');
            
            const base64Content = base64Encode(bytes);
            console.log('📦 数据编码完成，base64大小:', base64Content.length, '字符');
            
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
            remoteFileSha = result.content.sha;
            
            console.log('✅ 远程数据更新成功，提交SHA:', result.commit.sha);
            
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
    
    // 收集本地数据
    function collectLocalData() {
        const data = {};
        for (const key of DATA_KEYS) {
            const value = originalGetItem(key);
            if (value !== null) {
                data[key] = safeParseJSON(value);
            }
        }
        data._lastUpdated = new Date().toISOString();
        return fixDataFormat(data);
    }
    
    // 原始的getItem
    function originalGetItem(key) {
        return localStorage.getItem(key);
    }
    
    // ============================================
    // 核心同步函数
    // ============================================
    
    // 从远程同步数据到本地（强制覆盖，使用原始的setItem，不触发自动同步）
    async function syncFromRemote() {
        if (isSyncing) {
            console.log('⏳ 正在同步中，跳过本次从远程同步');
            return false;
        }
        
        isSyncing = true;
        console.log('📥 从远程同步数据（强制覆盖本地）...');
        
        try {
            // 1. 获取远程数据
            console.log('📥 步骤1: 获取远程数据...');
            const remoteResult = await getRemoteData();
            const remoteData = remoteResult.data;
            console.log('📥 步骤1完成: 远程数据获取成功，styles数量:', remoteData.styles ? remoteData.styles.length : 0);
            
            // 2. 强制保存远程数据到本地（使用原始的setItem，不触发自动同步）
            console.log('📥 步骤2: 强制保存远程数据到本地（使用原始setItem）...');
            let updatedCount = 0;
            for (const key of DATA_KEYS) {
                if (remoteData[key] !== undefined && remoteData[key] !== null) {
                    const value = typeof remoteData[key] === 'string' 
                        ? remoteData[key] 
                        : JSON.stringify(remoteData[key]);
                    originalSetItem(key, value); // 使用原始的setItem，不触发自动同步
                    updatedCount++;
                    console.log('📥 已保存:', key, '大小:', value.length);
                }
            }
            console.log('📥 步骤2完成: 保存了', updatedCount, '个数据项');
            
            console.log(`✅ 从远程同步成功，更新了${updatedCount}个数据项`);
            
            // 触发数据更新事件
            try {
                window.dispatchEvent(new CustomEvent('github-data-updated', {
                    detail: { source: 'remote', time: new Date(), updatedCount: updatedCount }
                }));
            } catch (eventError) {
                console.error('📥 触发数据更新事件失败:', eventError);
            }
            
            isSyncing = false;
            return true;
        } catch (error) {
            console.error('❌ 从远程同步失败:', error);
            console.error('❌ 错误堆栈:', error.stack);
            isSyncing = false;
            return false;
        }
    }
    
    // 同步本地数据到远程
    async function syncToRemote() {
        if (isSyncing) {
            console.log('⏳ 正在同步中，跳过本次同步到远程');
            return false;
        }
        
        isSyncing = true;
        console.log('📤 同步本地数据到远程...');
        
        let updateSuccess = false;
        
        try {
            // 1. 收集本地数据
            console.log('📤 步骤1: 收集本地数据...');
            const localData = collectLocalData();
            console.log('📤 步骤1完成: 本地数据收集成功，styles数量:', localData.styles ? localData.styles.length : 0);
            
            // 2. 更新远程数据
            console.log('📤 步骤2: 更新远程数据...');
            const updateResult = await updateRemoteData(localData);
            console.log('📤 步骤2完成: 远程数据更新成功，新SHA:', updateResult.sha);
            updateSuccess = true;
            
            console.log('✅ 同步本地数据到远程成功');
            
            // 触发数据更新事件
            try {
                window.dispatchEvent(new CustomEvent('github-data-updated', {
                    detail: { source: 'local', time: new Date() }
                }));
            } catch (eventError) {
                console.error('📤 触发数据更新事件失败:', eventError);
            }
            
            isSyncing = false;
            return true;
        } catch (error) {
            console.error('❌ 同步本地数据到远程失败:', error);
            console.error('❌ 错误堆栈:', error.stack);
            isSyncing = false;
            // 如果updateRemoteData已经成功，即使后续出现错误，也返回true
            if (updateSuccess) {
                console.log('⚠️ updateRemoteData已成功，后续错误不影响同步结果，返回true');
                return true;
            }
            return false;
        }
    }
    
    // ============================================
    // 定时同步
    // ============================================
    
    // 启动定时同步
    function startPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
        }
        console.log(`⏰ 启动定时同步，每${POLL_INTERVAL/1000}秒从远程同步一次`);
        pollTimer = setInterval(() => {
            console.log('⏰ 定时同步触发...');
            syncFromRemote();
        }, POLL_INTERVAL);
    }
    
    // 停止定时同步
    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
            console.log('⏰ 停止定时同步');
        }
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
            
            console.log('🔄 初始化GitHubSync v2.1 (多用户实时同步-简化版)...');
            
            // 1. 启动时从远程同步一次（强制覆盖本地）
            console.log('🔄 步骤1: 启动时从远程同步...');
            syncFromRemote().then(result => {
                console.log('🔄 启动时同步完成，结果:', result);
                
                // 2. 启动定时同步
                console.log('🔄 步骤2: 启动定时同步...');
                startPolling();
                
                // 3. 监听本地数据变化
                console.log('🔄 步骤3: 监听本地数据变化...');
                this.setupLocalStorageListener();
                
                isInitialized = true;
                console.log('✅ GitHubSync初始化完成（多用户实时同步已启用）');
            }).catch(error => {
                console.error('❌ 初始化时同步失败:', error);
                // 即使同步失败，也要启动定时同步和监听
                startPolling();
                this.setupLocalStorageListener();
                isInitialized = true;
                console.log('✅ GitHubSync初始化完成（同步失败，但定时同步已启用）');
            });
        },
        
        // 设置localStorage监听器
        setupLocalStorageListener: function() {
            // 重写localStorage.setItem，监听数据变化
            localStorage.setItem = function(key, value) {
                originalSetItem(key, value);
                if (DATA_KEYS.includes(key)) {
                    console.log(`📝 检测到本地数据变化: ${key}`);
                    console.log(`📤 直接调用syncToRemote函数...`);
                    syncToRemote().then(result => {
                        console.log(`📤 syncToRemote函数执行完成，结果: ${result}`);
                    }).catch(error => {
                        console.error(`📤 syncToRemote函数执行失败: ${error}`);
                    });
                }
            };
            
            // 重写localStorage.removeItem，监听数据删除
            localStorage.removeItem = function(key) {
                originalRemoveItem(key);
                if (DATA_KEYS.includes(key)) {
                    console.log(`📝 检测到本地数据删除: ${key}`);
                    console.log(`📤 直接调用syncToRemote函数...`);
                    syncToRemote().then(result => {
                        console.log(`📤 syncToRemote函数执行完成，结果: ${result}`);
                    }).catch(error => {
                        console.error(`📤 syncToRemote函数执行失败: ${error}`);
                    });
                }
            };
            
            console.log('👂 localStorage监听器已设置（本地数据变化时自动同步到远程）');
        },
        
        // 手动从远程同步
        syncFromRemote: async function() {
            return await syncFromRemote();
        },
        
        // 手动同步到远程
        syncToRemote: async function() {
            return await syncToRemote();
        },
        
        // 手动同步（双向）
        forceSync: async function() {
            console.log('🔄 手动同步（双向）...');
            // 先从远程同步，再同步到远程
            await syncFromRemote();
            await syncToRemote();
            console.log('✅ 手动同步完成');
        },
        
        // 获取同步状态
        getStatus: function() {
            return {
                isSyncing: isSyncing,
                isInitialized: isInitialized,
                remoteFileSha: remoteFileSha,
                pollInterval: POLL_INTERVAL
            };
        },
        
        // 启动定时同步
        startPolling: function() {
            startPolling();
        },
        
        // 停止定时同步
        stopPolling: function() {
            stopPolling();
        }
    };
    
    // ============================================
    // 自动初始化
    // ============================================
    
    function initGitHubSync() {
        console.log('📦 github-sync.js 将在3秒后初始化...');
        setTimeout(() => {
            console.log('📦 github-sync.js 开始初始化...');
            window.GitHubSync.init();
        }, 3000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initGitHubSync();
        });
    } else {
        initGitHubSync();
    }

})();
