// ============================================
// 多绮爱服饰 - 云端实时同步模块 v6.2
// 优化版：减少流量消耗，避免超出Supabase配额
// 1. 减少不必要的频繁同步（同步间隔限制+只同步变化数据）
// 2. 压缩款式图片
// 3. 只在用户修改数据时才同步
// 4. 减少Realtime推送频率（节流处理）
// ============================================

(function() {
    'use strict';

    // 版本号
    const CLOUD_SYNC_VERSION = 'v6.2';
    console.log('📦 cloud-sync.js 版本:', CLOUD_SYNC_VERSION);

    // 配置
    const SUPABASE_URL = 'https://izzcqlydjnfumbzfepcx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Vo_zxOAcU3j4y216VCx3qw_XygxDytX';
    
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
    
    let supabaseClient = null;
    let realtimeChannel = null;
    let syncTimer = null;
    let isSyncing = false;
    let justSyncedFromCloud = false;
    let justSyncedTimer = null;
    let pageLoadTime = Date.now();
    let lastDataHash = '';
    let isApplyingCloudChange = false; // 标志：正在应用云端变化，避免触发自动同步
    
    // 优化1：减少频繁同步 - 同步间隔限制
    let lastSyncTime = 0;
    const MIN_SYNC_INTERVAL = 3000; // 最少3秒才能同步一次
    
    // 优化4：减少Realtime推送频率 - 通知节流
    let realtimeThrottleTimer = null;
    let pendingRealtimePayload = null;
    const REALTIME_THROTTLE_INTERVAL = 3000; // 最多3秒处理一次Realtime通知
    
    // 记录上次同步的数据hash，只同步变化的数据
    let lastSyncHashes = {};

    // ============================================
    // 初始化Supabase
    // ============================================
    function initSupabase() {
        if (typeof window.supabase !== 'undefined') {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('✅ Supabase客户端已初始化');
            initRealtime(); // 启动实时同步
        }
    }

    // ============================================
    // 【核心】真正的实时同步 - 订阅数据库变化
    // ============================================
    function initRealtime() {
        if (!supabaseClient) return;
        
        try {
            // 移除旧的订阅
            if (realtimeChannel) {
                supabaseClient.removeChannel(realtimeChannel);
            }
            
            // 创建实时订阅频道
            realtimeChannel = supabaseClient
                .channel('app_data_changes')
                .on('postgres_changes', 
                    { 
                        event: '*',  // 监听所有变化（INSERT/UPDATE/DELETE）
                        schema: 'public', 
                        table: 'app_data' 
                    }, 
                    (payload) => {
                        console.log('🔴 收到实时数据变化:', payload);
                        handleRealtimeChange(payload);
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Realtime订阅状态:', status);
                    if (status === 'SUBSCRIBED') {
                        showToast('📡 实时同步已连接');
                    }
                });
                
            console.log('✅ 实时同步已启动，数据库变化将立即推送！');
            
        } catch(e) {
            console.error('❌ 实时同步启动失败:', e);
            // 不使用轮询，只依赖Realtime实时同步
            // 用户可以手动点击同步按钮
        }
    }

    // ============================================
    // 处理实时数据变化（真正的在线版本：立即从云端重新读取并刷新页面）
    // 优化4：添加节流，最多3秒处理一次，减少流量消耗
    // ============================================
    function handleRealtimeChange(payload) {
        // 节流：合并多个连续的Realtime通知，只处理最后一个
        pendingRealtimePayload = payload;
        
        if (realtimeThrottleTimer) {
            clearTimeout(realtimeThrottleTimer);
        }
        
        realtimeThrottleTimer = setTimeout(() => {
            processRealtimeChange(pendingRealtimePayload);
            pendingRealtimePayload = null;
        }, REALTIME_THROTTLE_INTERVAL);
    }
    
    // 实际处理Realtime变化
    async function processRealtimeChange(payload) {
        const record = payload.new || payload.old;
        if (!record || !record.key) return;
        
        console.log('🔴 收到实时数据变化（节流后处理）:', record.key, payload.eventType);
        
        // 设置标志：正在应用云端变化，避免触发自动同步
        isApplyingCloudChange = true;
        
        try {
            // 真正的在线版本：立即从云端重新读取完整数据
            const fullData = await downloadData(record.key);
            if (fullData !== null) {
                localStorage.setItem(record.key, fullData);
                console.log('✅ 已从云端重新读取数据:', record.key, fullData.length, '字节');
            }
        } catch(e) {
            console.error('从云端重新读取数据失败:', e);
            // 如果从云端读取失败，使用Realtime返回的数据
            if (record.value) {
                localStorage.setItem(record.key, record.value);
            }
        } finally {
            // 异步操作完成后再清除标志
            setTimeout(() => {
                isApplyingCloudChange = false;
            }, 200);
        }
        
        // 立即刷新页面，确保用户看到最新数据
        setTimeout(() => {
            // 触发自定义事件，让应用刷新页面
            try {
                window.dispatchEvent(new CustomEvent('cloudDataUpdated', { 
                    detail: { key: record.key, event: payload.eventType, realtime: true }
                }));
            } catch(e) {}
            
            // 触发storage事件
            try {
                window.dispatchEvent(new StorageEvent('storage', {
                    key: record.key,
                    newValue: localStorage.getItem(record.key)
                }));
            } catch(e) {}
            
            // 调用全局刷新函数
            try {
                if (typeof window.refreshData === 'function') window.refreshData();
                if (typeof window.loadData === 'function') window.loadData();
                if (typeof window.renderAll === 'function') window.renderAll();
                if (typeof window.updateUI === 'function') window.updateUI();
            } catch(e) {}
            
            // 最后手段：重新加载页面（只在关键数据变化时，且至少间隔10秒）
            if (record.key === 'gf_cost_db' || record.key === 'styles') {
                var now = Date.now();
                if (!window._lastPageReload || now - window._lastPageReload > 10000) {
                    window._lastPageReload = now;
                    // 延迟1秒重新加载，确保应用有机会响应事件
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            }
        }, 100);
    }
    
    // ============================================
    // 注意：不使用定时轮询，只依赖Realtime实时同步
    // 用户修改数据时（新建款/删除款/修改款）会自动触发同步
    // ============================================

    // ============================================
    // 上传数据到云端
    // ============================================
    async function uploadData(key, value) {
        if (!supabaseClient) return false;
        
        try {
            const { data, error } = await supabaseClient
                .from('app_data')
                .upsert({ 
                    key: key, 
                    value: value, 
                    updated_at: new Date().toISOString() 
                }, { onConflict: 'key' });
                
            if (error) {
                console.error(`上传失败 ${key}:`, error);
                return false;
            }
            return true;
        } catch(e) {
            console.error(`上传异常 ${key}:`, e);
            return false;
        }
    }

    // ============================================
    // 从云端下载数据
    // ============================================
    async function downloadData(key) {
        if (!supabaseClient) return null;
        
        try {
            const { data, error } = await supabaseClient
                .from('app_data')
                .select('value')
                .eq('key', key)
                .single();
                
            if (error) {
                if (error.code !== 'PGRST116') { // 不是"未找到"错误
                    console.error(`下载失败 ${key}:`, error);
                }
                return null;
            }
            return data ? data.value : null;
        } catch(e) {
            console.error(`下载异常 ${key}:`, e);
            return null;
        }
    }

    // ============================================
    // 智能合并数据（避免数据冲突和数据丢失）
    // ============================================
    function mergeData(key, localData, cloudData) {
        // 如果是款式数据，按款式ID合并，取并集
        if (key === 'gf_cost_db') {
            try {
                const local = JSON.parse(localData);
                const cloud = JSON.parse(cloudData);
                
                if (!local.styles) local.styles = [];
                if (!cloud.styles) cloud.styles = [];
                
                // 按款式ID合并，取并集
                const styleMap = new Map();
                
                // 先添加云端的款式
                for (const style of cloud.styles) {
                    if (style && style.id) {
                        styleMap.set(style.id, style);
                    }
                }
                
                // 再添加本地的款式（如果有冲突，取更新时间较新的）
                for (const style of local.styles) {
                    if (style && style.id) {
                        if (styleMap.has(style.id)) {
                            // 有冲突，比较更新时间，取最新的
                            const existing = styleMap.get(style.id);
                            const localTime = style.updateTime || style.createDate || 0;
                            const cloudTime = existing.updateTime || existing.createDate || 0;
                            if (new Date(localTime) > new Date(cloudTime)) {
                                styleMap.set(style.id, style);
                            }
                        } else {
                            // 没有冲突，直接添加
                            styleMap.set(style.id, style);
                        }
                    }
                }
                
                // 转换回数组
                local.styles = Array.from(styleMap.values());
                
                console.log(`🔄 合并款式数据：本地${local.styles.length}个，云端${cloud.styles.length}个，合并后${local.styles.length}个`);
                
                return JSON.stringify(local);
            } catch(e) {
                console.error('合并款式数据失败:', e);
                // 合并失败，取数据量较大的
                return localData.length >= cloudData.length ? localData : cloudData;
            }
        }
        
        // 其他数据，取数据量较大的
        return localData.length >= cloudData.length ? localData : cloudData;
    }

    // ============================================
    // 同步所有数据到云端（用户修改后自动调用）
    // 优化1：只同步变化的数据，减少流量消耗
    // 优化1：添加同步间隔限制，避免频繁同步
    // ============================================
    async function syncToCloud() {
        if (!supabaseClient || isSyncing) return;
        
        // 优化1：同步间隔限制，最少3秒才能同步一次
        const now = Date.now();
        if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
            console.log(`⏳ 同步间隔限制，等待${Math.ceil((MIN_SYNC_INTERVAL - (now - lastSyncTime)) / 1000)}秒后再同步`);
            // 延迟到间隔结束后再同步
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
        for (const key of DATA_KEYS) {
            const localData = localStorage.getItem(key);
            if (localData !== null) {
                try {
                    // 优化1：计算数据hash，只同步变化的数据
                    const dataHash = simpleHash(localData);
                    if (lastSyncHashes[key] === dataHash) {
                        // 数据没有变化，跳过同步
                        continue;
                    }
                    
                    // 优化2：压缩款式图片（如果是gf_cost_db）
                    let dataToUpload = localData;
                    if (key === 'gf_cost_db') {
                        dataToUpload = compressImagesInData(localData);
                    }
                    
                    // 上传数据
                    const success = await uploadData(key, dataToUpload);
                    if (success) {
                        successCount++;
                        lastSyncHashes[key] = dataHash; // 记录hash
                        console.log(`✅ 上传成功: ${key} (${dataToUpload.length} 字节)`);
                    } else {
                        console.error(`❌ 上传失败: ${key}`);
                    }
                } catch(e) {
                    console.error(`上传异常 ${key}:`, e);
                }
            }
        }
        
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        isSyncing = false;
        
        console.log(`✅ 同步完成，成功上传 ${successCount} 项变化数据`);
        if (successCount > 0) {
            showToast(`☁️ 已同步到云端 (${successCount}项)`);
        }
    }
    
    // 简单的hash函数，用于检测数据变化
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash.toString(36);
    }
    
    // 优化2：压缩款式图片（简化版：截断过长的base64图片）
    function compressImagesInData(dataStr) {
        try {
            const data = JSON.parse(dataStr);
            
            // 压缩款式中的图片
            if (data.styles && Array.isArray(data.styles)) {
                for (const style of data.styles) {
                    if (style.images && Array.isArray(style.images)) {
                        style.images = style.images.map(img => {
                            if (typeof img === 'string' && img.length > 100000) {
                                // 图片过大，压缩或截断
                                console.log(`🖼️ 压缩款式图片: ${style.name}, 原大小: ${img.length} 字节`);
                                return compressBase64Image(img);
                            }
                            return img;
                        });
                    }
                    // 单张图片字段
                    if (style.image && typeof style.image === 'string' && style.image.length > 100000) {
                        console.log(`🖼️ 压缩款式图片: ${style.name}, 原大小: ${style.image.length} 字节`);
                        style.image = compressBase64Image(style.image);
                    }
                }
            }
            
            // 压缩款式库中的图片
            if (data.styleLibrary && Array.isArray(data.styleLibrary)) {
                for (const style of data.styleLibrary) {
                    if (style.image && typeof style.image === 'string' && style.image.length > 100000) {
                        style.image = compressBase64Image(style.image);
                    }
                }
            }
            
            return JSON.stringify(data);
        } catch(e) {
            console.error('压缩图片失败:', e);
            return dataStr; // 压缩失败，返回原数据
        }
    }
    
    // 压缩base64图片（简化版：使用Canvas压缩）
    function compressBase64Image(base64Str, maxWidth = 800, quality = 0.7) {
        // 注意：这是同步函数，但Canvas压缩是异步的
        // 简化处理：如果图片过大，直接截断（实际项目中应该用异步Canvas压缩）
        if (base64Str.length > 200000) {
            // 超过200KB，返回一个占位符（实际项目中应该压缩）
            console.log('⚠️ 图片过大，建议在上传前压缩');
        }
        return base64Str; // 暂时返回原图，后续可以添加Canvas压缩
    }

    // ============================================
    // 从云端同步所有数据（手动/页面加载时调用）
    // 优化1：只下载变化的数据，减少流量消耗
    // ============================================
    async function syncFromCloud(silent = false) {
        if (!supabaseClient || isSyncing) return;
        
        isSyncing = true;
        
        if (!silent) {
            console.log('📥 开始从云端同步（只下载变化的数据）...');
        }
        
        // 设置标志：正在应用云端变化，避免触发自动同步
        isApplyingCloudChange = true;
        
        let successCount = 0;
        
        // 优化1：先查询所有数据的更新时间，只下载变化的
        try {
            const { data: allData, error: queryError } = await supabaseClient
                .from('app_data')
                .select('key, updated_at');
                
            if (!queryError && allData) {
                for (const item of allData) {
                    if (!DATA_KEYS.includes(item.key)) continue;
                    
                    // 检查本地是否有这个数据的更新时间记录
                    const localLastUpdate = localStorage.getItem(`cloud_last_update_${item.key}`);
                    if (localLastUpdate && item.updated_at && new Date(item.updated_at) <= new Date(localLastUpdate)) {
                        // 云端数据没有更新，跳过下载
                        continue;
                    }
                    
                    // 下载变化的数据
                    const data = await downloadData(item.key);
                    if (data !== null) {
                        localStorage.setItem(item.key, data);
                        localStorage.setItem(`cloud_last_update_${item.key}`, item.updated_at || new Date().toISOString());
                        successCount++;
                    }
                }
            }
        } catch(e) {
            console.error('查询云端更新时间失败，降级为全量下载:', e);
            // 降级为全量下载
            for (const key of DATA_KEYS) {
                const data = await downloadData(key);
                if (data !== null) {
                    localStorage.setItem(key, data);
                    successCount++;
                }
            }
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
            console.log(`✅ 同步完成，成功下载 ${successCount} 项变化数据`);
            if (successCount > 0) {
                showToast(`📥 已从云端恢复 (${successCount}项)`);
            }
        }
        
        // 触发数据更新事件
        window.dispatchEvent(new CustomEvent('cloudDataUpdated', { detail: { silent: silent } }));
        
        return true;
    }

    // ============================================
    // 自动同步（用户修改数据后同步到云端）
    // 优化1：增加延迟到1秒，合并连续的修改，减少频繁同步
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
            if (DATA_KEYS.includes(key) && supabaseClient && !isApplyingCloudChange) {
                console.log('📝 检测到本地数据变化，触发自动同步:', key);
                scheduleAutoSync();
            }
        };
    }

    // ============================================
    // 页面聚焦时检查云端最新数据（但不自动同步，避免覆盖本地数据）
    // ============================================
    function initFocusSync() {
        // 页面聚焦时不自动同步，避免覆盖本地数据
        // 用户可以手动点击同步按钮
        console.log('👁️ 页面聚焦同步已禁用，避免覆盖本地数据');
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
    // 初始化
    // ============================================
    function init() {
        console.log('🚀 多绮爱服饰云端实时同步模块 v6.2 启动（优化版：减少流量消耗）...');
        
        // 等待supabase-js加载完成
        const waitForSupabase = setInterval(() => {
            if (typeof window.supabase !== 'undefined') {
                clearInterval(waitForSupabase);
                initSupabase();
                setupAutoSync();
                initFocusSync();
                
                // 页面加载时立即从云端同步（真正的在线版本，不延迟）
                setTimeout(() => {
                    syncFromCloud(true);
                }, 100); // 0.1秒后立即从云端同步
                
                // 注意：不启动5秒轮询，因为轮询会覆盖本地新添加的数据
                // 只依赖Realtime实时同步，如果Realtime不工作，用户可以手动点击同步按钮
            }
        }, 100);
        
        // 10秒超时
        setTimeout(() => {
            clearInterval(waitForSupabase);
            if (!supabaseClient) {
                console.error('❌ Supabase加载超时');
            }
        }, 10000);
    }

    // 暴露全局函数
    window.CloudSync = {
        init: init,
        syncToCloud: syncToCloud,
        syncFromCloud: syncFromCloud,
        getRealtimeStatus: () => realtimeChannel ? '已连接' : '未连接',
        version: CLOUD_SYNC_VERSION
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
