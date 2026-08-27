
// ===== 屏蔽浏览器自动填充 =====
(function() {
  // 生成随机字符串，防止浏览器匹配保存的表单值
  var rnd = '_x' + Math.random().toString(36).substr(2, 8);
  ['procFilter', 'manageSearch', 'searchInput', 'pasteArea'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.setAttribute('name', rnd + '_' + id);
  });
})();

// ===== 数据结构 =====
let DB = {
  processes: {
    pingche: [],  // {id, name, price}
    zache: [],
    kanche: []
  },
  styles: []       // {id, name, note, date, img, selections:[{type,name,qty,price}]}
};

let currentMachine = 'pingche';
let processFilter = '';
let currentImgs = [null];
let currentImgIndex = 0;
let selectedItems = [];  // [{type, name, qty, price}]
let currentHistoryId = null;
let currentStyleId = null; // null=新款式，非null=正在编辑的历史款式

function logout() {
  if (!confirm('确定退出登录？')) return;
  fetch('/api/logout', { method: 'POST', headers: apiHeaders() }).catch(() => {});
  document.cookie = 'token=; path=/; max-age=0';
  window.location.reload();
}

function getCookie(name) {
  return (document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')) || [0, ''])[1];
}
function apiHeaders() {
  const token = getCookie('token');
  return token ? { 'Content-Type': 'application/json', 'Authorization': token } : { 'Content-Type': 'application/json' };
}

// ====== 欢迎弹窗 ======
function showWelcome(user) {
  var el = document.getElementById('welcomeModal');
  if (!el) return;
  document.getElementById('wbName').textContent = user.username || '你好';
  var h = new Date().getHours();
  var greet = h < 12 ? '上午好 ☀️' : h < 18 ? '下午好 🌤️' : '晚上好 🌙';
  var now = new Date();
  var timeStr = greet + ' · ' + now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日 ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  document.getElementById('wbTime').textContent = timeStr;
  var badge = document.getElementById('wbRoleBadge');
  if (user.isAdmin) {
    badge.textContent = '👑 管理员'; badge.style.background='#fff3e0'; badge.style.color='#e65100';
  } else if (user.role === 'subadmin') {
    badge.textContent = '⭐ 子管理员'; badge.style.background='#fff8e1'; badge.style.color='#f57f17';
  } else if (user.role === 'operator') {
    badge.textContent = '🛠️ 操作员'; badge.style.background='#e8f5e9'; badge.style.color='#2e7d32';
  } else if (user.role === 'viewer') {
    badge.textContent = '👁️ 查看员'; badge.style.background='#e3f2fd'; badge.style.color='#1565c0';
  } else {
    badge.textContent = '👤 成员'; badge.style.background='#f5f5f5'; badge.style.color='#666';
  }
  var custom = user.welcomeMsg || '';
  var tips;
  if (custom.trim()) {
    tips = custom.split('\n').slice(0, 4).filter(function(t){ return t.trim(); });
  } else {
    tips = [];
    if (user.isAdmin || user.role === 'subadmin') tips.push('📊 点击顶部「管理后台」可审批新用户');
    if (user.isAdmin || user.role === 'subadmin') tips.push('📋 操作日志记录所有数据改动');
    if (user.isAdmin || user.role === 'operator') tips.push('✨ 在「新款开发」快速录入新款');
    if (user.role !== 'viewer') tips.push('📋 粘贴表格可批量导入工序');
    tips.push('🔔 有新通知时铃铛会亮红点');
    tips = tips.slice(0, 3);
  }
  document.getElementById('wbTip1').innerHTML = tips.join('<br>');
  el.style.display = 'flex';
}
function closeWelcome() {
  var el = document.getElementById('welcomeModal');
  if (el) el.style.display = 'none';
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeWelcome();
});

// ===== 初始化 =====
async function init() {
  useAPI = (location.protocol === 'http:' || location.protocol === 'https:');
  if (useAPI) {
    // 检查登录状态
    try {
      const r = await fetch('/api/me', { headers: apiHeaders() });
      const d = await r.json();
      if (!d.ok) throw new Error('not logged in');
      currentUser = d.user;

      // 待审批账号 → 阻止使用工具
      if (currentUser.status === 'pending') {
        document.getElementById('pendingOverlay').style.display = 'flex';
        return;
      }

      // 查看员模式
      if (currentUser.role === 'viewer') {
        document.body.classList.add('viewer-mode');
        // 查看员只能看到「历史款式」，隐藏其他标签和区块
        document.querySelectorAll('.tab-btn').forEach(btn => {
          const tab = btn.dataset.tab;
          if (tab === 'dev' || tab === 'manage') {
            btn.style.display = 'none';
          }
        });
        // 默认切换到历史款式
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const histBtn = document.querySelector('[data-tab="history"]');
        if (histBtn) histBtn.classList.add('active');
        document.getElementById('tab-history').classList.add('active');
        // 隐藏新款开发和工序管理的整块卡片
        document.getElementById('tab-dev').style.display = 'none';
        document.getElementById('tab-manage').style.display = 'none';

        // ── 手机底部导航：隐藏 dev/manage 按钮，默认切到历史款式 ──
        var mnavBtns = document.querySelectorAll('.mnav-btn');
        mnavBtns.forEach(function(b) {
          var t = b.dataset.tab;
          if (t === 'dev' || t === 'manage') b.style.display = 'none';
        });
        // 手机 nav 默认激活 history
        var mnavHistory = document.querySelector('.mnav-btn[data-tab="history"]');
        if (mnavHistory) {
          mnavBtns.forEach(function(b){b.classList.remove('active')});
          mnavHistory.classList.add('active');
        }
      }

      // 显示用户信息
      const badge = document.getElementById('userBadge');
      const logoutBtn = document.getElementById('logoutBtn');
      if (badge) { badge.textContent = '👤 ' + currentUser.username; badge.style.display = ''; }
      if (logoutBtn) logoutBtn.style.display = '';
      // admin 入口
      const adminBtn = document.getElementById('adminBtn');
      if (adminBtn) {
        adminBtn.style.display = (currentUser.isAdmin || currentUser.role === 'subadmin') ? '' : 'none';
      }
      // 操作日志标签（仅管理员可见）
      const logsTabBtn = document.getElementById('logsTabBtn');
      if (logsTabBtn) {
        logsTabBtn.style.display = (currentUser.isAdmin || currentUser.role === 'subadmin') ? '' : 'none';
      }
      // 手机底部导航日志按钮（admin/subadmin 可见）
      var mnavLogs=document.getElementById('mnavLogs');
      if(mnavLogs)mnavLogs.style.display=(currentUser.isAdmin||currentUser.role==='subadmin')?'':'none';
      // 修改密码按钮（所有登录用户可见）
      const changePwdBtn = document.getElementById('changePwdBtn');
      if (changePwdBtn) changePwdBtn.style.display = '';
      // 角色徽章
      const roleBadge = document.getElementById('userBadge');
      if (roleBadge) {
        if (currentUser.role === 'viewer') {
          roleBadge.textContent = '👁️ ' + currentUser.username + '（查看员）';
        } else if (currentUser.role === 'operator') {
          roleBadge.textContent = '🛠️ ' + currentUser.username + '（操作员）';
        } else if (currentUser.role === 'subadmin') {
          roleBadge.textContent = '⭐ ' + currentUser.username + '（子管理员）';
        } else {
          roleBadge.textContent = '👤 ' + currentUser.username;
        }
      }
      // 通知铃铛（所有登录用户可见）
      const notifBell = document.getElementById('notifBell');
      if (notifBell) notifBell.style.display = 'inline-flex';
      const mnavNotif = document.getElementById('mnavNotif');
      if (mnavNotif) mnavNotif.style.display = 'inline-flex';
      startNotifPolling();

      // ── 首次加载显示欢迎弹窗（每会话一次）──
      if (!sessionStorage.getItem('wb_welcomed')) {
        sessionStorage.setItem('wb_welcomed', '1');
        setTimeout(function() { showWelcome(currentUser); }, 400);
      }
    } catch(e) {
      // API不可用 → 降级为纯前端本地模式
      useAPI = false;
      currentUser = { username: '本地用户', role: 'admin', isAdmin: true, uid: 'local' };
      // 隐藏未登录遮罩层
      var overlay = document.getElementById('unloginOverlay');
      if (overlay) overlay.style.display = 'none';
      // 显示用户信息和管理员功能
      var badge = document.getElementById('userBadge');
      if (badge) { badge.textContent = '👤 本地用户'; badge.style.display = ''; }
      var adminBtn = document.getElementById('adminBtn');
      if (adminBtn) adminBtn.style.display = '';
      var logsTabBtn = document.getElementById('logsTabBtn');
      if (logsTabBtn) logsTabBtn.style.display = '';
      var mnavLogs = document.getElementById('mnavLogs');
      if (mnavLogs) mnavLogs.style.display = '';
      var changePwdBtn = document.getElementById('changePwdBtn');
      if (changePwdBtn) changePwdBtn.style.display = 'none';
    }
  }
  await loadDB();
  renderManageList();
  renderProcessSelect();
  setStyleDate();
  renderImgGrid();
  renderHistory();
  // 初始化回收站（包含清理30天前的过期项）
  if (!DB.recycleBin) DB.recycleBin = [];
  cleanExpiredRecycleItems();
  updateRecycleCount();
  renderRecycleBin();
  if (useAPI) {
    storageOK = true;
    startSyncPolling();
  } else {
    storageOK = storageAvailable();
    if (!storageOK) {
      document.getElementById('storageWarn').style.display = 'block';
    }
  }
  
  // ── 角色选择（纯前端模式）──
  if (!useAPI) {
    var savedRole = localStorage.getItem('app_role');
    if (savedRole) {
      selectRole(savedRole, true);
    } else {
      showRoleSelect();
    }
  }
}

// ===== 存储（localStorage + IndexedDB 双保险，联网模式走服务器 API）=====
let storageOK = true;
let currentUser = null;
const IDB_NAME = 'gf_cost_db_idb';
const IDB_STORE = 'kv';

// ===== 角色选择（纯前端模式）=====
function selectRole(role, silent) {
  if (!role) role = 'admin';
  localStorage.setItem('app_role', role);
  
  var isAdmin = role === 'admin';
  var badge = document.getElementById('userBadge');
  var adminBtn = document.getElementById('adminBtn');
  var logsTabBtn = document.getElementById('logsTabBtn');
  var mnavLogs = document.getElementById('mnavLogs');
  var changePwdBtn = document.getElementById('changePwdBtn');
  var switchRoleBtn = document.getElementById('switchRoleBtn');
  
  // 更新用户徽章
  if (badge) {
    badge.textContent = isAdmin ? '👑 管理员' : '👤 普通用户';
  }
  
  // 管理员功能显示/隐藏
  if (adminBtn) adminBtn.style.display = isAdmin ? '' : 'none';
  if (logsTabBtn) logsTabBtn.style.display = isAdmin ? '' : 'none';
  if (mnavLogs) mnavLogs.style.display = isAdmin ? '' : 'none';
  if (changePwdBtn) changePwdBtn.style.display = 'none'; // 纯前端模式都不需要修改密码
  if (switchRoleBtn) switchRoleBtn.style.display = '';
  
  // 隐藏/显示导出导入按钮（普通用户只保留核心功能）
  var topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) {
    var btns = topbarRight.querySelectorAll('.btn-top');
    btns.forEach(function(btn) {
      var text = btn.textContent || '';
      if (text.indexOf('导出数据') >= 0 || text.indexOf('导入备份') >= 0 || text.indexOf('合并同事') >= 0) {
        btn.style.display = isAdmin ? '' : 'none';
      }
    });
  }
  
  // 如果当前在操作日志标签且切换为普通用户，自动切回新款开发
  if (!isAdmin) {
    var activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'logs') {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
      var devBtn = document.querySelector('[data-tab="dev"]');
      if (devBtn) devBtn.classList.add('active');
      document.getElementById('tab-dev').classList.add('active');
    }
  }
  
  // 隐藏角色选择弹窗
  var overlay = document.getElementById('roleSelectOverlay');
  if (overlay) overlay.style.display = 'none';
  
  if (!silent) {
    toast(isAdmin ? '👑 已切换到管理员模式' : '👤 已切换到普通用户模式');
  }
}

function showRoleSelect() {
  var overlay = document.getElementById('roleSelectOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function idbOpen() {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
function idbSave(data) {
  return new Promise((resolve) => {
    idbOpen().then(db => {
      if (!db) return resolve();
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(data, 'db');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch(e) { resolve(); }
    });
  });
}
function idbLoad() {
  return new Promise((resolve) => {
    idbOpen().then(db => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const get = tx.objectStore(IDB_STORE).get('db');
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => resolve(null);
      } catch(e) { resolve(null); }
    });
  });
}

