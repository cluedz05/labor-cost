// ============================================
// 多绮爱服饰 - 云端实时同步模块 v3.0
// 真正的0延迟实时同步（Supabase Realtime）
// ============================================

(function() {
    'use strict';

    // 配置
    const SUPABASE_URL = 'https://izzcqlydjnfumbzfepcx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Vo_zxOAcU3j4y216VCx3qw_XygxDytX';
    
    const DATA_KEYS = ['gf_cost_db', 'styles', 'app_users', 'user_avatars', 'export_records', 'backup_versions', 'process_library', 'style_library'];
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
    function handleRealtimeChange(payload) {
        // 避免自己触发的变化导致循环
        if (justSyncedFromCloud) {
            console.log('⏭️  跳过本次变化（刚从云端同步）');
            return;
        }
        
        const record = payload.new || payload.old;
        if (!record || !record.key) return;
        
        console.log(`📥 收到数据变化: ${record.key}, 事件: ${payload.eventType}`);
        
        // 设置标志：正在应用云端变化，避免触发自动同步
        isApplyingCloudChange = true;
        
        // 立即更新本地数据
        if (payload.eventType === 'DELETE') {
            localStorage.removeItem(record.key);
        } else {
            localStorage.setItem(record.key, record.value);
        }
        
        // 清除标志
        setTimeout(() => {
            isApplyingCloudChange = false;
        }, 100);
        
        // 触发数据更新事件，刷新页面
        window.dispatchEvent(new CustomEvent('cloudDataUpdated', { 
            detail: { key: record.key, event: payload.eventType, realtime: true }
        }));
        
        showToast(`📡 数据已实时更新: ${record.key}`);
    }

    // ============================================
    // 降级方案：5秒轮询（如果Realtime不可用）
    // ============================================
    function startFallbackPolling() {
        console.log('⚠️  使用降级方案：5秒轮询同步');
        setInterval(() => {
            if (!justSyncedFromCloud && !isSyncing) {
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
    // 同步所有数据到云端（用户修改后2秒自动调用）
    // ============================================
    async function syncToCloud() {
        if (!supabaseClient || isSyncing) return;
        
        // 数据保护：刚从云端同步后，不要立即同步回去
        if (justSyncedFromCloud) {
            console.log('⏭️  跳过同步到云端（刚从云端同步）');
            return;
        }
        
        isSyncing = true;
        console.log('☁️ 开始同步到云端...');
        
        let successCount = 0;
        for (const key of DATA_KEYS) {
            const data = localStorage.getItem(key);
            if (data !== null) {
                const success = await uploadData(key, data);
                if (success) successCount++;
            }
        }
        
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        isSyncing = false;
        
        console.log(`✅ 同步完成，成功上传 ${successCount}/${DATA_KEYS.length} 项`);
        showToast(`☁️ 已同步到云端 (${successCount}项)`);
    }

    // ============================================
    // 从云端同步所有数据（手动/页面加载时调用）
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
        
        // 设置数据保护标志，10秒内不要同步回去
        justSyncedFromCloud = true;
        if (justSyncedTimer) clearTimeout(justSyncedTimer);
        justSyncedTimer = setTimeout(() => {
            justSyncedFromCloud = false;
        }, 10000);
        
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
                scheduleAutoSync();
            }
        });
        
        // 重写setItem监听当前页面的变化
        const originalSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function(key, value) {
            originalSetItem(key, value);
            // 如果是正在应用云端变化，或者刚从云端同步，就不要触发自动同步
            if (DATA_KEYS.includes(key) && supabaseClient && !isApplyingCloudChange && !justSyncedFromCloud) {
                scheduleAutoSync();
            }
        };
    }

    // ============================================
    // 页面聚焦时立即同步
    // ============================================
    function initFocusSync() {
        window.addEventListener('focus', () => {
            console.log('👁️ 页面聚焦，检查云端最新数据...');
            if (supabaseClient && !isSyncing) {
                syncFromCloud(true);
            }
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ 页面可见，检查云端最新数据...');
                if (supabaseClient && !isSyncing) {
                    syncFromCloud(true);
                }
            }
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
        getRealtimeStatus: () => realtimeChannel ? '已连接' : '未连接'
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
