// ============================================
// 多绮爱服饰 - 云端实时同步模块 v7.1
// GitHub Gist版本：用GitHub Gist存储数据
// 不需要Vercel/Upstash，直接用GitHub账号
// ============================================

(function() {
    'use strict';

    // 版本号
    const CLOUD_SYNC_VERSION = 'v7.1.3';
    console.log('📦 cloud-sync.js 版本:', CLOUD_SYNC_VERSION, '(GitHub Gist版本 - 大数据优化版)');

    // ============================================
    // 配置
    // ============================================
    
    // GitHub Gist ID（需要用户创建一个Gist来存储数据）
    // 可以在管理后台配置，也可以直接修改这里
    let GIST_ID = localStorage.getItem('cloud_gist_id') || '';
    
    // GitHub Personal Access Token（需要用户创建，有gist权限）
    // 注意：这个token只存在浏览器本地，不会上传到任何地方
    let GITHUB_TOKEN = localStorage.getItem('cloud_github_token') || '';
    
    // GitHub API基础地址
    const GITHUB_API = 'https://api.github.com';
    
    // 数据文件名（存储在Gist中的文件名）
    const DATA_FILENAME = 'labor-cost-data.json';
    
    // 数据key列表（只同步核心数据，排除大字段避免超过Gist 1MB限制）
    const DATA_KEYS = [
        'gf_cost_db',           // 主要数据（款式、工序、回收站）- 约100KB
        'gf_cost_config',       // 配置 - 约0.2KB
        'gf_cost_users',        // 用户 - 约0.1KB
        'gf_cost_export_logs',  // 导出记录 - 约0.0KB
        'styles',               // 旧版本款式数据（兼容）- 约69KB
        'app_current_user',     // 当前用户 - 约0.1KB
    ];
    
    // 大字段key（不同步到云端，只存在本地，避免超过Gist 1MB限制）
    const LARGE_DATA_KEYS = [
        'style_library',        // 款式库 - 约800KB（太大，不同步）
        'app_users',            // 应用用户 - 约300KB（太大，不同步）
        'backups',              // 备份数据
        'app_auto_backups',     // 自动备份
        'gf_cost_backups',      // 备份
    ];
    
    const LAST_SYNC_KEY = 'cloud_sync_last_sync';
    const LAST_GIST_UPDATE_KEY = 'cloud_sync_last_gist_update';
    
    // ============================================
    // 状态变量
    // ============================================
    let syncTimer = null;
    let isSyncing = false;
    let justSyncedFromCloud = false;
    let justSyncedTimer = null;
    let isApplyingCloudChange = false; // 标志：正在应用云端变化，避免触发自动同步
    
    // 优化：减少频繁同步 - 同步间隔限制
    let lastSyncTime = 0;
    const MIN_SYNC_INTERVAL = 5000; // 最少5秒才能同步一次（GitHub API速率限制）
    
    // 记录上次同步的数据hash，只同步变化的数据
    let lastSyncHashes = {};
    
    // 轮询定时器
    let pollingTimer = null;
    
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
                }
            }
            
            return JSON.stringify(data);
        } catch(e) {
            return dataStr;
        }
    }

    // ============================================
    // GitHub Gist API函数
    // ============================================
    
    // 检查是否已配置Gist和Token
    function isConfigured() {
        return GIST_ID && GITHUB_TOKEN;
    }
    
    // 获取Gist内容
    async function getGist() {
        if (!isConfigured()) {
            console.warn('⚠️ 未配置Gist ID或GitHub Token');
            return null;
        }
        
        try {
            const response = await fetch(`${GITHUB_API}/gists/${GIST_ID}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`获取Gist失败: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取Gist错误:', error);
            return null;
        }
    }
    
    // 更新Gist内容
    async function updateGist(files) {
        if (!isConfigured()) {
            console.warn('⚠️ 未配置Gist ID或GitHub Token');
            return false;
        }
        
        try {
            const response = await fetch(`${GITHUB_API}/gists/${GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    files: files,
                }),
            });
            
            if (!response.ok) {
                throw new Error(`更新Gist失败: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('更新Gist错误:', error);
            return null;
        }
    }
    
    // 创建新Gist
    async function createGist(description, files) {
        if (!GITHUB_TOKEN) {
            console.warn('⚠️ 未配置GitHub Token');
            return null;
        }
        
        try {
            const response = await fetch(`${GITHUB_API}/gists`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: description,
                    public: false, // 私有Gist
                    files: files,
                }),
            });
            
            if (!response.ok) {
                throw new Error(`创建Gist失败: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('创建Gist错误:', error);
            return null;
        }
    }

    // ============================================
    // 数据同步函数
    // ============================================
    
    // 同步到云端（用户修改数据后自动调用）
    // force: 是否强制同步（不检查hash变化）
    async function syncToCloud(force = false) {
        if (isSyncing) {
            console.log('⏳ 正在同步中，跳过本次同步');
            return;
        }
        if (!isConfigured()) {
            console.warn('⚠️ 未配置Gist，跳过同步');
            return;
        }
        
        // 同步间隔限制，最少5秒才能同步一次（GitHub API速率限制）
        const now = Date.now();
        if (!force && now - lastSyncTime < MIN_SYNC_INTERVAL) {
            console.log(`⏳ 同步间隔限制，等待${Math.ceil((MIN_SYNC_INTERVAL - (now - lastSyncTime)) / 1000)}秒后再同步`);
            if (syncTimer) clearTimeout(syncTimer);
            syncTimer = setTimeout(() => {
                syncToCloud(force);
            }, MIN_SYNC_INTERVAL - (now - lastSyncTime));
            return;
        }
        
        isSyncing = true;
        lastSyncTime = now;
        console.log('☁️ 开始同步到GitHub Gist...', force ? '(强制同步)' : '(正常同步)');
        
        let successCount = 0;
        const changedData = {};
        
        try {
            for (const key of DATA_KEYS) {
                const localData = localStorage.getItem(key);
                if (localData !== null) {
                    // 如果不是强制同步，计算数据hash，只同步变化的数据
                    if (!force) {
                        const dataHash = simpleHash(localData);
                        if (lastSyncHashes[key] === dataHash) {
                            // 数据没有变化，跳过同步
                            continue;
                        }
                    }
                    
                    // 压缩款式图片
                    let dataToUpload = localData;
                    if (key === 'gf_cost_db') {
                        dataToUpload = compressImagesInData(localData);
                    }
                    
                    changedData[key] = dataToUpload;
                }
            }
            
            console.log(`📊 需要同步的数据项: ${Object.keys(changedData).length}`);
            
            // 如果有变化的数据，更新Gist
            if (Object.keys(changedData).length > 0) {
                // 构建完整的数据对象
                const allData = {};
                for (const key of DATA_KEYS) {
                    const localData = localStorage.getItem(key);
                    if (localData !== null) {
                        allData[key] = localData;
                    }
                }
                
                console.log(`📦 数据总大小: ${JSON.stringify(allData).length} 字节`);
                
                // 更新Gist
                const files = {};
                files[DATA_FILENAME] = {
                    content: JSON.stringify(allData, null, 2),
                };
                
                const result = await updateGist(files);
                if (result) {
                    successCount = Object.keys(changedData).length;
                    // 更新hash记录
                    for (const key of Object.keys(changedData)) {
                        lastSyncHashes[key] = simpleHash(localStorage.getItem(key));
                    }
                    // 记录Gist更新时间
                    if (result.updated_at) {
                        localStorage.setItem(LAST_GIST_UPDATE_KEY, result.updated_at);
                    }
                    console.log(`✅ 同步到GitHub Gist成功: ${successCount} 项变化数据`);
                } else {
                    console.error('❌ 同步到GitHub Gist失败: updateGist返回null');
                }
            } else {
                console.log('ℹ️ 没有变化的数据，跳过同步');
            }
        } catch (error) {
            console.error('❌ 同步过程中发生错误:', error);
        } finally {
            localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
            isSyncing = false;
            console.log('🔄 同步完成，isSyncing已清除');
        }
        
        if (successCount > 0) {
            showToast(`☁️ 已同步到云端 (${successCount}项)`);
        }
    }

    // 从云端同步所有数据
    async function syncFromCloud(silent = false) {
        if (isSyncing) return;
        if (!isConfigured()) {
            console.warn('⚠️ 未配置Gist，跳过同步');
            return;
        }
        
        isSyncing = true;
        
        if (!silent) {
            console.log('📥 开始从GitHub Gist同步...');
        }
        
        // 设置标志：正在应用云端变化，避免触发自动同步
        isApplyingCloudChange = true;
        
        let successCount = 0;
        
        try {
            // 获取Gist内容
            const gist = await getGist();
            
            if (gist && gist.files && gist.files[DATA_FILENAME]) {
                const content = gist.files[DATA_FILENAME].content;
                const allData = JSON.parse(content);
                
                for (const [key, value] of Object.entries(allData)) {
                    if (DATA_KEYS.includes(key) && value !== null && value !== undefined) {
                        localStorage.setItem(key, value);
                        // 更新hash记录
                        lastSyncHashes[key] = simpleHash(value);
                        successCount++;
                    }
                }
                
                // 记录Gist更新时间
                if (gist.updated_at) {
                    localStorage.setItem(LAST_GIST_UPDATE_KEY, gist.updated_at);
                }
            }
        } catch (error) {
            console.error('从GitHub Gist同步失败:', error);
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
    // ============================================
    function scheduleAutoSync() {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncToCloud();
        }, 2000); // 2秒后自动同步（合并连续修改，减少API调用）
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
    // 轮询同步（每10秒检查一次云端更新）
    // ============================================
    function startPolling() {
        if (pollingTimer) clearInterval(pollingTimer);
        console.log('🔄 启动云端轮询（每10秒检查一次）...');
        pollingTimer = setInterval(() => {
            if (!isSyncing && !isApplyingCloudChange && isConfigured()) {
                console.log('🔄 轮询：检查云端最新数据...');
                syncFromCloud(true);
            }
        }, 10000); // 每10秒检查一次
    }

    // ============================================
    // 页面聚焦时检查云端最新数据
    // ============================================
    function initFocusSync() {
        window.addEventListener('focus', () => {
            console.log('👁️ 页面聚焦，检查云端最新数据...');
            // 页面聚焦时，从云端同步一次（静默模式）
            setTimeout(() => {
                if (!isSyncing && !isApplyingCloudChange && isConfigured()) {
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
    // 配置函数（供管理后台调用）
    // ============================================
    
    // 设置Gist ID和GitHub Token
    function setConfig(gistId, githubToken) {
        GIST_ID = gistId;
        GITHUB_TOKEN = githubToken;
        localStorage.setItem('cloud_gist_id', gistId);
        localStorage.setItem('cloud_github_token', githubToken);
        console.log('✅ 云端同步配置已更新');
        
        // 立即同步一次
        setTimeout(() => {
            syncFromCloud(true);
        }, 500);
    }
    
    // 获取配置
    function getConfig() {
        return {
            gistId: GIST_ID,
            githubToken: GITHUB_TOKEN ? '***' + GITHUB_TOKEN.slice(-4) : '',
            configured: isConfigured(),
        };
    }
    
    // 自动创建Gist（如果还没有）
    async function autoCreateGist() {
        if (!GITHUB_TOKEN) {
            console.warn('⚠️ 未配置GitHub Token，无法自动创建Gist');
            return null;
        }
        
        // 收集本地数据
        const allData = {};
        for (const key of DATA_KEYS) {
            const localData = localStorage.getItem(key);
            if (localData !== null) {
                allData[key] = localData;
            }
        }
        
        // 创建Gist
        const files = {};
        files[DATA_FILENAME] = {
            content: JSON.stringify(allData, null, 2),
        };
        
        const gist = await createGist('多绮爱服饰工序成本工具 - 云端数据存储', files);
        
        if (gist && gist.id) {
            GIST_ID = gist.id;
            localStorage.setItem('cloud_gist_id', gist.id);
            console.log('✅ 自动创建Gist成功:', gist.id);
            return gist;
        }
        
        return null;
    }

    // ============================================
    // 初始化
    // ============================================
    function init() {
        console.log('🚀 多绮爱服饰云端实时同步模块 v7.1 启动（GitHub Gist版本）...');
        
        // 检查是否已配置
        if (isConfigured()) {
            console.log('✅ 云端同步已配置，Gist ID:', GIST_ID);
            
            // 设置自动同步监听
            setupAutoSync();
            
            // 设置页面聚焦同步
            initFocusSync();
            
            // 启动轮询
            startPolling();
            
            // 页面加载时从云端同步一次
            setTimeout(() => {
                syncFromCloud(true);
            }, 500);
        } else {
            console.warn('⚠️ 云端同步未配置，请在管理后台配置Gist ID和GitHub Token');
            showToast('⚠️ 请配置云端同步（Gist ID + GitHub Token）');
        }
    }

    // ============================================
    // 暴露全局函数
    // ============================================
    window.CloudSync = {
        init: init,
        syncToCloud: syncToCloud,
        syncFromCloud: syncFromCloud,
        setConfig: setConfig,
        getConfig: getConfig,
        autoCreateGist: autoCreateGist,
        isConfigured: isConfigured,
        version: CLOUD_SYNC_VERSION,
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