function saveDB() {
  if (useAPI) {
    fetch('/api/save', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(DB) })
      .then(r => r.json())
      .then(d => { if (d && d.updatedAt) { DB._updatedAt = d.updatedAt; } })
      .catch(e => console.warn('保存到服务器失败', e));
    return;
  }
  const str = JSON.stringify(DB);
  try { localStorage.setItem('gf_cost_db', str); } catch(e) {}
  idbSave(DB);
}

async function loadDB() {
  if (useAPI) {
    try {
      const r = await fetch('/api/load', { headers: apiHeaders() });
      if (r.status === 401) { window.location.href = '/'; return; }
      const txt = await r.text();
      DB = JSON.parse(txt);
      migrateDB();
      return;
    } catch(e) {
      console.warn('从服务器加载失败，改用本地', e);
    }
  }
  let raw = null;
  try { raw = localStorage.getItem('gf_cost_db'); } catch(e) {}
  if (raw) {
    try { DB = JSON.parse(raw); migrateDB(); return; } catch(e) {}
  }
  const fromIdb = await idbLoad();
  if (fromIdb) { DB = fromIdb; migrateDB(); return; }
  
  // 本地无数据时，从内置默认数据加载（通过script标签引入，无CORS问题）
  try {
    if (window.DEFAULT_DATA) {
      DB = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
      migrateDB();
      // 保存到localStorage，下次直接读取
      try { localStorage.setItem('gf_cost_db', JSON.stringify(DB)); } catch(e) {}
      idbSave(DB);
      console.log('已从默认数据初始化工序库');
    }
  } catch(e) {
    console.warn('加载默认数据失败', e);
  }
}

// ═══════════════════════════════════════════════════
// 多端实时同步轮询（每 3 秒检查服务器版本）
// ═══════════════════════════════════════════════════
let syncPollingTimer = null;
let lastSyncedAt = null;
let syncBusy = false;
let isLocalDirty = false;  // 本地有未保存的修改

function markDirty() { isLocalDirty = true; }

function showSyncBar(text, color) {
  const bar = document.getElementById('syncBar');
  if (!bar) return;
  document.getElementById('syncBarText').textContent = text;
  if (color) bar.style.background = color;
  bar.style.display = 'block';
  setTimeout(() => { bar.style.display = 'none'; }, 2500);
}

async function syncFromServer() {
  if (!useAPI || syncBusy) return;
  syncBusy = true;
  try {
    const r = await fetch('/api/sync-check', { headers: apiHeaders() });
    if (r.status === 401) return;
    const d = await r.json();
    if (!d.ok) return;
    // 首次初始化：记录当前服务器时间，下次有更新才同步
    if (lastSyncedAt === null || lastSyncedAt === undefined) {
      lastSyncedAt = d.updatedAt || 0;
      return;
    }
    // 服务器有更新 → 拉取并合并
    if (d.updatedAt && d.updatedAt > lastSyncedAt) {
      const lr = await fetch('/api/load', { headers: apiHeaders() });
      const fresh = await lr.json();
      mergeServerData(fresh, d.updatedBy);
      lastSyncedAt = d.updatedAt;
      DB._updatedAt = d.updatedAt;
      renderManageList();
      renderProcessSelect();
      renderHistory();
      showSyncBar('✓ 已同步【' + (d.updatedBy || '同事') + '】的更新', 'linear-gradient(90deg,#10b981,#059669)');
    }
  } catch(e) {
    // 静默失败
  } finally {
    syncBusy = false;
  }
}

function mergeServerData(fresh, byWho) {
  // 工序：直接采用服务器版本（共享配置）
  if (fresh.processes) {
    DB.processes = fresh.processes;
  }
  // 款式：按 id 合并，避免覆盖本地正在编辑的内容
  if (fresh.styles) {
    const localMap = new Map((DB.styles || []).map(s => [s.id, s]));
    let added = 0, serverNewer = 0;
    fresh.styles.forEach(s => {
      if (!localMap.has(s.id)) {
        // 本地没有 → 添加
        DB.styles.push(s);
        added++;
      } else {
        // 本地有 → 检查服务器版本是否更新
        const local = localMap.get(s.id);
        const localTime = local._localUpdatedAt || 0;
        const serverTime = s._updatedAt || s.createdAt || 0;
        // 如果本地有未保存的修改（_hasUnsavedChanges标记），保留本地
        if (local._hasUnsavedChanges) {
          return;
        }
        // 服务器版本更新 → 采用服务器版本
        if (serverTime > localTime) {
          Object.assign(local, s);
          serverNewer++;
        }
      }
    });
    if (added > 0 || serverNewer > 0) {
      DB.styles.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  }
}

function startSyncPolling() {
  if (!useAPI) { console.log('[同步] 未启用 - 非HTTP协议'); return; }
  if (syncPollingTimer) clearInterval(syncPollingTimer);
  lastSyncedAt = DB._updatedAt || null;
  syncPollingTimer = setInterval(syncFromServer, 3000);
  console.log('[同步] 已启动 - 每3秒轮询');
}

function migrateDB() {
  DB.processes = DB.processes || { pingche: [], zache: [], kanche: [] };
  DB.styles = DB.styles || [];
  DB.styles.forEach(s => { if (!s.status) s.status = 'pending'; });
}

function storageAvailable() {
  try {
    const k = '__gf_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch(e) { return false; }
}

// ===== Tab 切换 =====
// 桌面端 Tab 切换（同时更新手机底部导航）
document.querySelectorAll('.tab-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    var tab=btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active')});
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(function(cc){cc.classList.remove('active')});
    document.getElementById('tab-'+tab).classList.add('active');
    document.querySelectorAll('.mnav-btn').forEach(function(b){b.classList.remove('active')});
    var mnav=document.querySelector('.mnav-btn[data-tab="'+tab+'"]');
    if(mnav)mnav.classList.add('active');
    if(tab==='manage')renderManageList();
    if(tab==='history')renderHistory();
    if(tab==='recycle')renderRecycleBin();
    if(tab==='logs')loadLogs();
  });
});

// 手机底部导航切换
function mobileSwitchTab(tab){
  // viewer 不能切到新款开发/工序管理（已被 init 隐藏）
  if (currentUser && currentUser.role === 'viewer') {
    if (tab === 'dev' || tab === 'manage') {
      var viewerDefaultTab = document.querySelector('.mnav-btn[data-tab="history"]:not([style*="none"])');
      if (viewerDefaultTab) mobileSwitchTab('history');
      return;
    }
  }
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active')});
  document.querySelectorAll('.tab-content').forEach(function(cc){cc.classList.remove('active')});
  document.querySelectorAll('.mnav-btn').forEach(function(b){b.classList.remove('active')});
  var dt=document.querySelector('.tab-btn[data-tab="'+tab+'"]');
  if(dt)dt.classList.add('active');
  var mn=document.querySelector('.mnav-btn[data-tab="'+tab+'"]');
  if(mn)mn.classList.add('active');
  document.getElementById('tab-'+tab).classList.add('active');
  if(tab==='manage')renderManageList();
  if(tab==='history')renderHistory();
  if(tab==='recycle')renderRecycleBin();
  if(tab==='logs')loadLogs();
}

// ===== 工序管理 =====
function switchMachine(type) {
  currentMachine = type;
  document.querySelectorAll('.machine-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.machine-tab.${type}`).classList.add('active');
  renderManageList();
}

function renderManageList() {
  const list = document.getElementById('manageList');
  const searchEl = document.getElementById('manageSearch');
  const kw = searchEl ? searchEl.value.trim().toLowerCase() : '';
  let procs = DB.processes[currentMachine];
  if (kw) procs = procs.filter(p => p.name.toLowerCase().includes(kw));
  if (procs.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#ccc;font-size:14px">' + (kw ? '🔍 无匹配工序' : '暂无工序，点击下方添加') + '</div>';
    return;
  }
  list.innerHTML = procs.map((p) => {
    const realIdx = DB.processes[currentMachine].findIndex(x => x.id === p.id);
    return `
    <div class="process-item">
      <input type="text" value="${escHtml(p.name)}" placeholder="工序名称" onchange="updateProcess(${realIdx},'name',this.value)">
      <div style="display:flex;align-items:center;gap:4px">
        <input type="number" value="${p.price}" min="0" step="0.01" style="width:90px;text-align:right" onchange="updateProcess(${realIdx},'price',parseFloat(this.value)||0)">
        <span class="yuan">元/件</span>
      </div>
      <span style="font-size:12px;color:#aaa">编号: ${p.id}</span>
      <button class="btn-del" data-role-block onclick="deleteProcess(${realIdx})" title="删除">🗑</button>
    </div>
  `;
  }).join('');
}

function addProcess() {
  const name = prompt('输入新工序名称：');
  if (!name || !name.trim()) return;
  const price = parseFloat(prompt('输入单价（元/件）：') || '0') || 0;
  DB.processes[currentMachine].push({
    id: Date.now(),
    name: name.trim(),
    price: price
  });
  saveDB();
  renderManageList();
  renderProcessSelect();
  toast('✅ 工序已添加');
}

function updateProcess(index, field, value) {
  DB.processes[currentMachine][index][field] = value;
  saveDB();
  renderProcessSelect();
}

function deleteProcess(index) {
  if (!confirm('确定删除此工序？')) return;
  DB.processes[currentMachine].splice(index, 1);
  saveDB();
  renderManageList();
  renderProcessSelect();
  toast('🗑 已删除');
}

// ===== 工序选择区 =====
function renderProcessSelect() {
  // 统计每个工序在历史款式中的使用次数
  const usageCount = {};
  DB.styles.forEach(style => {
    (style.selections || []).forEach(item => {
      usageCount[item.name] = (usageCount[item.name] || 0) + 1;
    });
  });

  ['pingche', 'zache', 'kanche'].forEach(type => {
    const container = document.getElementById(`col-${type}`);
    const kw = processFilter.toLowerCase();
    const all = DB.processes[type];
    // 过滤 + 按历史使用频率降序排列，次数相同按名称升序
    const procs = all
      .filter(p => !kw || p.name.toLowerCase().includes(kw))
      .sort((a, b) => {
        const ca = usageCount[a.name] || 0;
        const cb = usageCount[b.name] || 0;
        if (ca !== cb) return cb - ca; // 次数多的在前
        return a.name.localeCompare(b.name, 'zh-CN');
      });
    if (all.length === 0) {
      container.innerHTML = '<div style="padding:12px;text-align:center;color:#ccc;font-size:13px">暂无工序，请先添加</div>';
      return;
    }
    if (procs.length === 0) {
      container.innerHTML = '<div style="padding:12px;text-align:center;color:#ccc;font-size:13px">🔍 无匹配工序</div>';
      return;
    }
    container.innerHTML = procs.map(p => {
      const sel = selectedItems.find(s => s.type === type && s.name === p.name);
      const cnt = usageCount[p.name] || 0;
      const hotBadge = cnt > 0 ? '<span style="margin-left:4px;font-size:10px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:10px">' + cnt + '次</span>' : '';
      return `
        <div class="process-select-item ${sel ? 'selected' : ''}" onclick="toggleProcess(this,'${type}','${escAttr(p.name)}',${p.price})">
          <input type="checkbox" ${sel ? 'checked' : ''} onclick="event.stopPropagation()">
          <span class="pname">${escHtml(p.name)}${hotBadge}</span>
          <span class="pprice">¥${p.price.toFixed(2)}</span>
          ${sel ? `<div class="qty-wrap" onclick="event.stopPropagation()">
            <span style="font-size:12px;color:#888">×</span>
            <input type="number" value="${sel.qty}" min="1" max="999" style="width:45px" onchange="updateQty('${type}','${escAttr(p.name)}',parseInt(this.value)||1)">
          </div>` : ''}
        </div>
      `;
    }).join('');
  });
}

function toggleProcess(el, type, name, price) {
  const idx = selectedItems.findIndex(s => s.type === type && s.name === name);
  if (idx >= 0) {
    selectedItems.splice(idx, 1);
  } else {
    selectedItems.push({ type, name, price, qty: 1 });
  }
  renderProcessSelect();
  renderSelectedTable();
}

function updateQty(type, name, qty) {
  const item = selectedItems.find(s => s.type === type && s.name === name);
  if (item) {
    item.qty = Math.max(1, qty);
    renderSelectedTable();
  }
}

// ── 粘贴导入表格 ──
function handlePasteTable(e) {
  // 让 textarea 正常接收粘贴内容，不做拦截
  setTimeout(() => parsePastedTable(), 100);
}

function parsePastedTable() {
  const text = document.getElementById('pasteArea').value.trim();
  if (!text) { toast('⚠️ 请先粘贴表格数据'); return; }
  
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) { toast('⚠️ 没有解析到数据'); return; }
  
  let imported = 0;
  let addedProcs = 0;
  let skippedHeader = false;
  
  lines.forEach(line => {
    // 支持制表符或连续空格分隔
    const cols = line.split(/\t+|\s{2,}/).map(c => c.trim()).filter(c => c);
    if (cols.length < 2) return; // 至少需要工序名、单价
    
    // 跳过表头行（包含"工序"、"单价"、"种类"等关键字）
    if (!skippedHeader && (cols[0].includes('工序') || cols[0].includes('名称'))) {
      skippedHeader = true;
      return;
    }
    
    // 智能识别列：
    // 格式1: 工序名 | 单价 | 种类（3列）
    // 格式2: 工序名 | 单价（2列，种类从工序名推断）
    
    let procName = cols[0];
    let priceStr = cols[1];
    let typeStr = cols[2] || '';
    
    // 如果第二列不是数字，尝试找数字列
    if (isNaN(parseFloat(priceStr))) {
      const numIdx = cols.findIndex(c => !isNaN(parseFloat(c)) && parseFloat(c) > 0);
      if (numIdx > 0) {
        procName = cols.slice(0, numIdx).join(' ');
        priceStr = cols[numIdx];
        typeStr = cols[numIdx + 1] || '';
      }
    }
    
    if (!procName || !priceStr) return;
    
    const price = parseFloat(priceStr) || 0;
    if (price <= 0) return; // 跳过无效价格
    
    // 识别种类（从typeStr或从工序名推断）
    let type = 'pingche'; // 默认平车
    const typeLower = (typeStr + procName).toLowerCase();
    if (typeLower.includes('扎')) type = 'zache';
    else if (typeLower.includes('坎')) type = 'kanche';
    else if (typeLower.includes('平')) type = 'pingche';
    
    // 检查工序是否已存在（同类型同名）
    const exists = DB.processes[type].some(p => p.name === procName);
    if (!exists) {
      // 自动添加到工序库
      DB.processes[type].push({ id: Date.now() + Math.random(), name: procName, price: price });
      addedProcs++;
    }
    
    // 添加到已选工序
    const existing = selectedItems.find(s => s.name === procName && s.type === type);
    if (!existing) {
      selectedItems.push({ type, name: procName, price, qty: 1 });
      imported++;
    }
  });
  
  saveDB();
  renderProcessSelect();
  renderManageList();
  renderSelectedTable();
  
  const resultEl = document.getElementById('pasteResult');
  resultEl.textContent = `✅ 导入 ${imported} 道工序，新增 ${addedProcs} 个工序到库`;
  resultEl.style.color = '#10b981';
  toast(`✅ 导入完成！新增 ${addedProcs} 个工序`);
  
  // 3秒后清除提示
  setTimeout(() => { resultEl.textContent = ''; }, 5000);
}

