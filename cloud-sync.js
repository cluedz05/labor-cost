// ============================================
// 多绮爱服饰 - 云端实时同步模块 v4.9
// 真正的0延迟实时同步（Supabase Realtime）
// ============================================

(function() {
    'use strict';

    // 版本号
    const CLOUD_SYNC_VERSION = 'v4.9';
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
            // 降级为5秒轮询
            startFallbackPolling();
        }
    }

    // ============================================
    // 处理实时数据变化
    // ============================================
    async function handleRealtimeChange(payload) {
        const record = payload.new || payload.old;
        if (!record || !record.key) return;
        
        console.log(`📥 收到实时数据变化: ${record.key}, 事件: ${payload.eventType}`);
        
        // 设置标志：正在应用云端变化，避免触发自动同步
        isApplyingCloudChange = true;
        
        let dataUpdated = false;
        
        try {
            if (payload.eventType === 'DELETE') {
                localStorage.removeItem(record.key);
                console.log(`🗑️ 已删除本地数据: ${record.key}`);
                dataUpdated = true;
            } else {
                // 直接使用Realtime返回的数据（避免额外的网络请求导致卡顿）
                if (record.value) {
                    localStorage.setItem(record.key, record.value);
                    console.log(`✅ 已更新本地数据: ${record.key} (${record.value.length} 字节)`);
                    dataUpdated = true;
                } else {
                    // 如果Realtime没有返回value，再从云端下载
                    const fullData = await downloadData(record.key);
                    if (fullData !== null) {
                        localStorage.setItem(record.key, fullData);
                        console.log(`✅ 从云端下载完整数据: ${record.key} (${fullData.length} 字节)`);
                        dataUpdated = true;
                    }
                }
            }
        } catch(e) {
            console.error(`处理实时数据变化失败: ${record.key}`, e);
        } finally {
            // 异步操作完成后再清除标志
            setTimeout(() => {
                isApplyingCloudChange = false;
            }, 200);
        }
        
        // 数据更新后触发事件，刷新页面（延迟确保localStorage已更新）
        if (dataUpdated) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('cloudDataUpdated', { 
                    detail: { key: record.key, event: payload.eventType, realtime: true }
                }));
                console.log(`🔔 已触发cloudDataUpdated事件: ${record.key}`);
            }, 100);
            
            showToast(`📡 数据已实时更新: ${record.key}`);
        }
    }
    
    // ============================================
    // 降级方案：5秒轮询（确保即使Realtime不工作也能同步）
    // ============================================
    let pollingTimer = null;
    function startFallbackPolling() {
        if (pollingTimer) clearInterval(pollingTimer);
        console.log('🔄 启动5秒轮询降级方案...');
        pollingTimer = setInterval(() => {
            if (!isSyncing && supabaseClient && !justSyncedFromCloud) {
                console.log('🔄 轮询：检查云端最新数据...');
                syncFromCloud(true);
            }
        }, 5000);
    }

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
    // 同步所有数据到云端（用户修改后2秒自动调用）
    // 简化版：直接上传本地数据，确保数据能同步到云端
    // ============================================
    async function syncToCloud() {
        if (!supabaseClient || isSyncing) return;
        
        isSyncing = true;
        console.log('☁️ 开始同步到云端...');
        
        let successCount = 0;
        for (const key of DATA_KEYS) {
            const localData = localStorage.getItem(key);
            if (localData !== null) {
                try {
                    // 直接上传本地数据
                    const success = await uploadData(key, localData);
                    if (success) {
                        successCount++;
                        console.log(`✅ 上传成功: ${key}`);
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
        
        console.log(`✅ 同步完成，成功上传 ${successCount}/${DATA_KEYS.length} 项`);
        showToast(`☁️ 已同步到云端 (${successCount}项)`);
    }

    // ============================================
    // 从云端同步所有数据（手动/页面加载时调用）
    // 简化版：直接下载云端数据覆盖本地，确保数据能同步下来
    // ============================================
    async function syncFromCloud(silent = false) {
        if (!supabaseClient || isSyncing) return;
        
        isSyncing = true;
        
        if (!silent) {
            console.log('📥 开始从云端同步...');
        }
        
        // 设置标志：正在应用云端变化，避免触发自动同步
        isApplyingCloudChange = true;
        
        let successCount = 0;
        for (const key of DATA_KEYS) {
            const data = await downloadData(key);
            if (data !== null) {
                localStorage.setItem(key, data);
                successCount++;
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
            console.log(`✅ 同步完成，成功下载 ${successCount}/${DATA_KEYS.length} 项`);
            showToast(`📥 已从云端恢复 (${successCount}项)`);
        }
        
        // 触发数据更新事件
        window.dispatchEvent(new CustomEvent('cloudDataUpdated', { detail: { silent: silent } }));
        
        return true;
    }

    // ============================================
    // 自动同步（用户修改数据后2秒自动同步到云端）
    // ============================================
    function scheduleAutoSync() {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncToCloud();
        }, 2000); // 2秒后自动同步
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
        console.log('🚀 多绮爱服饰云端实时同步模块 v3.0 启动...');
        
        // 等待supabase-js加载完成
        const waitForSupabase = setInterval(() => {
            if (typeof window.supabase !== 'undefined') {
                clearInterval(waitForSupabase);
                initSupabase();
                setupAutoSync();
                initFocusSync();
                
                // 页面加载时从云端同步一次
                setTimeout(() => {
                    syncFromCloud(true);
                }, 1000);
                
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
