// ============================================
// 云端同步模块 - Supabase
// ============================================

(function() {
    'use strict';

    // 配置存储key
    const CONFIG_KEY = 'supabase_config';
    const SYNC_LOG_KEY = 'sync_log';
    const LAST_SYNC_KEY = 'last_sync_time';

    // 需要同步的数据key列表
    const DATA_KEYS = [
        'style_library',      // 款式库
        'styles',             // 历史款式
        'currentStyle',       // 当前款式
        'app_users',          // 用户列表
        'app_current_user',   // 当前用户
        'backups',            // 备份记录
        'exportRecords',      // 导出记录
        'approvals',          // 审批记录
        'settings'            // 应用设置
    ];

    // Supabase客户端
    let supabaseClient = null;
    let isSyncing = false;
    let syncTimer = null;

    // ============================================
    // 配置管理
    // ============================================

    function getConfig() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
        } catch(e) {
            return {};
        }
    }

    function saveConfig(config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    function isConfigured() {
        const config = getConfig();
        return config.url && config.anonKey && config.table;
    }

    function initSupabase() {
        const config = getConfig();
        if (!config.url || !config.anonKey) {
            return false;
        }
        try {
            supabaseClient = window.supabase.createClient(config.url, config.anonKey);
            return true;
        } catch(e) {
            console.error('Supabase初始化失败:', e);
            return false;
        }
    }

    // ============================================
    // 同步日志
    // ============================================

    function addSyncLog(message, type = 'info') {
        try {
            const logs = JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || '[]');
            logs.unshift({
                time: new Date().toLocaleString('zh-CN'),
                message: message,
                type: type
            });
            // 只保留最近50条
            localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(logs.slice(0, 50)));
        } catch(e) {}
    }

    function getSyncLogs() {
        try {
            return JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || '[]');
        } catch(e) {
            return [];
        }
    }

    // ============================================
    // 云端数据操作
    // ============================================

    // 上传数据到云端
    async function uploadData(key, data) {
        if (!supabaseClient || !isConfigured()) return false;
        
        const config = getConfig();
        try {
            // 检查记录是否存在
            const { data: existing } = await supabaseClient
                .from(config.table)
                .select('*')
                .eq('data_key', key)
                .single();

            const payload = {
                data_key: key,
                data: data,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                // 更新
                const { error } = await supabaseClient
                    .from(config.table)
                    .update(payload)
                    .eq('data_key', key);
                if (error) throw error;
            } else {
                // 插入
                const { error } = await supabaseClient
                    .from(config.table)
                    .insert(payload);
                if (error) throw error;
            }
            return true;
        } catch(e) {
            console.error('上传数据失败:', key, e);
            addSyncLog('上传失败: ' + key + ' - ' + e.message, 'error');
            return false;
        }
    }

    // 从云端下载数据
    async function downloadData(key) {
        if (!supabaseClient || !isConfigured()) return null;
        
        const config = getConfig();
        try {
            const { data, error } = await supabaseClient
                .from(config.table)
                .select('*')
                .eq('data_key', key)
                .single();

            if (error) throw error;
            return data ? data.data : null;
        } catch(e) {
            console.error('下载数据失败:', key, e);
            return null;
        }
    }

    // ============================================
    // 同步操作
    // ============================================

    // 同步所有数据到云端
    async function syncToCloud() {
        if (isSyncing || !isConfigured()) return;
        isSyncing = true;
        addSyncLog('开始同步到云端...', 'info');

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
        addSyncLog(`同步完成，成功上传 ${successCount}/${DATA_KEYS.length} 项数据`, 'success');
        showToast(`☁️ 云端同步完成 (${successCount}项)`);
    }

    // 从云端同步所有数据
    async function syncFromCloud() {
        if (isSyncing || !isConfigured()) return;
        isSyncing = true;
        addSyncLog('开始从云端同步...', 'info');

        let successCount = 0;
        for (const key of DATA_KEYS) {
            const data = await downloadData(key);
            if (data !== null) {
                localStorage.setItem(key, data);
                successCount++;
            }
        }

        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        isSyncing = false;
        addSyncLog(`同步完成，成功下载 ${successCount}/${DATA_KEYS.length} 项数据`, 'success');
        showToast(`☁️ 云端数据已恢复 (${successCount}项)`);
        
        // 刷新页面以应用新数据
        setTimeout(() => location.reload(), 1000);
    }

    // 自动同步（延迟执行，避免频繁同步）
    function scheduleAutoSync() {
        if (!isConfigured()) return;
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncToCloud();
        }, 5000); // 5秒后自动同步
    }

    // ============================================
    // UI - 设置面板
    // ============================================

    function createSettingsModal() {
        const config = getConfig();
        const logs = getSyncLogs();
        const lastSync = localStorage.getItem(LAST_SYNC_KEY);

        let logsHtml = '';
        if (logs.length > 0) {
            logsHtml = logs.slice(0, 10).map(log => {
                const color = log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#22c55e' : '#6b7280';
                return `<div style="padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:${color}">
                    <span style="color:#999">${log.time}</span> ${log.message}
                </div>`;
            }).join('');
        } else {
            logsHtml = '<div style="color:#999;text-align:center;padding:20px">暂无同步记录</div>';
        }

        const modal = document.createElement('div');
        modal.id = 'cloudSyncModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center';
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;padding:24px;width:90%;max-width:500px;max-height:90vh;overflow-y:auto">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                    <h2 style="margin:0;font-size:20px">☁️ 云端同步设置</h2>
                    <button onclick="document.getElementById('cloudSyncModal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#999">&times;</button>
                </div>

                <div style="margin-bottom:16px">
                    <label style="display:block;margin-bottom:6px;font-weight:600">Supabase Project URL</label>
                    <input id="sbUrl" type="text" placeholder="https://xxxx.supabase.co" value="${config.url || ''}" 
                        style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box">
                </div>

                <div style="margin-bottom:16px">
                    <label style="display:block;margin-bottom:6px;font-weight:600">anon public key</label>
                    <input id="sbAnonKey" type="text" placeholder="你的anon public key" value="${config.anonKey || ''}" 
                        style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box">
                </div>

                <div style="margin-bottom:16px">
                    <label style="display:block;margin-bottom:6px;font-weight:600">数据表名</label>
                    <input id="sbTable" type="text" placeholder="app_data" value="${config.table || 'app_data'}" 
                        style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box">
                </div>

                <div style="display:flex;gap:10px;margin-bottom:20px">
                    <button id="saveConfigBtn" style="flex:1;padding:12px;background:#4361ee;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600">
                        💾 保存配置
                    </button>
                    <button id="testConnBtn" style="padding:12px 20px;background:#f0f0f0;border:none;border-radius:8px;cursor:pointer">
                        🔌 测试连接
                    </button>
                </div>

                <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:16px">
                    <div style="font-weight:600;margin-bottom:10px">同步操作</div>
                    <div style="display:flex;gap:10px">
                        <button id="syncUpBtn" style="flex:1;padding:10px;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer">
                            ⬆️ 上传到云端
                        </button>
                        <button id="syncDownBtn" style="flex:1;padding:10px;background:#f59e0b;color:white;border:none;border-radius:8px;cursor:pointer">
                            ⬇️ 从云端恢复
                        </button>
                    </div>
                    <div style="margin-top:10px;font-size:12px;color:#666">
                        上次同步: ${lastSync ? new Date(lastSync).toLocaleString('zh-CN') : '从未同步'}
                    </div>
                </div>

                <div style="background:#f9fafb;border-radius:10px;padding:16px">
                    <div style="font-weight:600;margin-bottom:10px">同步记录</div>
                    <div style="max-height:150px;overflow-y:auto">
                        ${logsHtml}
                    </div>
                </div>

                <div style="margin-top:16px;padding:12px;background:#fffbeb;border-radius:8px;font-size:12px;color:#92400e">
                    <strong>使用说明：</strong><br>
                    1. 注册 <a href="https://supabase.com" target="_blank">Supabase</a> 账号并创建项目<br>
                    2. 在SQL编辑器中执行建表语句（见下方）<br>
                    3. 填入Project URL和anon key<br>
                    4. 保存配置后，数据修改会自动同步到云端
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定事件
        document.getElementById('saveConfigBtn').onclick = function() {
            const url = document.getElementById('sbUrl').value.trim();
            const anonKey = document.getElementById('sbAnonKey').value.trim();
            const table = document.getElementById('sbTable').value.trim() || 'app_data';

            if (!url || !anonKey) {
                alert('请填写URL和anon key');
                return;
            }

            saveConfig({ url, anonKey, table });
            initSupabase();
            showToast('✅ 配置已保存');
            addSyncLog('配置已保存', 'success');
        };

        document.getElementById('testConnBtn').onclick = async function() {
            if (!initSupabase()) {
                alert('初始化失败，请检查配置');
                return;
            }
            try {
                const config = getConfig();
                const { data, error } = await supabaseClient
                    .from(config.table)
                    .select('count')
                    .limit(1);
                if (error) throw error;
                alert('✅ 连接成功！');
                addSyncLog('连接测试成功', 'success');
            } catch(e) {
                alert('❌ 连接失败: ' + e.message + '\n\n请确保已在Supabase中创建数据表');
                addSyncLog('连接测试失败: ' + e.message, 'error');
            }
        };

        document.getElementById('syncUpBtn').onclick = syncToCloud;
        document.getElementById('syncDownBtn').onclick = syncFromCloud;
    }

    // ============================================
    // Toast提示
    // ============================================

    function showToast(message) {
        // 如果页面已有toast函数，使用它
        if (typeof window.toast === 'function') {
            window.toast(message);
            return;
        }
        // 否则创建简单的toast
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 24px;border-radius:8px;z-index:10001;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ============================================
    // 自动同步监听
    // ============================================

    function setupAutoSync() {
        // 监听localStorage变化（其他标签页）
        window.addEventListener('storage', function(e) {
            if (DATA_KEYS.includes(e.key)) {
                scheduleAutoSync();
            }
        });

        // 重写localStorage.setItem以监听当前页面的变化
        const originalSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function(key, value) {
            originalSetItem(key, value);
            if (DATA_KEYS.includes(key) && isConfigured()) {
                scheduleAutoSync();
            }
        };
    }

    // ============================================
    // 添加设置按钮到页面
    // ============================================

    function addSettingsButton() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addSettingsButton);
            return;
        }

        // 检查是否已添加
        if (document.getElementById('cloudSyncBtn')) return;

        // 创建设置按钮
        const btn = document.createElement('button');
        btn.id = 'cloudSyncBtn';
        btn.innerHTML = '☁️';
        btn.title = '云端同步设置';
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:50px;height:50px;border-radius:50%;background:#4361ee;color:white;border:none;font-size:24px;cursor:pointer;box-shadow:0 4px 12px rgba(67,97,238,0.4);z-index:9999;display:flex;align-items:center;justify-content:center';
        btn.onclick = createSettingsModal;
        document.body.appendChild(btn);

        // 如果已配置，显示同步状态指示器
        if (isConfigured()) {
            const indicator = document.createElement('div');
            indicator.id = 'syncIndicator';
            indicator.style.cssText = 'position:fixed;bottom:80px;right:20px;background:#22c55e;color:white;padding:4px 10px;border-radius:12px;font-size:11px;z-index:9998';
            indicator.textContent = '☁️ 已同步';
            document.body.appendChild(indicator);
        }
    }

    // ============================================
    // 初始化
    // ============================================

    function init() {
        // 初始化Supabase
        if (isConfigured()) {
            initSupabase();
            addSyncLog('云端同步已启用', 'success');
        }

        // 设置自动同步
        setupAutoSync();

        // 添加设置按钮
        addSettingsButton();

        // 页面加载时从云端同步（如果已配置）
        if (isConfigured()) {
            // 延迟同步，避免影响页面加载
            setTimeout(() => {
                // 检查是否需要从云端恢复（本地数据为空时）
                const localLibrary = localStorage.getItem('style_library');
                if (!localLibrary || localLibrary === '[]') {
                    addSyncLog('本地数据为空，尝试从云端恢复...', 'info');
                    syncFromCloud();
                }
            }, 3000);
        }

        console.log('☁️ 云端同步模块已加载');
    }

    // 暴露全局函数
    window.CloudSync = {
        init: init,
        openSettings: createSettingsModal,
        syncToCloud: syncToCloud,
        syncFromCloud: syncFromCloud,
        isConfigured: isConfigured
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