// ── 快速新增工序弹窗 ──
let quickAddMachine = 'pingche';

function selectMachineType(el) {
  quickAddMachine = el.dataset.m;
  document.querySelectorAll('.machine-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function openQuickAddProcess() {
  quickAddMachine = currentMachine || 'pingche';
  document.querySelectorAll('.machine-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.m === quickAddMachine);
  });
  document.getElementById('quickProcName').value = '';
  document.getElementById('quickProcPrice').value = '';
  document.getElementById('quickProcMsg').textContent = '';
  document.getElementById('quickProcMsg').className = 'modal-msg';
  document.getElementById('quickAddProcessModal').classList.add('show');
  setTimeout(() => document.getElementById('quickProcName').focus(), 100);
}

function closeQuickAddProcess() {
  document.getElementById('quickAddProcessModal').classList.remove('show');
}

function doQuickAddProcess() {
  const name = document.getElementById('quickProcName').value.trim();
  const price = parseFloat(document.getElementById('quickProcPrice').value);
  const msgEl = document.getElementById('quickProcMsg');

  if (!name) {
    msgEl.textContent = '⚠️ 请输入工序名称';
    msgEl.className = 'modal-msg error';
    document.getElementById('quickProcName').focus();
    return;
  }
  if (price === null || isNaN(price) || price < 0) {
    msgEl.textContent = '⚠️ 请输入正确的单价（≥0）';
    msgEl.className = 'modal-msg error';
    document.getElementById('quickProcPrice').focus();
    return;
  }

  const type = quickAddMachine;
  if (DB.processes[type].some(p => p.name === name)) {
    msgEl.textContent = '⚠️ 「' + name + '」在当前分类中已存在，请勿重复添加';
    msgEl.className = 'modal-msg error';
    return;
  }

  DB.processes[type].push({ id: Date.now(), name, price });
  saveDB();
  toast('✅ 已添加「' + name + '」到' + (type === 'pingche' ? '🚲 平车' : type === 'zache' ? '⚡ 扎车' : '🔪 坎车'));
  closeQuickAddProcess();
  renderProcessSelect();
  // 如果当前工序管理的分类正好是新增的类型，同步刷新
  if (currentMachine === type) renderManageList();
}

// ===== 选中工序明细 =====
function removeSelected(idx) {
  selectedItems.splice(idx, 1);
  renderSelectedTable();
}
function clearAllSelected() {
  if (!selectedItems.length) return;
  if (confirm('确定清空所有已选工序？')) {
    selectedItems = [];
    renderSelectedTable();
  }
}

function renderSelectedTable() {
  const tbody = document.getElementById('selectedBody');
  const typeNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };
  const typeClass = { pingche: 'pingche', zache: 'zache', kanche: 'kanche' };
  const typeOrder = { pingche: 0, zache: 1, kanche: 2 };

  if (selectedItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ccc;padding:30px">还没有选择任何工序</td></tr>';
    document.getElementById('totalMoney').innerHTML = '¥0.00<small> 元</small>';
    document.getElementById('totalCount').textContent = '共 0 道工序';
    document.getElementById('subPingche').textContent = '¥0.00';
    document.getElementById('subZache').textContent = '¥0.00';
    document.getElementById('subKanche').textContent = '¥0.00';
    return;
  }

  // 按 平车→扎车→坎车 顺序分组排序（不改变底层数组，只改变渲染顺序）
  const typeGroupNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };
  const groups = { pingche: [], zache: [], kanche: [] };
  // 记录原始索引（用于删除时定位底层数组）
  const origIndexMap = {};
  selectedItems.forEach((s, origIdx) => {
    const t = s.type || 'pingche';
    if (!groups[t]) groups[t] = [];
    origIndexMap[t + '_' + groups[t].length] = origIdx;
    groups[t].push(s);
  });

  function renderGroup(type, items, startOrigIdx) {
    const label = typeGroupNames[type] || type;
    return items.map((s, i) => {
      const realIdx = selectedItems.indexOf(s); // 用 indexOf 找真实索引（最可靠）
      return `<tr>
        <td>${escHtml(s.name)}</td>
        <td><span class="tag ${typeClass[s.type]||type}">${typeNames[s.type]||label}</span></td>
        <td>${s.qty}</td>
        <td>¥${s.price.toFixed(2)}</td>
        <td>¥${(s.price * s.qty).toFixed(2)}</td>
        <td><button class="btn-del-row" onclick="removeSelected(${realIdx})" title="删除">✕</button></td>
      </tr>`;
    }).join('');
  }

  let html = '';
  ['pingche','zache','kanche'].forEach(type => {
    if (groups[type].length > 0) {
      html += `<tr class="group-header"><td colspan="6">━━━ ${typeGroupNames[type]}（${groups[type].length}道）━━━</td></tr>`;
      html += renderGroup(type, groups[type]);
    }
  });

  tbody.innerHTML = html;

  const total = selectedItems.reduce((sum, s) => sum + s.price * s.qty, 0);
  const subPingche = selectedItems.filter(s => s.type === 'pingche').reduce((sum, s) => sum + s.price * s.qty, 0);
  const subZache   = selectedItems.filter(s => s.type === 'zache').reduce((sum, s) => sum + s.price * s.qty, 0);
  const subKanche  = selectedItems.filter(s => s.type === 'kanche').reduce((sum, s) => sum + s.price * s.qty, 0);
  document.getElementById('totalMoney').innerHTML = `¥${total.toFixed(2)}<small> 元</small>`;
  document.getElementById('totalCount').textContent = `共 ${selectedItems.length} 道工序`;
  document.getElementById('subPingche').textContent = `¥${subPingche.toFixed(2)}`;
  document.getElementById('subZache').textContent = `¥${subZache.toFixed(2)}`;
  document.getElementById('subKanche').textContent = `¥${subKanche.toFixed(2)}`;
}

// ===== 图片处理 =====
function imgChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    currentImgs[currentImgIndex] = ev.target.result;
    renderImgGrid();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function renderImgGrid() {
  const grid = document.getElementById('imgGrid');
  grid.innerHTML = currentImgs.map((src, i) => {
    return `<div class="img-upload-box" id="imgSlot${i}"
      ondragover="onImgDragOver(event,${i})"
      ondragenter="onImgDragEnter(event,${i})"
      ondragleave="onImgDragLeave(event,${i})"
      ondrop="onImgDrop(event,${i})"
      onclick="openImgSlot(${i})"
    >
      ${src
        ? `<img src="${src}" alt="图${i+1}" style="width:100%;height:100%;object-fit:cover;cursor:zoom-in" onclick="event.stopPropagation(); openLightbox(currentImgs[${i}], currentImgs, ${i})"><button class="del-img" onclick="event.stopPropagation(); delImgSlot(${i})">✕</button><button class="replace-img" onclick="event.stopPropagation(); openImgSlot(${i})" title="更换图片">🔄</button>`
        : `<div class="placeholder"><span class="icon">📷</span><span>第${i+1}张<br><span style="font-size:11px;color:#bbb">点击或拖入或Ctrl+V粘贴</span></span></div>`}
    </div>`;
  }).join('');
}

// ── 拖拽上传 ──
function onImgDragOver(e, i) {
  e.preventDefault();
  e.stopPropagation();
}
function onImgDragEnter(e, i) {
  e.preventDefault();
  e.stopPropagation();
  const el = document.getElementById('imgSlot' + i);
  if (el) el.classList.add('drag-over');
}
function onImgDragLeave(e, i) {
  e.preventDefault();
  e.stopPropagation();
  const el = document.getElementById('imgSlot' + i);
  if (el) el.classList.remove('drag-over');
}
function onImgDrop(e, i) {
  e.preventDefault();
  e.stopPropagation();
  const el = document.getElementById('imgSlot' + i);
  if (el) el.classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  if (!file.type.startsWith('image/')) {
    toast('⚠️ 请拖入图片文件');
    return;
  }
  // 限制大小 10MB
  if (file.size > 10 * 1024 * 1024) {
    toast('⚠️ 图片大小不能超过 10MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(ev) {
    currentImgs[i] = ev.target.result;
    renderImgGrid();
    toast('✅ 第' + (i+1) + '张图片已上传');
  };
  reader.readAsDataURL(file);
}

function openImgSlot(i) {
  currentImgIndex = i;
  document.getElementById('imgInput').click();
}

// ── 粘贴上传图片 ──
document.addEventListener('paste', function(e) {
  // 如果当前焦点在 textarea 或 input 中，不拦截图片粘贴
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
    return;
  }
  
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      // 优先填充当前选中的槽位；若已有图则找第一个空槽
      let targetIdx = currentImgIndex;
      if (currentImgs[targetIdx]) {
        targetIdx = currentImgs.findIndex(s => !s);
        if (targetIdx < 0) { toast('⚠️ 4个图片槽已满，请先删除一张图片'); return; }
      }
      const reader = new FileReader();
      reader.onload = function(ev) {
        currentImgs[targetIdx] = ev.target.result;
        renderImgGrid();
        toast('📷 第' + (targetIdx + 1) + '张图片已粘贴');
      };
      reader.readAsDataURL(file);
      return;
    }
  }
});

function delImgSlot(i) {
  currentImgs[i] = null;
  renderImgGrid();
}

// ===== 款式日期 =====
function setStyleDate() {
  const now = new Date();
  document.getElementById('styleDate').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
}

// ===== 保存款式 =====
function saveStyle() {
  const name = document.getElementById('styleName').value.trim();
  if (!name) { toast('⚠️ 请填写款号/款名'); return; }
  if (selectedItems.length === 0) { toast('⚠️ 请至少选择一个工序'); return; }

  const existIdx = DB.styles.findIndex(s => s.id === (currentStyleId || Date.now()));
  const isNew = existIdx < 0;
  const existing = existIdx >= 0 ? DB.styles[existIdx] : null;
  const style = {
    id: currentStyleId || Date.now(),
    name: name,
    note: document.getElementById('styleNote').value.trim(),
    status: document.getElementById('styleStatus').value,
    date: document.getElementById('styleDate').value,
    imgs: [...currentImgs],
    selections: JSON.parse(JSON.stringify(selectedItems)),
    // 记录创建人（新建时写入，编辑时保留原创建人）
    createdBy: isNew
      ? (currentUser ? { uid: currentUser.uid || currentUser.id, username: currentUser.username } : null)
      : (existing ? existing.createdBy : null),
    // 编辑时保留原审批人，新建时为空
    approvedBy: existing ? existing.approvedBy : null,
  };

  // 【重要】保存前先同步服务器最新数据，避免覆盖同事刚保存的款式
  if (useAPI) {
    fetch('/api/load', { headers: apiHeaders() })
      .then(r => r.json())
      .then(fresh => {
        // 合并服务器最新数据到本地（只添加本地没有的款式）
        if (fresh.styles) {
          const localIds = new Set(DB.styles.map(s => s.id));
          fresh.styles.forEach(s => {
            if (!localIds.has(s.id)) {
              DB.styles.push(s);
            }
          });
        }
        // 同步工序库
        if (fresh.processes) {
          DB.processes = fresh.processes;
        }
        // 现在执行保存逻辑
        doSaveStyle(style, existIdx, isNew, name);
      })
      .catch(e => {
        console.error('保存前同步失败', e);
        // 网络失败时仍然保存（避免数据丢失）
        doSaveStyle(style, existIdx, isNew, name);
      });
  } else {
    doSaveStyle(style, existIdx, isNew, name);
  }
}

function doSaveStyle(style, existIdx, isNew, name) {
  if (existIdx >= 0) {
    DB.styles[existIdx] = style;
    toast('✅ 款式已更新');
  } else {
    DB.styles.unshift(style);
    currentStyleId = style.id;
    toast('✅ 款式已保存');
  }

  saveDB();
  if (!storageOK) autoBackup();
  renderHistory();  // 同步历史款式列表
  // 注：保存动作由服务端 /api/save 统一记录日志（含改前/改后对比），此处不再重复记录
  // 保存后自动刷新新款开发界面（编辑时保留表单，新建时清空）
  if (isNew) {
    // 确保停在「新款开发」标签页
    const devBtn = document.querySelector('[data-tab="dev"]');
    if (devBtn && !devBtn.classList.contains('active')) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      devBtn.classList.add('active');
      document.getElementById('tab-dev').classList.add('active');
    }
    // 清空表单，准备下一款
    currentStyleId = null;
    currentImgs = [null];
    selectedItems = [];
    document.getElementById('styleName').value = '';
    document.getElementById('styleNote').value = '';
    document.getElementById('styleStatus').value = 'pending';
    document.getElementById('imgInput').value = '';
    setStyleDate();
    renderImgGrid();
    renderProcessSelect();
    renderSelectedTable();
    // 把光标放到款号框
    setTimeout(function() {
      const inp = document.getElementById('styleName');
      if (inp) inp.focus();
    }, 100);
    toast('✅ 已保存「' + name + '」，请输入下一款');
  } else {
    // 编辑更新：保持当前界面，仅刷新历史列表
    toast('✅ 已更新「' + name + '」');
  }
}

// ─── 客户端日志 ───
function clientLog(action, detail) {
  if (!useAPI) return; // 本地模式不上传日志
  fetch('/api/log', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ action, detail }) })
    .catch(() => {});
}

async function loadLogs(fresh) {
  if (!useAPI) {
    document.getElementById('logsList').innerHTML = '<div class="no-data">本地模式无日志（需连接服务器）</div>';
    return;
  }
  const uid = document.getElementById('logUserFilter').value;
  const action = document.getElementById('logActionFilter').value;
  const keyword = document.getElementById('logKeyword').value.trim();
  const days = document.getElementById('logTimeFilter').value;

  // 确保变量已初始化
  if (typeof window._logPage === 'undefined') window._logPage = 0;
  if (typeof window._logAll === 'undefined') window._logAll = [];

  if (fresh) {
    window._logPage = 0;
    window._logAll = [];
    document.getElementById('logsList').innerHTML = '<div style="text-align:center;padding:40px;color:#888">⏳ 加载中…</div>';
  }

  const PAGE = 30;
  const skip = window._logPage * PAGE;
  try {
    const params = new URLSearchParams();
    if (uid) params.set('uid', uid);
    if (action) params.set('action', action);
    if (days && days !== '0') params.set('days', days);
    params.set('skip', skip);
    params.set('limit', PAGE + 1); // 多拉一条判断是否有更多
    const r = await fetch('/api/logs?' + params.toString(), { headers: apiHeaders() });
    const d = await r.json();
    if (!d.ok) { toast(d.msg || '加载日志失败'); return; }

    let items = d.logs || [];
    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(l => (l.detail || '').toLowerCase().includes(kw) || (l.username || '').toLowerCase().includes(kw));
    }

    const hasMore = items.length > PAGE;
    if (hasMore) items = items.slice(0, PAGE);

    window._logAll = window._logAll.concat(items);
    window._logPage++;

    // 填充用户下拉（仅首次）
    const userSel = document.getElementById('logUserFilter');
    if (userSel.options.length <= 1 && d.allLogs && d.allLogs.length > 0) {
      const users = [...new Set(d.allLogs.map(l => l.uid))];
      const userMap = {};
      d.allLogs.forEach(l => { userMap[l.uid] = l.username; });
      users.sort().forEach(u => {
        const opt = document.createElement('option');
        opt.value = u; opt.textContent = '👤 ' + (userMap[u] || u);
        userSel.appendChild(opt);
      });
    }

    renderLogs(window._logAll, d.total, hasMore);
  } catch (e) {
    toast('加载日志失败：' + e.message);
  }
}

function renderLogs(items, total, hasMore) {
  const list = document.getElementById('logsList');
  if (!items || items.length === 0) {
    list.innerHTML = '<div class="no-data">📭 暂无日志记录</div>';
    document.getElementById('logTotal').textContent = '';
    document.getElementById('loadMoreLogs').style.display = 'none';
    return;
  }

  const actionNames = {
    login: '🔓 登录', logout: '🔒 退出', register: '📝 注册',
    save_style: '💾 保存款式', update_style: '✏️ 更新款式',
    delete_style: '🗑️ 删除款式', approve: '✅ 通过审批', reject: '↩️ 退回审批',
    clear_history: '🗑️ 清空款式', import: '📂 导入备份', merge: '🔄 合并数据',
    export: '💾 导出数据', clear_logs: '🗑️ 清空日志',
    restore_style: '♻️ 恢复款式', permanent_delete: '🔥 彻底删除', empty_recycle: '🗑️ 清空回收站'
  };

  // 按日期分组
  const groups = {};
  items.forEach(l => {
    const d = new Date(l.time);
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const itemDay = new Date(d); itemDay.setHours(0,0,0,0);
    let label;
    if (itemDay.getTime() === today.getTime()) label = '📅 今天';
    else if (itemDay.getTime() === yesterday.getTime()) label = '📅 昨天';
    else label = '📅 ' + d.toLocaleDateString('zh-CN', { month:'short', day:'numeric', weekday:'short' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(l);
  });

  const timeLabel = function(ts) {
    const d = new Date(ts);
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + '分钟前';
    if (hours < 24) return hours + '小时前';
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  let html = '';
  Object.keys(groups).forEach(label => {
    html += '<div class="log-date-group">';
    html += '<div class="log-date-label">' + label + ' <span style="font-weight:400;font-size:12px;color:#999">（' + groups[label].length + '条）</span></div>';
    groups[label].forEach(l => {
      const act = actionNames[l.action] || ('⚙️ ' + l.action);
      const actColor = l.action.includes('delete') || l.action === 'clear_logs' || l.action === 'permanent_delete' ? '#dc2626'
        : l.action.includes('save') || l.action.includes('restore') ? '#10b981'
        : l.action === 'approve' ? '#4361ee'
        : l.action === 'reject' ? '#f59e0b'
        : '#6b7280';
      html += '<div class="log-item">' +
        '<div class="log-item-left">' +
          '<div class="log-user">👤 <b>' + (l.username || '未知') + '</b></div>' +
          '<div class="log-detail">' + (l.detail || '-') + '</div>' +
        '</div>' +
        '<div class="log-item-right">' +
          '<div class="log-action" style="color:' + actColor + '">' + act + '</div>' +
          '<div class="log-time">' + timeLabel(l.time) + '</div>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  });

  list.innerHTML = html;

  // 总数显示
  const shown = items.length;
  document.getElementById('logTotal').textContent = '（显示 ' + shown + ' / 共 ' + total + ' 条）';

  // 加载更多
  const moreEl = document.getElementById('loadMoreLogs');
  const moreCountEl = document.getElementById('loadMoreCount');
  if (hasMore) {
    moreCountEl.textContent = Math.min(total - shown, PAGE);
    moreEl.style.display = 'block';
  } else {
    moreEl.style.display = 'none';
  }
}

var PAGE = 30;

async function clearLogs() {
  if (!confirm('确定清空所有日志？此操作不可恢复。')) return;
  try {
    const r = await fetch('/api/logs/clear', { method: 'POST', headers: apiHeaders() });
    const d = await r.json();
    if (d.ok) {
      toast('已清空 ' + d.cleared + ' 条日志');
      loadLogs();
    } else {
      toast(d.msg || '清空失败');
    }
  } catch (e) {
    toast('清空失败：' + e.message);
  }
}

// ===== 加载款式 =====
function loadStyle(style) {
  currentStyleId = style.id;
  currentImgs = [...(style.imgs || [null])];
  selectedItems = JSON.parse(JSON.stringify(style.selections || []));
  renderImgGrid();

  document.getElementById('styleName').value = style.name;
  document.getElementById('styleNote').value = style.note || '';
  document.getElementById('styleStatus').value = style.status || 'pending';
  document.getElementById('styleDate').value = style.date || '';

  renderImgGrid();

  renderProcessSelect();
  renderSelectedTable();

  // 切换到开发tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-tab="dev"]').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-dev').classList.add('active');

  closeDetail();
}

// ===== 清空当前款式 =====
function clearStyle() {
  if (!confirm('确定清空当前款式？')) return;
  currentStyleId = null;
  currentImgs = [null];
  selectedItems = [];
  document.getElementById('styleName').value = '';
  document.getElementById('styleNote').value = '';
  document.getElementById('styleStatus').value = 'pending';
  document.getElementById('imgInput').value = '';
  setStyleDate();
  renderImgGrid();
  renderProcessSelect();
  renderSelectedTable();
  toast('🗑 已清空');
}

// ===== 历史款式 =====
function renderHistory() {
  const list = document.getElementById('historyList');
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = DB.styles.filter(s =>
    !q || s.name.toLowerCase().includes(q) || (s.note && s.note.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-data">📭 暂无保存的款式<br><span style="font-size:13px">在新款开发中保存款式后会自动出现在这里</span></div>';
    return;
  }

  const typeNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };
  function itemHtml(s) {
    const sels = s.selections || [];
    const total = sels.reduce((sum, it) => sum + it.price * it.qty, 0);
    const sub = { pingche: 0, zache: 0, kanche: 0 };
    sels.forEach(it => { if (sub[it.type] !== undefined) sub[it.type] += it.price * it.qty; });
    const procNames = sels.map(it => typeNames[it.type]).join(' / ');
    const cb = s.createdBy ? '<span style="color:#888;font-size:12px">👤 ' + escHtml(s.createdBy.username||'') + '</span>' : '';
    const ab = s.approvedBy ? '<span style="color:#06d6a0;font-size:12px">✅ ' + escHtml(s.approvedBy.username||'') + '</span>' : '';
    const badge = s.status === 'approved'
      ? '<span class="status-badge approved">✅ 已审批</span>'
      : '<span class="status-badge pending">⏳ 待审批</span>';
    return `
      <div class="history-item" onclick="showDetail('${s.id}')">
        <img class="himg" src="${(s.imgs && s.imgs[0]) || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%23eee%22 width=%2280%22 height=%2280%22/><text x=%2240%22 y=%2245%22 text-anchor=%22middle%22 fill=%22%23ccc%22 font-size=%2212%22>无图</text></svg>'}" alt="款式图">
        <div class="hinfo">
          <div class="hname">${escHtml(s.name)}${badge}</div>
          <div class="hdate" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span>📅 ${s.date}</span>
            ${cb ? '<span style="color:#888;font-size:11px">👤 ' + escHtml(s.createdBy.username||'') + ' 创建</span>' : ''}
            ${ab ? '<span style="color:#06d6a0;font-size:11px">✅ ' + escHtml(s.approvedBy.username||'') + ' 审批</span>' : ''}
            ${s.note ? '<span style="color:#aaa;font-size:11px">· ' + escHtml(s.note) + '</span>' : ''}
          </div>
          <div class="hprocs">🔧 ${procNames || '无工序'} · ${sels.length} 道工序</div>
          <div class="hprocs" style="color:#e94560;font-weight:600">💰 平车 ¥${sub.pingche.toFixed(2)} · 扎车 ¥${sub.zache.toFixed(2)} · 坎车 ¥${sub.kanche.toFixed(2)}</div>
        </div>
        <div class="htotal">¥${total.toFixed(2)}</div>
        <button class="del-history" data-role-block onclick="event.stopPropagation(); deleteHistory('${s.id}')" title="删除">✕</button>
      </div>
    `;
  }

  const pendings = filtered.filter(s => s.status !== 'approved');
  const approved = filtered.filter(s => s.status === 'approved');
  let html = '';
  if (pendings.length) {
    html += `<div class="history-group-title">⏳ 待审批（${pendings.length}）</div>` + pendings.map(itemHtml).join('');
  }
  if (approved.length) {
    html += `<div class="history-group-title approved">✅ 已审批（${approved.length}）</div>` + approved.map(itemHtml).join('');
  }
  list.innerHTML = html;
}

function showDetail(id) {
  currentHistoryId = id;
  const style = DB.styles.find(s => s.id == id);
  if (!style) return;

  const typeNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };
  const typeClass = { pingche: 'pingche', zache: 'zache', kanche: 'kanche' };
  const total = (style.selections || []).reduce((sum, it) => sum + it.price * it.qty, 0);
  const sub = { pingche: 0, zache: 0, kanche: 0 };
  (style.selections || []).forEach(it => { if (sub[it.type] !== undefined) sub[it.type] += it.price * it.qty; });

  document.getElementById('detailContent').innerHTML = `
    <div style="display:flex;gap:16px;margin-bottom:14px;align-items:flex-start">
      ${(style.imgs && style.imgs.some(Boolean)) ? `<div class="img-grid detail-imgs" style="width:120px;flex-shrink:0">${style.imgs.map((src,i) => src ? `<img src="${src}" data-lb-src="${src}" data-lb-imgs="${encodeURIComponent(JSON.stringify(style.imgs||[]))}" data-lb-idx="${i}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid #eee;cursor:zoom-in">` : '').join('')}</div>` : '<div style="width:120px;height:120px;border-radius:10px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:13px;flex-shrink:0">无图</div>'}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:17px;font-weight:700;color:#1a1a2e">${escHtml(style.name)}</span>
          <span style="font-size:12px;padding:2px 10px;border-radius:20px;font-weight:600;${style.status === 'approved' ? 'background:#dcfce7;color:#16a34a' : 'background:#fef9c3;color:#a16207'}">${style.status === 'approved' ? '✅ 已审批' : '⏳ 待审批'}</span>
          ${style.note ? '<span style="font-size:12px;padding:2px 10px;border-radius:20px;background:#f3f4f6;color:#6b7280;max-width:140px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" title="' + escAttr(style.note||'') + '">📝 ' + escHtml(style.note) + '</span>' : ''}
          <span style="font-size:12px;color:#6b7280;margin-left:4px">📅 ${style.date}</span>
          ${style.createdBy ? '<span style="font-size:12px;color:#6b7280">👤 ' + escHtml(style.createdBy.username||'') + '</span>' : ''}
          ${style.approvedBy ? '<span style="font-size:12px;color:#16a34a">✅ ' + escHtml(style.approvedBy.username||'') + '</span>' : ''}
          <span class="detail-chip" style="font-size:11px;color:#fff;padding:2px 10px;border-radius:20px;background:#4361ee">平车 ¥${sub.pingche.toFixed(2)}</span>
          <span class="detail-chip" style="font-size:11px;color:#fff;padding:2px 10px;border-radius:20px;background:#10b981">扎车 ¥${sub.zache.toFixed(2)}</span>
          <span class="detail-chip" style="font-size:11px;color:#fff;padding:2px 10px;border-radius:20px;background:#f59e0b">坎车 ¥${sub.kanche.toFixed(2)}</span>
          <span style="font-size:15px;font-weight:700;color:#e94560;margin-left:4px" id="detailTotalHeader">¥${total.toFixed(2)} 元</span>
        </div>
      </div>
    </div>
    <table class="selected-table">
      <thead><tr>
        <th style="min-width:80px">工序</th>
        <th style="width:70px">类型</th>
        <th style="width:46px;text-align:center">数量</th>
        <th style="width:70px">单价</th>
        <th style="width:80px">小计</th>
        <th style="width:50px;text-align:center">
          ${currentUser && currentUser.role === 'viewer' ? '' : '<button id="addDetailProcBtn" onclick="addDetailProcess()" style="padding:3px 10px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">➕</button>'}
        </th>
      </tr></thead>
      <tbody>
        ${(style.selections || []).map((s, idx) => `
          <tr data-idx="${idx}">
            <td>
              <div class="proc-search-wrap" style="position:relative">
                <input type="text" id="pdi-${idx}" class="cell-edit" value="${escAttr(s.name)}"
                  ${currentUser && currentUser.role === 'viewer' ? 'disabled' : ''}
                  autocomplete="off"
                  placeholder="${escAttr(s.name) || '搜索工序…'}"
                  onfocus="openProcDropdown(${idx})"
                  oninput="filterProcDropdown(${idx}, this.value)"
                  onkeydown="if(event.key==='Enter'){const fi=document.getElementById('pdd-${idx}');if(fi&&fi.children[0])fi.children[0].click()}else if(event.key==='Escape')closeProcDropdown(${idx})"
                  onchange="updateDetailField(${idx}, 'name', this.value)">
                <div id="pdd-${idx}" class="proc-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:9999;max-height:220px;overflow-y:auto"></div>
              </div>
            </td>
            <td><select class="type-edit" ${currentUser && currentUser.role === 'viewer' ? 'disabled' : ''} onchange="updateDetailField(${idx}, 'type', this.value)">
              <option value="pingche" ${s.type==='pingche'?'selected':''}>平车</option>
              <option value="zache" ${s.type==='zache'?'selected':''}>扎车</option>
              <option value="kanche" ${s.type==='kanche'?'selected':''}>坎车</option>
            </select></td>
            <td><input type="number" class="cell-edit qty-edit" value="${s.qty}" min="0" ${currentUser && currentUser.role === 'viewer' ? 'disabled' : ''} onchange="updateDetailField(${idx}, 'qty', this.value)"></td>
            <td><input type="number" class="price-edit" value="${s.price.toFixed(2)}" min="0" step="0.01" ${currentUser && currentUser.role === 'viewer' ? 'disabled' : ''} onchange="updateDetailPrice(${idx}, this.value)"></td>
            <td class="subtotal">¥${(s.price * s.qty).toFixed(2)}</td>
            <td style="text-align:center">
              ${currentUser && currentUser.role === 'viewer' ? '' : '<button onclick="removeDetailRow(' + idx + ',' + idx + ')" style="padding:3px 8px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">✕</button>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tbody id="detailExtraRows"></tbody>
    </table>
  `;
  const ab = document.getElementById('approveBtn');
  ab.textContent = style.status === 'approved' ? '↩ 退回待审批' : '✅ 通过审批';
  ab.className = 'btn-action ' + (style.status === 'approved' ? 'clear' : 'save');
  document.getElementById('detailModal').classList.add('show');

  // 新增行计数（全局，与 pdi-/pdd- id 配合）
  window._detailNewRowCount = (window._detailNewRowCount || 0);
}

// ── 款式详情内添加工序行 ─────────────────────────────
function addDetailProcess() {
  if (currentUser && currentUser.role === 'viewer') return;
  const style = DB.styles.find(s => s.id == currentHistoryId);
  if (!style) return;
  if (!style.selections) style.selections = [];

  const newIdx = style.selections.length;
  const uid = '_new' + (++window._detailNewRowCount);
  // 插入默认值
  style.selections.push({ name: '', type: 'pingche', qty: 1, price: 0 });

  // 渲染新行追加到 tbody#detailExtraRows
  const extra = document.getElementById('detailExtraRows');
  if (!extra) return;
  extra.insertAdjacentHTML('beforeend', buildDetailRowHtml(newIdx, uid, style.selections[newIdx]));
  // 聚焦新行的工序名输入框
  const inp = document.getElementById('pdi-' + uid);
  if (inp) inp.focus();
}

function buildDetailRowHtml(idx, uid, s) {
  var isViewer = !!(currentUser && currentUser.role === "viewer");
  var dis = isViewer ? " disabled" : "";
  var u = uid;
  var nameCell = "<div class=\"proc-search-wrap\" style=\"position:relative\">" +
    "<input type=\"text\" id=\"pdi-" + u + "\" class=\"cell-edit\" value=\"" + (s.name ? s.name.replace(/"/g, "&quot;") : "") + "\" " + dis + " autocomplete=\"off\" placeholder=\"搜索或新建工序…\" " +
    "onfocus=\"openProcDropdown('" + u + "')\" " +
    "oninput=\"filterProcDropdown('" + u + "', this.value)\" " +
    "onkeydown=\"var fi=document.getElementById('pdd-'+'" + u + "');if(event.key==='Enter'&&fi&&fi.children[0])fi.children[0].click();if(event.key==='Escape')closeProcDropdown('" + u + "')\" " +
    "onchange=\"updateDetailField(" + idx + ", 'name', this.value)\">" +
    "<div id=\"pdd-" + u + "\" class=\"proc-dropdown\" style=\"display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:9999;max-height:220px;overflow-y:auto\"></div>" +
    "</div>";
  var typeSel = "<select class=\"type-edit\"" + dis + " onchange=\"updateDetailField(" + idx + ", 'type', this.value)\">" +
    "<option value=\"pingche\">平车</option><option value=\"zache\">扎车</option><option value=\"kanche\">坎车</option></select>";
  var qtyInp = "<input type=\"number\" class=\"cell-edit qty-edit\" value=\"" + s.qty + "\" min=\"0\"" + dis + " onchange=\"updateDetailField(" + idx + ", 'qty', this.value)\">";
  var priceInp = "<input type=\"number\" class=\"price-edit\" value=\"" + s.price.toFixed(2) + "\" min=\"0\" step=\"0.01\"" + dis + " onchange=\"updateDetailPrice(" + idx + ", this.value)\">";
  var subtotal = "<td class=\"subtotal\">¥" + (s.price * s.qty).toFixed(2) + "</td>";
  var delBtn = isViewer ? "" : "<button onclick=\"removeDetailRow('" + u + "'," + idx + ")\" style=\"padding:3px 8px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px\">✕</button>";
  return "<tr data-idx=\"" + idx + "\" data-uid=\"" + u + "\">" +
    "<td>" + nameCell + "</td>" +
    "<td>" + typeSel + "</td>" +
    "<td>" + qtyInp + "</td>" +
    "<td>" + priceInp + "</td>" +
    subtotal +
    "<td style=\"text-align:center\">" + delBtn + "</td>" +
    "</tr>";
}

// 删除款式详情内某一行（重渲染整个表格，保证索引一致）
function removeDetailRow(uid, idx) {
  if (currentUser && currentUser.role === 'viewer') return;
  var style = DB.styles.find(function(s){ return s.id == currentHistoryId; });
  if (!style || !style.selections) return;

  // 找并移除 DOM 行
  var tr_uid = document.querySelector('tr[data-uid="' + uid + '"]');
  var tr_idx = document.querySelector('tr[data-idx="' + idx + '"]:not([data-uid])');
  if (tr_uid) tr_uid.remove();
  else if (tr_idx) tr_idx.remove();

  // 从数据中删除（splice 会导致后续行索引变化，所以要重渲染）
  style.selections.splice(idx, 1);

  // 重渲染整个 tbody（原始行 + 新增行）
  var tbody = document.querySelector('#detailContent tbody:not(#detailExtraRows)');
  var extra = document.getElementById('detailExtraRows');
  var isViewer = !!(currentUser && currentUser.role === 'viewer');

  if (tbody) {
    tbody.innerHTML = style.selections.map(function(s, i) {
      var sub = (s.price * s.qty).toFixed(2);
      var dis = isViewer ? ' disabled' : '';
      // 工序名单元格（搜索下拉）
      var nameCell = "<div class=\"proc-search-wrap\" style=\"position:relative\">" +
        "<input type=\"text\" id=\"pdi-" + i + "\" class=\"cell-edit\" value=\"" + (s.name ? s.name.replace(/"/g, "&quot;") : "") + "\" " + dis + " autocomplete=\"off\" placeholder=\"" + (s.name ? s.name : "搜索工序…") + "\" " +
        "onfocus=\"openProcDropdown(" + i + ")\" " +
        "oninput=\"filterProcDropdown(" + i + ", this.value)\" " +
        "onkeydown=\"var fi=document.getElementById('pdd-'+'" + i + "');if(event.key==='Enter'&&fi&&fi.children[0])fi.children[0].click();if(event.key==='Escape')closeProcDropdown(" + i + ")\" " +
        "onchange=\"updateDetailField(" + i + ", 'name', this.value)\">" +
        "<div id=\"pdd-" + i + "\" class=\"proc-dropdown\" style=\"display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:9999;max-height:220px;overflow-y:auto\"></div></div>";
      var typeSel = "<select class=\"type-edit\"" + dis + " onchange=\"updateDetailField(" + i + ", 'type', this.value)\">" +
        "<option value=\"pingche\" " + (s.type==='pingche'?'selected':'') + ">平车</option>" +
        "<option value=\"zache\" " + (s.type==='zache'?'selected':'') + ">扎车</option>" +
        "<option value=\"kanche\" " + (s.type==='kanche'?'selected':'') + ">坎车</option></select>";
      var qtyInp = "<input type=\"number\" class=\"cell-edit qty-edit\" value=\"" + s.qty + "\" min=\"0\"" + dis + " onchange=\"updateDetailField(" + i + ", 'qty', this.value)\">";
      var priceInp = "<input type=\"number\" class=\"price-edit\" value=\"" + s.price + "\" min=\"0\" step=\"0.01\"" + dis + " onchange=\"updateDetailPrice(" + i + ", this.value)\">";
      var delBtn = isViewer ? "" : "<button onclick=\"removeDetailRow(" + i + "," + i + ")\" style=\"padding:3px 8px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px\">✕</button>";
      return "<tr data-idx=\"" + i + "\">" +
        "<td>" + nameCell + "</td>" +
        "<td>" + typeSel + "</td>" +
        "<td>" + qtyInp + "</td>" +
        "<td>" + priceInp + "</td>" +
        "<td class=\"subtotal\">¥" + sub + "</td>" +
        "<td style=\"text-align:center\">" + delBtn + "</td>" +
        "</tr>";
    }).join('');
  }
  // 重渲染新增行（detailExtraRows），索引更新为删后位置
  if (extra) {
    // 收集新增行的uid（splice前记录）
    var extraRows = Array.prototype.slice.call(extra.querySelectorAll('tr[data-uid]'));
    extra.innerHTML = extraRows.map(function(tr) {
      var uid = tr.getAttribute('data-uid');
      var newSelIdx = style.selections.length + extraRows.indexOf(tr);
      var isViewerV = !!(currentUser && currentUser.role === 'viewer');
      var disV = isViewerV ? ' disabled' : '';
      var inp0 = tr.querySelector('input[id^="pdi-"]');
      var sel0 = tr.querySelector('select.type-edit');
      var qty0 = tr.querySelector('input.qty-edit');
      var price0 = tr.querySelector('input.price-edit');
      var s2 = {
        name: inp0 ? inp0.value : '',
        type: sel0 ? sel0.value : 'pingche',
        qty: qty0 ? (parseFloat(qty0.value) || 1) : 1,
        price: price0 ? (parseFloat(price0.value) || 0) : 0
      };
      var nc = "<div class=\"proc-search-wrap\" style=\"position:relative\">" +
        "<input type=\"text\" id=\"pdi-" + uid + "\" class=\"cell-edit\" value=\"" + (s2.name ? s2.name.replace(/"/g, "&quot;") : "") + "\" " + disV + " autocomplete=\"off\" placeholder=\"搜索或新建工序…\" " +
        "onfocus=\"openProcDropdown('" + uid + "')\" " +
        "oninput=\"filterProcDropdown('" + uid + "', this.value)\" " +
        "onkeydown=\"var fi=document.getElementById('pdd-'+'" + uid + "');if(event.key==='Enter'&&fi&&fi.children[0])fi.children[0].click();if(event.key==='Escape')closeProcDropdown('" + uid + "')\" " +
        "onchange=\"updateDetailField(" + newSelIdx + ", 'name', this.value)\">" +
        "<div id=\"pdd-" + uid + "\" class=\"proc-dropdown\" style=\"display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:9999;max-height:220px;overflow-y:auto\"></div></div>";
      var ts = "<select class=\"type-edit\"" + disV + " onchange=\"updateDetailField(" + newSelIdx + ", 'type', this.value)\">" +
        "<option value=\"pingche\" " + (s2.type==='pingche'?'selected':'') + ">平车</option>" +
        "<option value=\"zache\" " + (s2.type==='zache'?'selected':'') + ">扎车</option>" +
        "<option value=\"kanche\" " + (s2.type==='kanche'?'selected':'') + ">坎车</option></select>";
      var qi = "<input type=\"number\" class=\"cell-edit qty-edit\" value=\"" + s2.qty + "\" min=\"0\"" + disV + " onchange=\"updateDetailField(" + newSelIdx + ", 'qty', this.value)\">";
      var pi = "<input type=\"number\" class=\"price-edit\" value=\"" + s2.price + "\" min=\"0\" step=\"0.01\"" + disV + " onchange=\"updateDetailPrice(" + newSelIdx + ", this.value)\">";
      var db = isViewerV ? "" : "<button onclick=\"removeDetailRow('" + uid + "'," + newSelIdx + ")\" style=\"padding:3px 8px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px\">✕</button>";
      return "<tr data-idx=\"" + newSelIdx + "\" data-uid=\"" + uid + "\">" +
        "<td>" + nc + "</td>" +
        "<td>" + ts + "</td>" +
        "<td>" + qi + "</td>" +
        "<td>" + pi + "</td>" +
        "<td class=\"subtotal\">¥" + (s2.price * s2.qty).toFixed(2) + "</td>" +
        "<td style=\"text-align:center\">" + db + "</td></tr>";
    }).join('');
  }

  // 重算合计
  var total = style.selections.reduce(function(sum, it){ return sum + it.price * it.qty; }, 0);
  var sub2 = { pingche: 0, zache: 0, kanche: 0 };
  style.selections.forEach(function(it){ if (sub2[it.type] !== undefined) sub2[it.type] += it.price * it.qty; });
  var th = document.getElementById('detailTotalHeader');
  if (th) th.textContent = '¥' + total.toFixed(2) + ' 元';
  // 更新三色小计chips
  var chips = document.querySelectorAll('#detailContent .detail-chip');
  if (chips[0]) chips[0].textContent = '平车 ¥' + sub2.pingche.toFixed(2);
  if (chips[1]) chips[1].textContent = '扎车 ¥' + sub2.zache.toFixed(2);
  if (chips[2]) chips[2].textContent = '坎车 ¥' + sub2.kanche.toFixed(2);
}


// 历史款式详情内直接修改工价
// 历史款式详情内直接修改（工序名称/类型/数量/单价）
function updateDetailField(idx, field, val) {
  if (currentUser && currentUser.role === 'viewer') return;
  const style = DB.styles.find(s => s.id == currentHistoryId);
  if (!style || !style.selections || !style.selections[idx]) return;
  const item = style.selections[idx];
  if (field === 'name') item.name = (val || '').trim();
  else if (field === 'type') item.type = val;
  else if (field === 'qty') item.qty = parseFloat(val) || 0;
  else if (field === 'price') item.price = parseFloat(val) || 0;
  else return;
  const row = document.querySelector('#detailContent tr[data-idx="' + idx + '"]');
  if (row) {
    const subCell = row.querySelector('.subtotal');
    if (subCell) subCell.textContent = '¥' + (item.price * item.qty).toFixed(2);
  }
  const total = style.selections.reduce((sum, it) => sum + it.price * it.qty, 0);
  const sub = { pingche: 0, zache: 0, kanche: 0 };
  style.selections.forEach(it => { if (sub[it.type] !== undefined) sub[it.type] += it.price * it.qty; });
  const th = document.getElementById('detailTotalHeader');
  if (th) th.textContent = '¥' + total.toFixed(2) + ' 元';
  const chips = document.querySelectorAll('#detailContent .detail-chip');
  if (chips[0]) chips[0].textContent = '平车 ¥' + sub.pingche.toFixed(2);
  if (chips[1]) chips[1].textContent = '扎车 ¥' + sub.zache.toFixed(2);
  if (chips[2]) chips[2].textContent = '坎车 ¥' + sub.kanche.toFixed(2);
}

// 兼容旧调用（单价修改）
function updateDetailPrice(idx, val) {
  updateDetailField(idx, 'price', val);
}


// ── 工序搜索下拉 ─────────────────────────────────────
function openProcDropdown(idx) {
  closeAllProcDropdowns();
  const inp = document.getElementById('pdi-' + idx);
  const dd  = document.getElementById('pdd-' + idx);
  if (!inp || !dd) return;
  const kw = (inp.value || '').trim().toLowerCase();
  renderProcDropdownList(idx, kw);
  dd.style.display = 'block';
}

function filterProcDropdown(idx, kw) {
  const dd = document.getElementById('pdd-' + idx);
  if (!dd) return;
  renderProcDropdownList(idx, kw.trim().toLowerCase());
  dd.style.display = 'block';
}

function renderProcDropdownList(idx, kw) {
  const dd = document.getElementById('pdd-' + idx);
  if (!dd) return;
  // 收集所有工序
  const all = [];
  ['pingche','zache','kanche'].forEach(type => {
    (DB.processes[type] || []).forEach(p => {
      all.push({ name: p.name, type, price: p.price });
    });
  });
  const matched = kw ? all.filter(p => p.name.toLowerCase().includes(kw)) : all.slice(0, 8);
  if (matched.length === 0) {
    dd.innerHTML = '<div class="proc-dropdown-empty">' + (kw ? '🔍 无匹配工序「' + escHtml(kw) + '」' : '暂无工序') + '</div>';
    return;
  }
  const isViewer = !!(currentUser && currentUser.role === 'viewer');
  dd.innerHTML = matched.slice(0, 12).map(p => {
    const tTag = p.type === 'pingche' ? '<span style="background:#2563eb;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px">平车</span>'
                : p.type === 'zache' ? '<span style="background:#d97706;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px">扎车</span>'
                : '<span style="background:#dc2626;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px">坎车</span>';
    const dis = isViewer ? 'disabled' : '';
    return '<div class="proc-dropdown-item" onclick="' + (dis ? '' : "selectProcItem('" + idx + "'," + JSON.stringify(p.name).replace(/"/g,'&quot;') + "," + JSON.stringify(p.type).replace(/"/g,'&quot;') + "," + p.price + ")") + '">' +
           '<span class="pd-name">' + escHtml(p.name) + '</span>' + tTag +
           '<span class="pd-price">¥' + p.price.toFixed(2) + '</span></div>';
  }).join('') + (kw && matched.length > 12 ? '<div class="proc-dropdown-hint">显示前12条，继续输入精确匹配…</div>' : '');
}

function selectProcItem(idx, name, type, price) {
  // 填入名称
  const inp = document.getElementById('pdi-' + idx);
  if (inp) inp.value = name;
  // 自动填入类型（同步更新 select）- 支持数字idx和新行uid
  const row = document.querySelector('#detailContent tr[data-idx="' + idx + '"]') ||
               document.querySelector('#detailContent tr[data-uid="' + idx + '"]');
  if (row) {
    const typeSel = row.querySelector('select.type-edit');
    if (typeSel) typeSel.value = type;
    const priceInp = row.querySelector('input.price-edit');
    if (priceInp) priceInp.value = price;
  }
  // 更新数据
  updateDetailField(idx, 'name', name);
  updateDetailField(idx, 'type', type);
  updateDetailField(idx, 'price', price);
  closeProcDropdown(idx);
}

function closeProcDropdown(idx) {
  const dd = document.getElementById('pdd-' + idx);
  if (dd) dd.style.display = 'none';
}

function closeAllProcDropdowns() {
  document.querySelectorAll('.proc-dropdown').forEach(el => { el.style.display = 'none'; });
}

// 全局点击关闭下拉
document.addEventListener('click', function(e) {
  if (!e.target.closest('.proc-search-wrap')) closeAllProcDropdowns();
});


// 保存历史款式内的工价修改
function saveDetailChanges() {
  if (currentUser && currentUser.role === 'viewer') return;
  if (!currentHistoryId) return;
  const style = DB.styles.find(s => s.id == currentHistoryId);
  if (!style) return;

  // ── 同步单价回工序管理库 ──
  let updatedProcs = [];
  (style.selections || []).forEach(item => {
    const arr = DB.processes[item.type] || [];
    const proc = arr.find(p => p.name === item.name);
    if (proc) {
      if (proc.price !== item.price) {
        proc.price = item.price;
        if (!updatedProcs.includes(item.name)) updatedProcs.push(item.name);
      }
    } else {
      // 工序库里没有该名称 → 新增一条（用款式中的类型和单价）
      if (!DB.processes[item.type]) DB.processes[item.type] = [];
      DB.processes[item.type].push({ id: Date.now() + Math.floor(Math.random()*1000), name: item.name, price: item.price });
      if (!updatedProcs.includes(item.name)) updatedProcs.push(item.name);
    }
  });

  saveDB();
  if (!storageOK) autoBackup();
  if (updatedProcs.length > 0) {
    clientLog('update_style', '修改款式明细并同步工序：' + updatedProcs.join('、'));
  } else {
    clientLog('update_style', '修改款式明细：' + style.name);
  }
  renderHistory();
  toast('✅ 已保存修改' + (updatedProcs.length > 0 ? '（工序「' + updatedProcs.join('、') + '」单价已同步）' : ''));
}

// ── 图片全屏预览 ─────────────────────────────────────
let _lbImgs = [];
let _lbIdx = 0;
let _lbScale = 1;

// 详情图片点击事件委托（避免内联onclick字符串问题）
document.addEventListener('click', function(e) {
  var el = e.target.closest('.detail-imgs img, .img-grid img[data-lb-src]');
  if (!el) return;
  var src = el.getAttribute('data-lb-src');
  var imgs = [];
  try { imgs = JSON.parse(decodeURIComponent(el.getAttribute('data-lb-imgs') || '[]')); } catch(ex) {}
  var idx = parseInt(el.getAttribute('data-lb-idx') || '0', 10);
  openLightbox(src, imgs, idx);
});

function openLightbox(src, imgs, idx) {
  _lbImgs = (imgs||[]).filter(Boolean);
  _lbIdx = Math.max(0, _lbImgs.indexOf(src));
  _lbScale = 1;
  var img = document.getElementById('lightboxImg');
  img.src = src;
  img.style.transform = 'translate(-50%,-50%) scale(1)';
  var cnt = document.getElementById('lightboxCounter');
  cnt.textContent = _lbImgs.length > 1 ? (_lbIdx+1)+' / '+_lbImgs.length : '';
  document.getElementById('imgLightbox').style.display = 'flex !important';
  updateLbScaleText();
}

function lbZoom(delta) {
  _lbScale = Math.min(5, Math.max(0.5, _lbScale + delta));
  document.getElementById('lightboxImg').style.transform = 'translate(-50%,-50%) scale(' + _lbScale + ')';
  updateLbScaleText();
}

function lbToggleZoom() {
  _lbScale = _lbScale > 1.05 ? 1 : 2;
  document.getElementById('lightboxImg').style.transform = 'translate(-50%,-50%) scale(' + _lbScale + ')';
  updateLbScaleText();
}

function updateLbScaleText() {
  var t = document.getElementById('lbScaleText');
  if (t) t.textContent = Math.round(_lbScale * 100) + '%';
}

function closeLightbox(e) {
  if (e && e.target !== e.currentTarget && e.target.id !== 'lightboxImg') return;
  document.getElementById('imgLightbox').style.display = 'none !important';
  document.getElementById('lightboxImg').src = '';
  _lbScale = 1;
}

document.addEventListener('keydown', function(e) {
  // 详情弹窗 Esc 关闭
  if (e.key === 'Escape') {
    var detail = document.getElementById('detailModal');
    if (detail && detail.classList.contains('show')) { closeDetail(); return; }
  }
  if (document.getElementById('imgLightbox').style.display === 'none') return;
  if (e.key === 'Escape') closeLightbox(e);
  if (e.key === 'ArrowRight') {
    _lbIdx = (_lbIdx+1+_lbImgs.length)%_lbImgs.length;
    _lbScale = 1;
    var imgR = document.getElementById('lightboxImg');
    imgR.src = _lbImgs[_lbIdx];
    imgR.style.transform = 'translate(-50%,-50%) scale(1)';
    document.getElementById('lightboxCounter').textContent = _lbImgs.length>1?(_lbIdx+1)+' / '+_lbImgs.length:'';
    updateLbScaleText();
  }
  if (e.key === 'ArrowLeft')  {
    _lbIdx = (_lbIdx-1+_lbImgs.length)%_lbImgs.length;
    _lbScale = 1;
    var imgL = document.getElementById('lightboxImg');
    imgL.src = _lbImgs[_lbIdx];
    imgL.style.transform = 'translate(-50%,-50%) scale(1)';
    document.getElementById('lightboxCounter').textContent = _lbImgs.length>1?(_lbIdx+1)+' / '+_lbImgs.length:'';
    updateLbScaleText();
  }
});

// 滚轮缩放
var _lbEl = document.getElementById('imgLightbox');
if (_lbEl) _lbEl.addEventListener('wheel', function(e) {
  if (this.style.display === 'none') return;
  e.preventDefault();
  lbZoom(e.deltaY < 0 ? 0.15 : -0.15);
}, { passive: false });

function closeDetail() {
  document.getElementById('detailModal').classList.remove('show');
  currentHistoryId = null;
}

function toggleApprove() {
  if (!currentHistoryId) return;
  const style = DB.styles.find(s => s.id == currentHistoryId);
  if (!style) return;
  const nowApproved = style.status !== 'approved';
  style.status = nowApproved ? 'approved' : 'pending';
  // 记录审批人
  if (nowApproved && currentUser) {
    style.approvedBy = { uid: currentUser.uid || currentUser.id, username: currentUser.username };
  } else if (!nowApproved) {
    style.approvedBy = null; // 退回时清除
  }
  saveDB();
  renderHistory();
  showDetail(currentHistoryId);
  if (nowApproved) {
    toast('✅ 已通过审批');
    clientLog('approve', '通过审批「' + style.name + '」(' + (currentUser ? currentUser.username : '') + ')');
  } else {
    toast('↩ 已退回待审批');
    clientLog('reject', '退回待审批「' + style.name + '」');
  }
}

function exportStyleXlsx() {
  if (currentUser && currentUser.role === 'viewer') return;
  if (!currentHistoryId) return;
  const style = DB.styles.find(s => s.id == currentHistoryId);
  if (!style || !style.selections || style.selections.length === 0) {
    toast('该款式暂无工序数据');
    return;
  }
  const typeNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };
  const rows = [['工序名称*', '工序单价', '工序数量(样版可不填)', '备注(样版可不填)']];
  style.selections.forEach(s => {
    rows.push([
      s.name + ' (' + (typeNames[s.type] || s.type) + ')',
      s.price,
      s.qty,
      ''
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '工序单价表');
  const filename = (style.name || '款式') + '_工序单价表_' + style.date + '.xlsx';
  XLSX.writeFile(wb, filename);
  toast('已导出：' + filename);
}

function autoBackup() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `多绮爱服饰工序数据备份_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('⚠️ 已自动下载备份文件，请保存好');
}

function loadFromHistory() {
  if (!currentHistoryId) return;
  const style = DB.styles.find(s => s.id == currentHistoryId);
  if (style) loadStyle(style);
}

function deleteHistory(id) {
  if (!id) id = currentHistoryId;
  if (!id) return;
  const style = DB.styles.find(s => s.id == id);
  const name = style ? style.name : ('#' + id);
  if (!confirm('确定删除款式「' + name + '」？\n删除后可在「回收站」中恢复。')) return;

  // 移动到回收站
  if (!DB.recycleBin) DB.recycleBin = [];
  DB.recycleBin.unshift({
    ...style,
    _deletedAt: Date.now(),
    _deletedBy: currentUser ? { uid: currentUser.uid || currentUser.id, username: currentUser.username } : null,
    _originalId: style.id
  });

  // 从款式列表中移除
  DB.styles = DB.styles.filter(s => s.id != id);
  saveDB();
  renderHistory();
  renderRecycleBin();
  closeDetail();
  toast('🗑 已移动到回收站');
  clientLog('delete_style', '删除款式：' + name);
}

function deleteCurrentHistory() { deleteHistory(currentHistoryId); }

// 恢复从回收站
function restoreFromRecycle(idx) {
  if (!DB.recycleBin || !DB.recycleBin[idx]) return;
  const item = DB.recycleBin[idx];
  if (!confirm('确定恢复款式「' + item.name + '」？')) return;

  // 恢复时去掉回收站标记
  const restored = { ...item };
  delete restored._deletedAt;
  delete restored._deletedBy;
  delete restored._originalId;

  DB.styles.unshift(restored);
  DB.recycleBin.splice(idx, 1);
  saveDB();
  renderHistory();
  renderRecycleBin();
  toast('♻️ 已恢复：' + item.name);
  clientLog('restore_style', '恢复款式：' + item.name);
}

// 彻底删除
function permanentlyDelete(idx) {
  if (!DB.recycleBin || !DB.recycleBin[idx]) return;
  const item = DB.recycleBin[idx];
  if (!confirm('⚠️ 彻底删除后将无法恢复！\n\n确定要彻底删除「' + item.name + '」？')) return;

  DB.recycleBin.splice(idx, 1);
  saveDB();
  renderRecycleBin();
  toast('🔥 已彻底删除');
  clientLog('permanent_delete', '彻底删除款式：' + item.name);
}

// 清空回收站
function emptyRecycleBin() {
  if (!DB.recycleBin || DB.recycleBin.length === 0) {
    toast('📭 回收站为空');
    return;
  }
  if (!confirm('⚠️ 确定要清空回收站吗？\n所有款式将彻底删除，无法恢复！')) return;

  const count = DB.recycleBin.length;
  DB.recycleBin = [];
  saveDB();
  renderRecycleBin();
  toast('🔥 回收站已清空（' + count + '个）');
  clientLog('empty_recycle', '清空回收站（' + count + '个）');
}

// 渲染回收站列表
// 清理30天前过期的回收站项
function cleanExpiredRecycleItems() {
  if (!DB.recycleBin) return;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const before = DB.recycleBin.length;
  DB.recycleBin = DB.recycleBin.filter(item => {
    return !item._deletedAt || (Date.now() - item._deletedAt) < THIRTY_DAYS;
  });
  const removed = before - DB.recycleBin.length;
  if (removed > 0) {
    console.log('🧹 回收站自动清理了', removed, '个过期款式');
    saveDB();
  }
}

// 更新回收站徽章计数
function updateRecycleCount() {
  const badge = document.getElementById('recycleCount');
  if (!badge) return;
  const count = (DB.recycleBin || []).length;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function renderRecycleBin() {
  const list = document.getElementById('recycleList');
  if (!list) return;

  if (!DB.recycleBin || DB.recycleBin.length === 0) {
    list.innerHTML = '<div class="no-data">📭 回收站为空<br><span style="font-size:12px;color:#999">删除的款式会在此保留30天，之后自动清理</span></div>';
    updateRecycleCount();
    return;
  }

  list.innerHTML = DB.recycleBin.map((item, idx) => {
    const deletedAt = item._deletedAt ? new Date(item._deletedAt).toLocaleString('zh-CN') : '';
    const deletedBy = item._deletedBy ? item._deletedBy.username : '未知';
    const daysAgo = item._deletedAt ? Math.floor((Date.now() - item._deletedAt) / (1000 * 60 * 60 * 24)) : 0;
    const daysLeft = Math.max(0, 30 - daysAgo);
    const isExpiring = daysLeft <= 3;

    return `
      <div class="recycle-item ${isExpiring ? 'expiring' : ''}">
        <div class="recycle-item-header">
          <div class="recycle-name">📦 ${item.name || '未命名'}</div>
          <div class="recycle-meta">
            <span class="meta-tag">删除人：${deletedBy}</span>
            <span class="meta-tag">删除时间：${deletedAt}</span>
            <span class="meta-tag ${isExpiring ? 'urgent' : ''}">⏰ ${daysLeft}天后自动清理</span>
          </div>
        </div>
        <div class="recycle-item-actions">
          <button class="btn-restore" data-role-block onclick="restoreFromRecycle(${idx})">♻️ 恢复</button>
          <button class="btn-perm-delete" data-role-block onclick="permanentlyDelete(${idx})">🔥 彻底删除</button>
        </div>
      </div>
    `;
  }).join('');
  updateRecycleCount();
}

function clearHistorySearch() {
  const inp = document.getElementById('searchInput');
  if (inp) inp.value = '';
  renderHistory();
  toast('🔍 已清除筛选条件');
}

function confirmClearHistory() {
  if (DB.styles.length === 0) { toast('暂无历史款式'); return; }
  if (!confirm('确定清空全部历史款式？此操作不可恢复！')) return;
  const count = DB.styles.length;
  DB.styles = [];
  saveDB();
  renderHistory();
  toast('🗑 已清空全部历史');
  clientLog('clear_history', '清空全部历史款式，共 ' + count + ' 款');
}

// ===== 打印 =====
function openPrint() {
  if (selectedItems.length === 0) { toast('⚠️ 没有工序数据可打印'); return; }
  const name = document.getElementById('styleName').value.trim() || '未命名款式';
  const note = document.getElementById('styleNote').value.trim();
  const date = document.getElementById('styleDate').value;
  const typeNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };
  const typeClass = { pingche: 'pingche', zache: 'zache', kanche: 'kanche' };
  const total = selectedItems.reduce((sum, s) => sum + s.price * s.qty, 0);
  const subPingche = selectedItems.filter(s => s.type === 'pingche').reduce((sum, s) => sum + s.price * s.qty, 0);
  const subZache   = selectedItems.filter(s => s.type === 'zache').reduce((sum, s) => sum + s.price * s.qty, 0);
  const subKanche  = selectedItems.filter(s => s.type === 'kanche').reduce((sum, s) => sum + s.price * s.qty, 0);

  document.getElementById('printView').innerHTML = `
    <div class="print-header">
      <h1>${escHtml(name)} 工序成本单</h1>
      <div class="print-date">📅 ${date} ${note ? '· ' + escHtml(note) : ''}</div>
    </div>
    ${(currentImgs.filter(Boolean).length > 0) ? `<div class="print-imgs">${currentImgs.filter(Boolean).map(src => `<img src="${src}" class="print-img-item" alt="款式图">`).join('')}</div>` : ''}
    <table>
      <thead><tr><th>序号</th><th>工序名称</th><th>类型</th><th>数量</th><th>单价</th><th>小计</th></tr></thead>
      <tbody>
        ${selectedItems.map((s, i) => `
          <tr>
            <td>${i+1}</td>
            <td>${escHtml(s.name)}</td>
            <td>${typeNames[s.type]}</td>
            <td>${s.qty}</td>
            <td>¥${s.price.toFixed(2)}</td>
            <td>¥${(s.price * s.qty).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="print-total">
      🚲 平车：¥${subPingche.toFixed(2)} · ⚡ 扎车：¥${subZache.toFixed(2)} · 🔪 坎车：¥${subKanche.toFixed(2)}<br>
      工序成本合计：¥${total.toFixed(2)} 元
    </div>
    <div class="print-footer">多绮爱服饰工序成本工具 · ${new Date().toLocaleDateString('zh-CN')}</div>
  `;
  document.getElementById('printModal').classList.add('show');
}

function closePrint() {
  document.getElementById('printModal').classList.remove('show');
}

function doPrint() {
  window.print();
}

// ===== 导入导出 =====
function exportData() {
  if (currentUser && currentUser.role === 'viewer') return;
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `多绮爱服饰工序数据_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ 数据已导出');
  clientLog('export', '导出全部数据（' + DB.styles.length + '款）');
}

let importMode = 'replace';
function importData(e, mode) {
  const m = mode || importMode || 'replace';
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.processes || !data.styles) { toast('⚠️ 文件格式不对'); e.target.value = ''; return; }
      if (m === 'merge') {
        ['pingche','zache','kanche'].forEach(t => {
          DB.processes[t] = mergeProcess(DB.processes[t] || [], data.processes[t] || []);
        });
        DB.styles = mergeStyles(DB.styles, data.styles || []);
        saveDB();
        renderManageList(); renderProcessSelect(); renderHistory();
        toast('✅ 已合并同事数据');
        clientLog('merge', '合并同事数据（源文件：' + file.name + '）');
      } else {
        DB = data;
        saveDB();
        renderManageList(); renderProcessSelect(); renderHistory();
        toast('✅ 备份已恢复');
        clientLog('import', '导入备份恢复（文件：' + file.name + '）');
      }
    } catch(err) { toast('⚠️ 文件解析失败'); }
    e.target.value = '';
  };
  reader.readAsText(file);
}
function mergeProcess(a, b) {
  const map = {};
  a.forEach(x => map[x.name] = x);
  b.forEach(x => map[x.name] = x);
  return Object.values(map);
}
function mergeStyles(a, b) {
  const map = {};
  a.forEach(s => map[s.id] = s);
  b.forEach(s => map[s.id] = s);
  return Object.values(map);
}

// ===== 批量导入工序 =====
function openBulkImport() {
  const typeNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };
  document.getElementById('bulkTypeLabel').textContent = typeNames[currentMachine];
  document.getElementById('bulkModal').classList.add('show');
}
function closeBulkImport() {
  document.getElementById('bulkModal').classList.remove('show');
  document.getElementById('bulkText').value = '';
}
function doBulkImport() {
  const text = document.getElementById('bulkText').value.trim();
  if (!text) { toast('⚠️ 请粘贴工序数据'); return; }
  const typeMap = { '平车': 'pingche', '扎车': 'zache', '坎车': 'kanche' };
  const lines = text.split(/\r?\n/);
  let count = 0, dupCount = 0;
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    let parts = line.split(/[\t,，\s]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 1 && /\s/.test(parts[0])) parts = parts[0].split(/\s+/).map(p => p.trim());
    let type = currentMachine, name = '', price = 0;
    if (parts.length >= 3) {
      const t = typeMap[parts[0]];
      if (t) { type = t; name = parts[1]; price = parseFloat(parts[2]) || 0; }
      else { name = parts[0]; price = parseFloat(parts[1]) || 0; }
    } else if (parts.length === 2) {
      name = parts[0]; price = parseFloat(parts[1]) || 0;
    } else {
      return;
    }
    if (!name) return;
    if (DB.processes[type].some(p => p.name === name)) {
      dupCount++;
      return;
    }
    DB.processes[type].push({ id: Date.now() + Math.floor(Math.random()*1000), name, price });
    count++;
  });
  if (count === 0 && dupCount === 0) {
    toast('⚠️ 没有可导入的有效数据');
  } else if (count === 0 && dupCount > 0) {
    toast(`⚠️ 全部 ${dupCount} 道工序已存在，无需导入`);
  } else {
    saveDB();
    renderManageList();
    renderProcessSelect();
    const dupMsg = dupCount > 0 ? `，另有 ${dupCount} 道重复跳过` : '';
    toast(`✅ 成功导入 ${count} 道工序${dupMsg}`);
    closeBulkImport();
  }
}

// ===== 工具函数 =====
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function pad(n) { return n < 10 ? '0' + n : n; }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ── 修改密码 ──
function openChangePwd() {
  document.getElementById('oldPwdInput').value = '';
  document.getElementById('newPwdInput').value = '';
  document.getElementById('newPwd2Input').value = '';
  document.getElementById('changePwdMsg').textContent = '';
  document.getElementById('changePwdMsg').className = 'modal-msg';
  document.getElementById('changePwdModal').classList.add('show');
  document.getElementById('oldPwdInput').focus();
}

function closeChangePwd() {
  document.getElementById('changePwdModal').classList.remove('show');
}

async function doChangePwd() {
  const oldPwd = document.getElementById('oldPwdInput').value;
  const newPwd = document.getElementById('newPwdInput').value;
  const newPwd2 = document.getElementById('newPwd2Input').value;
  const msgEl = document.getElementById('changePwdMsg');

  if (!oldPwd) {
    msgEl.textContent = '⚠️ 请输入旧密码';
    msgEl.className = 'modal-msg error';
    document.getElementById('oldPwdInput').focus();
    return;
  }
  if (!newPwd || newPwd.length < 4) {
    msgEl.textContent = '⚠️ 新密码至少4位';
    msgEl.className = 'modal-msg error';
    document.getElementById('newPwdInput').focus();
    return;
  }
  if (newPwd !== newPwd2) {
    msgEl.textContent = '⚠️ 两次新密码不一致';
    msgEl.className = 'modal-msg error';
    document.getElementById('newPwd2Input').focus();
    return;
  }

  try {
    const r = await fetch('/api/change-password', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
    });
    const d = await r.json();
    if (d.ok) {
      msgEl.textContent = '✅ 密码修改成功！';
      msgEl.className = 'modal-msg';
      setTimeout(() => closeChangePwd(), 1500);
      toast('🔑 密码已成功修改');
    } else {
      msgEl.textContent = '⛔ ' + (d.msg || '修改失败，请检查旧密码是否正确');
      msgEl.className = 'modal-msg error';
    }
  } catch(e) {
    msgEl.textContent = '⚠️ 网络错误，请检查服务器连接';
    msgEl.className = 'modal-msg error';
  }
}


// ══════════════════════════════════════════
// 通知系统
// ══════════════════════════════════════════
let _notifInterval = null;

function showNotifyModal() {
  document.getElementById('notifModal').classList.add('show');
  loadNotifMsgs();
}

function closeNotifyModal() {
  document.getElementById('notifModal').classList.remove('show');
}

async function loadNotifMsgs() {
  const list = document.getElementById('notifList');
  list.innerHTML = '<div class="notif-empty">加载中…</div>';
  try {
    const r = await fetch('/api/messages', { headers: apiHeaders() });
    const d = await r.json();
    if (!d.ok) { list.innerHTML = '<div class="notif-empty">加载失败</div>'; return; }
    const msgs = d.messages || [];
    if (!msgs.length) {
      list.innerHTML = '<div class="notif-empty">📭 暂无通知</div>';
      document.getElementById('notifUnread').textContent = '';
      return;
    }
    const unread = msgs.filter(m => !m.read).length;
    document.getElementById('notifUnread').textContent = unread ? '（' + unread + '条未读）' : '';
    // 更新铃铛徽章
    const badge = document.getElementById('notifBadge');
    if (unread) {
      badge.style.display = 'block';
      badge.textContent = unread > 99 ? '99+' : unread;
    } else {
      badge.style.display = 'none';
    }
    list.innerHTML = msgs.map(m => {
      const dt = new Date(m.createdAt);
      const ds = isNaN(dt) ? m.createdAt : (dt.getMonth()+1)+'/'+dt.getDate()+' '+dt.getHours().toString().padStart(2,'0')+':'+dt.getMinutes().toString().padStart(2,'0');
      const statusTag = m.read
        ? '<span style="background:#ccc;color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:6px">已读</span>'
        : '<span style="background:#e94560;color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:6px;font-weight:700">未读</span>';
      const replies = (m.replies||[]).map(r => {
        const rd = new Date(r.createdAt);
        const rs = isNaN(rd) ? r.createdAt : (rd.getMonth()+1)+'/'+rd.getDate()+' '+rd.getHours().toString().padStart(2,'0')+':'+rd.getMinutes().toString().padStart(2,'0');
        return '<div class="notif-reply-bubble"><div class="notif-reply-meta">💬 ' + escHtml(r.from.username) + ' · ' + rs + '</div><div>' + escHtml(r.content) + '</div></div>';
      }).join('');
      const actions = !m.read ? (
        '<div style="margin-top:8px">' +
        '<input class="notif-reply-inp" id="nrp_' + m.id + '" placeholder="输入回复…" onkeydown="if(event.key===String.fromCharCode(69,110,116,101,114))doNotifReply(m.id)">' +
        '<button class="notif-reply-btn" onclick="doNotifReply(\'' + m.id + '\')">发送回复</button> ' +
        '<button class="notif-read-btn" onclick="markNotifRead(\'' + m.id + '\')">✓ 标记已读</button>' +
        '</div>'
      ) : '';
      return '<div class="notif-item' + (m.read ? '' : ' notif-unread') + '">' +
        '<div class="notif-from">📨 来自：<strong>' + escHtml(m.from.username) + '</strong>' + statusTag + '</div>' +
        '<div class="notif-content">' + escHtml(m.content) + '</div>' +
        '<div class="notif-time">' + ds + '</div>' +
        replies + actions +
        '</div>';
    }).join('');
  } catch(e) {
    list.innerHTML = '<div class="notif-empty">⚠️ 网络错误，请检查服务器连接</div>';
  }
}

async function doNotifReply(id) {
  const inp = document.getElementById('nrp_' + id);
  const content = inp.value.trim();
  if (!content) { toast('⚠️ 请输入回复内容'); return; }
  inp.value = '';
  try {
    const r = await fetch('/api/messages/' + id + '/reply', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ content })
    });
    const d = await r.json();
    if (!d.ok) { toast('⛔ ' + (d.msg || '回复失败')); return; }
    toast('✅ 回复已发送');
    loadNotifMsgs();
  } catch(e) { toast('⚠️ 网络错误'); }
}

async function markNotifRead(id) {
  try {
    await fetch('/api/messages/' + id + '/read', {
      method: 'POST',
      headers: apiHeaders()
    });
    loadNotifMsgs();
  } catch(e) {}
}

function startNotifPolling() {
  if (_notifInterval) return;
  // 首次加载
  pollNotifBadge();
  // 每30秒轮询一次
  _notifInterval = setInterval(pollNotifBadge, 30000);
}

async function pollNotifBadge() {
  if (!window.currentUser || window.currentUser.isAdmin) return;
  try {
    const r = await fetch('/api/messages', { headers: apiHeaders() });
    const d = await r.json();
    if (!d.ok) return;
    const unread = (d.messages||[]).filter(m => !m.read).length;
    const badge = document.getElementById('notifBadge');
    const bell = document.getElementById('notifBell');
    if (bell) bell.style.display = 'inline-flex';
    if (badge) {
      if (unread) {
        badge.style.display = 'block';
        badge.textContent = unread > 99 ? '99+' : unread;
      } else {
        badge.style.display = 'none';
      }
    }
    // 移动端
    const mBadge = document.getElementById('mnavNotif');
    if (mBadge) mBadge.style.display = 'inline-flex';
  } catch(e) {}
}


init();
