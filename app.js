

// ===== 应用版本号（每次更新递增）=====

const APP_VERSION = '1.8.1';

const VERSION_KEY = 'app_version';



// ===== 版本检测与数据保护 =====

function checkVersionAndMigrate() {

  var savedVersion = localStorage.getItem(VERSION_KEY);

  if (!savedVersion) {

    // 首次使用，保存版本号

    localStorage.setItem(VERSION_KEY, APP_VERSION);

    return { isFirstRun: true, isUpdate: false, oldVersion: null };

  }

  if (savedVersion !== APP_VERSION) {

    // 检测到版本更新，做数据迁移

    console.log('🔄 检测到版本更新: ' + savedVersion + ' → ' + APP_VERSION);

    

    // v1.3.0+ 数据迁移：如果旧数据款式少于10个，说明是测试数据，自动清除以加载默认84款

    try {

      var oldDataStr = localStorage.getItem('gf_cost_db');

      if (oldDataStr) {

        var oldData = JSON.parse(oldDataStr);

        var oldStylesCount = (oldData.styles || []).length;

        console.log('📊 旧数据款式数量: ' + oldStylesCount);

        

        if (oldStylesCount < 10) {

          console.log('🗑️ 旧数据款式少于10个，自动清除以加载默认84款数据');

          localStorage.removeItem('gf_cost_db');

          // 同时清除IndexedDB

          try {

            indexedDB.deleteDatabase('gf_cost_db_idb');

          } catch(e) {}

        }

      }

    } catch(e) {

      console.warn('版本迁移数据检查失败:', e);

    }

    

    localStorage.setItem(VERSION_KEY, APP_VERSION);

    return { isFirstRun: false, isUpdate: true, oldVersion: savedVersion };

  }

  return { isFirstRun: false, isUpdate: false, oldVersion: savedVersion };

}



// 显示更新提示条

function showUpdateBanner(oldVersion) {

  var banner = document.createElement('div');

  banner.id = 'updateBanner';

  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:10px 20px;z-index:999999;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-size:14px';

  banner.innerHTML = '<span>✨ 已更新到新版本 v' + APP_VERSION + '（从 v' + oldVersion + ' 更新），数据已自动保留</span><div style="display:flex;gap:10px"><button onclick="dismissUpdateBanner()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px">知道了</button></div>';

  document.body.appendChild(banner);

  // 调整页面顶部间距

  document.body.style.paddingTop = '44px';

}



function dismissUpdateBanner() {

  var banner = document.getElementById('updateBanner');

  if (banner) banner.remove();

  document.body.style.paddingTop = '';

}



// 定期检测新版本（每5分钟检查一次）

let updateCheckTimer = null;

function startUpdateChecker() {

  if (updateCheckTimer) clearInterval(updateCheckTimer);

  updateCheckTimer = setInterval(function() {

    checkForNewVersion();

  }, 5 * 60 * 1000); // 每5分钟检查一次

}



async function checkForNewVersion() {

  try {

    var r = await fetch('app.js?v=' + Date.now());

    var text = await r.text();

    // 从app.js中提取版本号

    var match = text.match(/const APP_VERSION = '([^']+)'/);

    if (match && match[1] && match[1] !== APP_VERSION) {

      // 检测到新版本，显示更新提示

      showNewVersionBanner(match[1]);

    }

  } catch(e) {

    // 静默失败

  }

}



function showNewVersionBanner(newVersion) {

  if (document.getElementById('newVersionBanner')) return;

  var banner = document.createElement('div');

  banner.id = 'newVersionBanner';

  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#4361ee,#3a56d4);color:#fff;padding:10px 20px;z-index:999999;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-size:14px';

  banner.innerHTML = '<span>🚀 发现新版本 v' + newVersion + '，点击立即更新（数据不会丢失）</span><div style="display:flex;gap:10px"><button onclick="reloadForUpdate()" style="background:rgba(255,255,255,0.25);border:none;color:#fff;padding:4px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">立即更新</button><button onclick="dismissNewVersionBanner()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px">稍后</button></div>';

  document.body.appendChild(banner);

  document.body.style.paddingTop = '44px';

}



function dismissNewVersionBanner() {

  var banner = document.getElementById('newVersionBanner');

  if (banner) banner.remove();

  document.body.style.paddingTop = '';

}



function reloadForUpdate() {

  // 刷新页面加载新版本，数据保存在localStorage中不会丢失

  window.location.reload();

}



// ===== 屏蔽浏览器自动填充 =====

(function() {

  // 生成随机字符串，防止浏览器匹配保存的表单值

  var rnd = '_x' + Math.random().toString(36).substr(2, 8);

  ['procFilter', 'manageSearch', 'searchInput', 'pasteArea'].forEach(function(id) {

    var el = document.getElementById(id);

    if (el) el.setAttribute('name', rnd + '_' + id);

  });

})();



// ===== 内置默认数据（84款，553道工序）=====

const DEFAULT_DATA = {"nextId":1,"styles":[{"id":1784963906204,"name":"XK282婴童","note":"","status":"approved","date":"2026-07-25","imgs":["XK282婴童_0_0.jpeg"],"selections":[{"type":"pingche","name":"订横唛（明暗线一样）+ 码标剪标","price":0.3,"qty":1},{"type":"pingche","name":"做领结","price":0.6,"qty":1},{"type":"zache","name":"车门边做领上领落唛压线定叠位","price":1.5,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"pingche","name":"车前V。拼前��","price":0.55,"qty":1},{"type":"zache","name":"上袖口.脚口","price":0.7,"qty":1},{"type":"zache","name":"拼后浪","price":0.15,"qty":1},{"type":"kanche","name":"冚车拉边","price":0.15,"qty":1},{"name":"扎V领螺纹.V领散口","type":"zache","qty":1,"price":0.2},{"name":"冚后浪","type":"kanche","qty":1,"price":0.15}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785743864665,"name":"AL550婴童","note":"","status":"approved","date":"2026-08-03","imgs":["AL550婴童_1_0.jpeg"],"selections":[{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"pingche","name":"压前后浪及链牌双线","price":0.65,"qty":1},{"type":"pingche","name":"压后上飞机头","price":0.4,"qty":1},{"type":"pingche","name":"包脚口","price":0.5,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785743805305,"name":"XLY097婴童","note":"","status":"approved","date":"2026-08-03","imgs":["XLY097婴童_2_0.jpeg"],"selections":[{"type":"pingche","name":"贴门边做领口压线.做领上领落唛压三边线","price":2.3,"qty":1},{"type":"pingche","name":"封叉顶压后袖.叉位线做袖英压三边明线","price":1.8,"qty":1},{"type":"pingche","name":"压上衣前后中双线","price":0.8,"qty":1},{"type":"pingche","name":"走口袋线","price":0.45,"qty":1},{"type":"pingche","name":"做袋盖压线.订袋盖","price":1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"pingche","name":"压前后浪及链牌双线","price":0.65,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"pingche","name":"包脚口","price":0.5,"qty":1},{"name":"拼前上后上","type":"zache","qty":1,"price":0.3},{"name":"拼后袖.开叉口","type":"zache","qty":1,"price":0.25}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785743534160,"name":"AL551婴童","note":"","status":"approved","date":"2026-08-03","imgs":["AL551婴童_3_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚.脚口","price":1.1,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785743422209,"name":"LL377","note":"","status":"approved","date":"2026-08-03","imgs":["LL377_4_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":2},{"type":"pingche","name":"车章仔（普通）","price":0.25,"qty":1},{"type":"pingche","name":"YT梭织夹底倒针","price":0.2,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"zache","name":"YT针织埋肩上袖埋夹落唛","price":0.6,"qty":1},{"type":"zache","name":"拼裙侧骨落唛","price":0.65,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":2},{"type":"kanche","name":"冚车拉边","price":0.4,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"admin","username":"管理员"}},{"id":1785743285712,"name":"XLM202小童","note":"","status":"approved","date":"2026-08-03","imgs":["XLM202小童_5_0.jpeg"],"selections":[{"type":"pingche","name":"合订帽顶","price":0.1,"qty":1},{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上拉链车定拉链盖压线","price":1.1,"qty":1},{"type":"pingche","name":"做装饰袋唇","price":0.8,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"拼帽.合帽口.上帽","price":0.65,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"上袖口.扎衫脚","price":0.5,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.25,"qty":1},{"name":"扎拉链盖散口","type":"zache","qty":1,"price":0.05}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785742986145,"name":"XLD042小童","note":"","status":"approved","date":"2026-08-03","imgs":["XLD042小童_6_0.jpeg"],"selections":[{"type":"pingche","name":"做整件马甲","price":1.5,"qty":1},{"type":"pingche","name":"衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"车定蝴蝶结","price":0.7,"qty":1},{"type":"pingche","name":"包袖口","price":0.4,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"包裤脚口","price":0.5,"qty":1},{"type":"zache","name":"扎衬衫","price":0.7,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"扎马甲","type":"zache","qty":1,"price":0.95}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785742715144,"name":"AL558婴童","note":"","status":"pending","date":"2026-08-03","imgs":["AL558婴童_7_0.jpeg"],"selections":[{"type":"pingche","name":"YT衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"做假袋盖","price":0.8,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英压三边明线","price":1.6,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.4,"qty":1},{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"YT梭织夹底倒针","price":0.2,"qty":1},{"type":"pingche","name":"肩带拉边拉夹（拉吊带）","price":0.55,"qty":1},{"type":"pingche","name":"定章仔","price":0.5,"qty":1},{"type":"pingche","name":"YT梭织车中腰橡筋","price":0.3,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"拼裙侧骨落唛","price":0.65,"qty":1},{"type":"zache","name":"缩拼裙摆","price":0.8,"qty":1},{"type":"zache","name":"密扎","price":0.6,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":null},{"id":1785394696202,"name":"AL549婴童","note":"","status":"approved","date":"2026-07-30","imgs":["AL549婴童_8_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"YT梭织折压后门筒定叠位压领线","price":0.3,"qty":1},{"type":"pingche","name":"缩订飞袖","price":0.45,"qty":1},{"type":"pingche","name":"包袖口橡筋","price":0.5,"qty":1},{"type":"pingche","name":"做订蝴蝶结","price":2.7,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"zache","name":"缩拼上身","price":0.2,"qty":1},{"type":"zache","name":"埋肩上袖埋夹","price":0.6,"qty":1},{"type":"zache","name":"扎袖口散","price":0.2,"qty":1},{"name":"密扎","type":"zache","qty":1,"price":0.2},{"name":"拼裙","type":"pingche","qty":1,"price":0.25},{"name":"缩拼裙摆","type":"zache","qty":1,"price":0.4},{"name":"领子拉边","type":"pingche","qty":1,"price":0.15},{"name":"后领口倒针","type":"pingche","qty":1,"price":0.2}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785394378769,"name":"AL556婴童","note":"","status":"approved","date":"2026-07-30","imgs":["AL556婴童_9_0.jpeg"],"selections":[{"type":"pingche","name":"YT衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英","price":1.3,"qty":1},{"type":"pingche","name":"包衫脚","price":0.4,"qty":1},{"type":"pingche","name":"上腰定唛（只后中缝倒针）牛仔款","price":0.7,"qty":1},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"pingche","name":"压前后浪及链牌双线","price":0.65,"qty":1},{"type":"pingche","name":"压后上飞机头","price":0.4,"qty":1},{"type":"pingche","name":"车袋口点位装袋压双线","price":1.2,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎腰散口.扎链牌散口","price":0.25,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"name":"包裤脚","type":"pingche","qty":1,"price":0.5},{"name":"拼裤袋","type":"pingche","qty":1,"price":0.15}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785393841565,"name":"AL542婴童","note":"","status":"approved","date":"2026-07-30","imgs":["AL542婴童_10_0.png"],"selections":[{"type":"pingche","name":"开胸上扁机领落唛压线一整套","price":1.35,"qty":1},{"type":"pingche","name":"上腰定唛（只有后中缝倒针）","price":0.6,"qty":1},{"type":"pingche","name":"包脚口橡筋","price":0.5,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口.衫脚螺纹","price":0.55,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.35,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"zache","name":"拼裤子前幅","price":0.35,"qty":1},{"type":"zache","name":"扎脚口散","price":0.2,"qty":1},{"name":"扎胸贴.领子散口","type":"zache","qty":1,"price":0.25}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785393513135,"name":"XLY088婴童","note":"","status":"approved","date":"2026-07-30","imgs":["XLY088婴童_11_0.jpeg"],"selections":[{"type":"pingche","name":"YT衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英","price":1.3,"qty":1},{"type":"pingche","name":"做假袋口","price":0.8,"qty":1},{"type":"pingche","name":"运反下摆两端上下摆包下摆压三边明线","price":1.1,"qty":1},{"type":"pingche","name":"上腰定唛定腰","price":0.6,"qty":1},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"pingche","name":"压前后浪及链牌双线","price":0.65,"qty":1},{"type":"pingche","name":"YT卷裤脚口","price":0.5,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎腰散口.扎链牌散口","price":0.25,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.35,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"name":"拼裤袋","type":"zache","qty":1,"price":0.15},{"name":"拼上衣前幅","type":"pingche","qty":1,"price":0.2},{"name":"压上衣前幅线","type":"pingche","qty":1,"price":0.2}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785227884424,"name":"XLD037小童","note":"","status":"approved","date":"2026-07-28","imgs":["XLD037小童_12_0.jpeg"],"selections":[{"type":"pingche","name":"做整件马甲","price":2,"qty":1},{"type":"pingche","name":"做门边做假（上下级领）上领落唛（衬衫）","price":2,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英","price":1.2,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"YT上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"YT卷裤脚口","price":0.5,"qty":1},{"type":"zache","name":"扎衬衫","price":0.7,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.5,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.45,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"做订蝴蝶","type":"pingche","qty":1,"price":0.5},{"name":"扎马甲","type":"pingche","qty":1,"price":0.94}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785227771148,"name":"XLD038小童","note":"","status":"approved","date":"2026-07-28","imgs":["XLD038小童_13_0.jpeg"],"selections":[{"type":"pingche","name":"做整件马甲","price":2,"qty":1},{"type":"pingche","name":"做门边做（假上下级领）上领落唛（衬衫）","price":2,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英压三边明线","price":1.6,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"做订蝴蝶结","price":0.5,"qty":1},{"type":"pingche","name":"YT上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"YT卷裤脚口","price":0.5,"qty":1},{"type":"zache","name":"扎衬衫","price":0.7,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.5,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.45,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"扎马甲","type":"pingche","qty":1,"price":0.95}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785227215199,"name":"XLD036小童","note":"","status":"approved","date":"2026-07-28","imgs":["XLD036小童_14_0.jpeg"],"selections":[{"type":"pingche","name":"做整件马甲","price":2,"qty":1},{"type":"pingche","name":"做门边做领上领落唛（假上下级领）","price":2,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英","price":1.2,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"做订蝴蝶结","price":0.5,"qty":1},{"type":"pingche","name":"YT裤腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"YT包裤脚口","price":0.5,"qty":1},{"type":"zache","name":"扎衬衫整件","price":0.8,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.5,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.45,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"扎马甲整件","type":"zache","qty":1,"price":0.95},{"name":"拼后上","type":"zache","qty":1,"price":0.1},{"name":"压上衣后幅","type":"pingche","qty":1,"price":0.1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785226694696,"name":"JR35婴童","note":"","status":"approved","date":"2026-07-28","imgs":["JR35婴童_15_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"贴假门边线","price":0.25,"qty":1},{"type":"pingche","name":"领口倒针","price":0.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"pingche","name":"裤子订唛（双唛）","price":0.2,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"冚车拉边","price":0.15,"qty":1},{"type":"kanche","name":"YT冚袖口","price":0.2,"qty":1},{"type":"kanche","name":"冚衫脚","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785226496560,"name":"AL557婴童","note":"","status":"approved","date":"2026-07-28","imgs":["AL557婴童_16_0.jpeg"],"selections":[{"type":"pingche","name":"做上下领定唛压门边线","price":1.7,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英压","price":1.2,"qty":1},{"type":"pingche","name":"划位车口袋.装袋盖","price":2,"qty":1},{"type":"zache","name":"套腰贴.包中腰橡筋","price":0.7,"qty":1},{"type":"pingche","name":"定脚口","price":0.4,"qty":1},{"type":"zache","name":"埋肩上袖埋夹","price":0.5,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.35,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"name":"上裤脚","type":"zache","qty":1,"price":0.3},{"name":"上腰中腰","type":"zache","qty":1,"price":0.2},{"name":"拼腰贴.扎散口","type":"zache","qty":1,"price":0}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785224792824,"name":"XLY86婴童","note":"","status":"approved","date":"2026-07-28","imgs":["XLY86婴童_17_0.png"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛（订后中）","price":0.6,"qty":1},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"pingche","name":"包脚口橡筋","price":0.5,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口.扎衫脚","price":0.55,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"zache","name":"扎脚口散","price":0.2,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"name":"拼假袋","type":"zache","qty":1,"price":0.15}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785224267760,"name":"XLM175小童","note":"","status":"approved","date":"2026-07-28","imgs":["XLM175小童_18_0.jpeg"],"selections":[{"type":"pingche","name":"做整个包包","price":1.6,"qty":1},{"type":"pingche","name":"做整件马甲","price":2.4,"qty":1},{"type":"pingche","name":"YT梭织车袖口橡筋","price":0.4,"qty":1},{"type":"pingche","name":"YT衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"YT梭织车中腰橡筋","price":0.3,"qty":1},{"name":"扎包包+密口","type":"zache","qty":1,"price":0.4},{"name":"扎马甲","type":"pingche","qty":1,"price":1.1},{"name":"扎裙子身","type":"zache","qty":1,"price":0.65},{"name":"拼裙*3侧骨落唛","type":"pingche","qty":1,"price":0.28},{"name":"缩拼上中下裙片","type":"zache","qty":1,"price":1},{"name":"密袖口.裙摆","type":"pingche","qty":1,"price":0.55}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785143203346,"name":"XLY96婴童","note":"","status":"approved","date":"2026-07-27","imgs":["XLY96婴童_19_0.png"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"上领口","price":0.25,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.35,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785143098635,"name":"AL548婴童","note":"","status":"approved","date":"2026-07-27","imgs":["AL548婴童_20_0.png"],"selections":[{"type":"pingche","name":"开胸做领上领落唛压线一整套","price":1.8,"qty":1},{"type":"pingche","name":"车章仔（普通）","price":0.25,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"上袖口.脚口","price":0.6,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.45,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"扎领散口","type":"pingche","qty":1,"price":0.1},{"name":"扎胸贴散口","type":"pingche","qty":1,"price":0.15}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785142832955,"name":"AL547-1婴童","note":"","status":"approved","date":"2026-07-27","imgs":["AL547-1婴童_21_0.png"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.85,"qty":1},{"type":"kanche","name":"冚车拉边（外包拉边）","price":0.4,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785142779779,"name":"AL547婴童","note":"","status":"approved","date":"2026-07-27","imgs":["AL547婴童_22_0.png"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.85,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785142567923,"name":"LL372小童","note":"","status":"approved","date":"2026-07-27","imgs":["LL372小童_23_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"车前中牙签线","price":0.4,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.85,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.75,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785142431796,"name":"LL367小童","note":"","status":"approved","date":"2026-07-27","imgs":["LL367小童_24_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"pingche","name":"上拉链车定拉链盖压线","price":1.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"上袖口.扎衫脚","price":0.5,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1},{"name":"扎拉","type":"pingche","qty":1,"price":0.5}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785142317292,"name":"LL370小童","note":"","status":"approved","date":"2026-07-27","imgs":["LL370小童_25_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"定蝴蝶结","price":0.3,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"上领口","price":0.25,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"YT冚袖口","price":0.2,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785054362674,"name":"AL513#婴童","note":"","status":"approved","date":"2026-07-26","imgs":["AL513#婴童_26_0.png"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.85,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼前后浪.埋浪","price":0.4,"qty":1},{"type":"kanche","name":"冚裤脚","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785049344691,"name":"XLY90婴童","note":"","status":"approved","date":"2026-07-26","imgs":["XLY90婴童_27_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"定肩压织带线","price":0.6,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.8,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785049246515,"name":"XLY89婴��","note":"","status":"approved","date":"2026-07-26","imgs":["XLY89婴��_28_0.png"],"selections":[{"type":"pingche","name":"做门边做上下级领上领落唛（衬衫）","price":2.3,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做上袖英","price":1.3,"qty":1},{"type":"pingche","name":"点位车口袋装袋","price":0.4,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785049110218,"name":"XLG290小童","note":"","status":"approved","date":"2026-07-26","imgs":["XLG290小童_29_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"领口倒针","price":0.1,"qty":1},{"type":"pingche","name":"缩袖顶+丝带固定","price":0.45,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"kanche","name":"冚车拉边","price":0.15,"qty":1},{"type":"kanche","name":"YT冚袖口","price":0.2,"qty":1},{"type":"kanche","name":"冚衫脚","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785048927579,"name":"LL360小童","note":"","status":"approved","date":"2026-07-26","imgs":["LL360小童_30_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"划位车口袋装袋.做装袋盖","price":2.2,"qty":1},{"type":"pingche","name":"YT上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"包脚口橡筋","price":0.5,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.8,"qty":1},{"type":"zache","name":"上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.5,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"扎脚口散","price":0.2,"qty":1},{"type":"kanche","name":"冚袋口","price":0.15,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785047212203,"name":"AL559婴童","note":"","status":"approved","date":"2026-07-26","imgs":["AL559婴童_31_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上拉链车定拉链盖压线","price":1.1,"qty":1},{"type":"pingche","name":"车老鼠袋","price":0.6,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"上衫脚","price":0.2,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"冚袋口","price":0.15,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785047098413,"name":"XLB522婴童","note":"","status":"pending","date":"2026-07-26","imgs":["XLB522婴童_32_0.jpeg"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"定牙齿","price":0.1,"qty":1},{"type":"pingche","name":"上拉链车定拉链盖压线","price":1.1,"qty":1},{"type":"pingche","name":"车返角","price":0.3,"qty":9},{"type":"pingche","name":"车老鼠袋","price":0.6,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"上衫脚","price":0.2,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"冚袋口","price":0.15,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":null},{"id":1785046858787,"name":"AL545婴童","note":"","status":"approved","date":"2026-07-26","imgs":["AL545婴童_33_0.jpeg"],"selections":[{"type":"pingche","name":"YT衫脚倒针","price":0.2,"qty":1},{"type":"pingche","name":"点位.定蝴蝶结","price":0.1,"qty":6},{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"pingche","name":"手工褶裙摆","price":1.6,"qty":1},{"type":"pingche","name":"YT梭织裙摆卷边","price":0.4,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"YT拼侧骨落唛","price":0.25,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"name":"裙脚倒针","type":"pingche","qty":1,"price":0.1},{"name":"拼门边两端.上门边","type":"zache","qty":1,"price":0.4}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785046570060,"name":"XK301婴童","note":"","status":"approved","date":"2026-07-26","imgs":["XK301婴童_34_0.png"],"selections":[{"type":"pingche","name":"订横唛（明暗线一样）+ 码标剪标","price":0.3,"qty":1},{"type":"pingche","name":"包后领","price":0.5,"qty":1},{"type":"pingche","name":"上拉链车定拉链盖压线","price":1.1,"qty":1},{"type":"pingche","name":"包袖口橡筋","price":0.5,"qty":1},{"type":"pingche","name":"车老鼠袋","price":0.6,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎袖口.拉链盖散口","price":0.25,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"name":"冚袋口","type":"pingche","qty":1,"price":0.15},{"name":"扎衫脚散口","type":"zache","qty":1,"price":0.15},{"name":"压衫脚线","type":"pingche","qty":1,"price":0.35}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1785046451459,"name":"XK302婴童","note":"","status":"approved","date":"2026-07-26","imgs":["XK302婴童_35_0.png"],"selections":[{"type":"pingche","name":"包后领","price":0.5,"qty":1},{"type":"pingche","name":"订横唛（明暗线一样）+ 码标剪标","price":0.3,"qty":1},{"type":"pingche","name":"上拉链车定拉链盖压线","price":1.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口.扎衫脚","price":0.5,"qty":1},{"name":"扎拉链盖散口","type":"pingche","qty":1,"price":0.05},{"name":"拼前幅","type":"pingche","qty":1,"price":0.2},{"name":"拼领顶.上领","type":"zache","qty":1,"price":0.3}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784873894941,"name":"LQ14婴童","note":"","status":"approved","date":"2026-07-24","imgs":["LQ14婴童_36_0.png"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"做上下领定唛压门边线","price":1.7,"qty":1},{"type":"pingche","name":"做袖口一整套","price":1.6,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"直包腰定唛","price":0.5,"qty":1},{"type":"pingche","name":"剪定腰耳仔","price":0.65,"qty":1},{"type":"pingche","name":"压双线袋口","price":0.3,"qty":1},{"type":"pingche","name":"压前中双线","price":0.2,"qty":1},{"type":"pingche","name":"划位车袋盖.口袋","price":2.2,"qty":1},{"type":"pingche","name":"包脚口橡筋","price":0.5,"qty":1},{"type":"pingche","name":"压后中双线","price":0.2,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛*2","price":1.3,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.8,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"扎袋口散","price":0.1,"qty":1},{"type":"zache","name":"拼袋","price":0.15,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪.埋浪","price":0.4,"qty":1},{"type":"zache","name":"扎脚口散","price":0.2,"qty":1},{"type":"kanche","name":"冚车拉耳仔","price":0.05,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"}},{"id":1784966413469,"name":"XLB531婴童","note":"","status":"approved","date":"2026-07-25","imgs":["XLB531婴童_37_0.jpeg"],"selections":[{"type":"pingche","name":"开胸做领上领落唛压领线一整套","price":1.1,"qty":1},{"type":"pingche","name":"车章仔（普通）","price":0.25,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"包裤脚口","price":0.5,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎胸贴散口","price":0.15,"qty":1},{"type":"zache","name":"拼上衣","price":0.2,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"上衫脚","price":0.254,"qty":1},{"type":"zache","name":"YT上腰头橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"扎领散口","type":"zache","qty":1,"price":0.1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784966262556,"name":"XLM178小童","note":"","status":"approved","date":"2026-07-25","imgs":["XLM178小童_38_0.png"],"selections":[{"type":"pingche","name":"做帽子","price":0.8,"qty":1},{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"车定小月亮拉链护贴","price":0.3,"qty":1},{"type":"zache","name":"拼帽*2","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"上衫脚","price":0.2,"qty":1},{"name":"拼门襟.螺纹脚点","type":"pingche","qty":1,"price":0.4},{"name":"上拉链.上帽.套门边.压领.门边线","type":"pingche","qty":1,"price":1.35},{"name":"扎领散口","type":"zache","qty":1,"price":0.1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784966090388,"name":"JR37婴童","note":"","status":"approved","date":"2026-07-25","imgs":["JR37婴童_39_0.jpeg"],"selections":[{"type":"pingche","name":"开胸压线","price":0.8,"qty":1},{"type":"pingche","name":"YT衫脚倒针","price":0.1,"qty":1},{"type":"zache","name":"上领口","price":0.25,"qty":1},{"type":"zache","name":"扎胸贴散口","price":0.15,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"kanche","name":"YT冚袖口","price":0.2,"qty":1},{"type":"kanche","name":"拉边","price":0.25,"qty":1},{"name":"订唛（单唛）","type":"pingche","qty":1,"price":0.1},{"name":"衫脚倒针","type":"pingche","qty":1,"price":0.1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784965889180,"name":"AL536婴童","note":"","status":"approved","date":"2026-07-25","imgs":["AL536婴童_40_0.jpeg"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"上领口","price":0.25,"qty":1},{"type":"zache","name":"上袖口.脚口","price":0.6,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"YT上腰头橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784965778589,"name":"XLD40小童","note":"","status":"approved","date":"2026-07-25","imgs":["XLD40小童_41_0.png"],"selections":[{"type":"pingche","name":"做门边做上下级领上领落唛（衬衫）","price":2.3,"qty":1},{"type":"pingche","name":"划位车口袋","price":0.4,"qty":1},{"type":"pingche","name":"车章仔（特殊）","price":0.3,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英压三边明线","price":1.6,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.7,"qty":1},{"name":"订后褶*2","type":"pingche","qty":1,"price":0.2},{"name":"拼后幅","type":"zache","qty":1,"price":0}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784965666197,"name":"XLD041小童","note":"","status":"approved","date":"2026-07-25","imgs":["XLD041小童_42_0.png"],"selections":[{"type":"pingche","name":"做门边做一片领上领落唛（衬衫）","price":1.7,"qty":1},{"type":"pingche","name":"划位车口袋","price":0.4,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英压三边明线","price":1.6,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.7,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784964710740,"name":"XLM188小童","note":"","status":"approved","date":"2026-07-25","imgs":["XLM188小童_43_0.png"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛（只后中缝倒针）","price":0.7,"qty":1},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"上衫脚","price":0.25,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.5,"qty":1},{"name":"拼假袋","type":"pingche","qty":1,"price":0.15}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784964497100,"name":"XK278婴童","note":"","status":"approved","date":"2026-07-25","imgs":["XK278婴童_44_0.jpeg"],"selections":[{"type":"pingche","name":"订横唛（明暗线一样）+ 码标剪标","price":0.3,"qty":1},{"type":"pingche","name":"包后领","price":0.5,"qty":1},{"type":"pingche","name":"裤子定唛","price":0.1,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚.脚口","price":1.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛（前幅夹里布）","price":0.9,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"zache","name":"YT上腰头橡筋","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784964339700,"name":"XK280婴童","note":"","status":"approved","date":"2026-07-25","imgs":["XK280婴童_45_0.jpeg"],"selections":[{"type":"pingche","name":"订横唛（明暗线一样）+ 码标剪标","price":0.3,"qty":1},{"type":"pingche","name":"包后领","price":0.5,"qty":1},{"type":"pingche","name":"YT裤定唛","price":0.1,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚.脚口","price":1.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛（前幅夹里布）","price":0.9,"qty":1},{"type":"zache","name":"YT上腰头橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"领口.衫脚.袖口.裤脚倒针","type":"pingche","qty":1,"price":0.6}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784962152859,"name":"XLM189X小童","note":"","status":"pending","date":"2026-07-25","imgs":["XLM189X小童_46_0.png"],"selections":[{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"pingche","name":"剪定腰耳仔*3","price":0.9,"qty":1},{"type":"pingche","name":"压弯袋双线","price":0.4,"qty":1},{"type":"pingche","name":"压前后浪及链牌双线","price":0.65,"qty":1},{"type":"pingche","name":"压后上飞机头","price":0.4,"qty":1},{"type":"pingche","name":"划位车口袋","price":1.2,"qty":1},{"type":"pingche","name":"YT卷裤脚口","price":0.5,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"冚耳仔","price":0.07,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":null},{"id":1784874358164,"name":"AL554婴童","note":"","status":"approved","date":"2026-07-24","imgs":["AL554婴童_47_0.jpeg"],"selections":[{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"上侧骨织带拼侧骨*4","price":1.6,"qty":1},{"type":"pingche","name":"包脚口","price":0.5,"qty":1},{"type":"zache","name":"上裤头","price":0.2,"qty":1},{"type":"zache","name":"扎侧骨散口*4落唛","price":0.45,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"name":"冚裤头","type":"kanche","qty":1,"price":0.2}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784874147723,"name":"XK284","note":"","status":"pending","date":"2026-07-24","imgs":["XK284_48_0.png"],"selections":[{"type":"pingche","name":"订横唛（明暗线一样）+ 码标剪标","price":0.3,"qty":1},{"type":"pingche","name":"领口.裤脚倒针","price":0.5,"qty":1},{"type":"pingche","name":"压假织带线","price":0.4,"qty":1},{"type":"pingche","name":"车返耳朵折订耳朵订位","price":0.7,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.75,"qty":1},{"type":"zache","name":"拼前幅","price":0.1,"qty":1},{"type":"zache","name":"上袖口.脚口","price":0.7,"qty":1},{"type":"zache","name":"拼浪底埋浪","price":0.15,"qty":1},{"type":"kanche","name":"冚车拉边","price":0.3,"qty":1},{"type":"kanche","name":"冚浪底","price":0.15,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":null},{"id":1784874119939,"name":"XK296婴童","note":"","status":"approved","date":"2026-07-24","imgs":["XK296婴童_49_0.png"],"selections":[{"type":"pingche","name":"包后领条车横唛","price":0.8,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"包脚口","price":0.5,"qty":1},{"type":"zache","name":"上领.袖口.衫脚","price":0.8,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784874086028,"name":"XK294小童","note":"","status":"approved","date":"2026-07-24","imgs":["XK294小童_50_0.png"],"selections":[{"type":"pingche","name":"包后领条车横唛","price":0.8,"qty":1},{"type":"pingche","name":"上腰订唛订腰侧","price":0.8,"qty":1},{"type":"pingche","name":"压弯袋双线","price":0.35,"qty":1},{"type":"pingche","name":"压前后浪及链牌双线","price":0.65,"qty":1},{"type":"pingche","name":"包脚口","price":0.5,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.8,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.5,"qty":1},{"name":"YT拼假裤袋","type":"zache","qty":1,"price":0.15}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784874045132,"name":"LL369小童","note":"","status":"approved","date":"2026-07-24","imgs":["LL369小童_51_0.png"],"selections":[{"type":"pingche","name":"上衣定唛压门边线","price":0.5,"qty":1},{"type":"pingche","name":"做假袋口","price":0.8,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"压脚口.袖口贴","price":1,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.8,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"裤子定唛","price":0.1,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"kanche","name":"冚裤脚","price":0.2,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784874025972,"name":"LL362小童","note":"","status":"approved","date":"2026-07-24","imgs":["LL362小童_52_0.png"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"划位车口袋.装袋.做袋盖装袋盖","price":2,"qty":1},{"type":"pingche","name":"贴前幅拼色走边线","price":0.35,"qty":1},{"type":"pingche","name":"上腰定唛（不用订腰测）","price":0.6,"qty":1},{"type":"pingche","name":"车裤口袋贴裤袋","price":0.9,"qty":1},{"type":"pingche","name":"包脚口橡筋","price":0.5,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.8,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.5,"qty":1},{"type":"zache","name":"扎脚口散","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"扎裤脚散口","type":"pingche","qty":1,"price":0.2}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784873982060,"name":"AL552婴童","note":"","status":"approved","date":"2026-07-24","imgs":["AL552婴童_53_0.png"],"selections":[{"type":"pingche","name":"做上下领定唛","price":0.9,"qty":1},{"type":"pingche","name":"上拉链做定拉链贴压线","price":1.1,"qty":1},{"type":"pingche","name":"包袖口橡筋","price":0.5,"qty":1},{"type":"pingche","name":"包衫脚橡筋","price":0.5,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"pingche","name":"包脚口橡筋","price":0.5,"qty":1},{"type":"pingche","name":"车上衣织带","price":0.9,"qty":1},{"type":"zache","name":"上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎袖口.衫脚.腰.脚口散","price":0.8,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.4,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"}},{"id":1784873951356,"name":"AL555婴童","note":"","status":"approved","date":"2026-07-24","imgs":["AL555婴童_54_0.png"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"车老鼠袋","price":0.35,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口.衫脚.脚口","price":0.8,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.4,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"冚袋口","price":0.15,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784873840788,"name":"XLM176小童","note":"","status":"approved","date":"2026-07-24","imgs":["XLM176小童_55_0.png"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"领口袖口倒针*4","price":0.4,"qty":1},{"type":"pingche","name":"压前幅线","price":0.3,"qty":1},{"type":"pingche","name":"缩拼荷叶边","price":0.3,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"密扎","price":0.25,"qty":1},{"type":"kanche","name":"冚车拉边","price":0.4,"qty":1},{"type":"kanche","name":"冚后幅","price":0.1,"qty":1},{"name":"领口订橡筋","type":"pingche","qty":2,"price":0.1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784601560209,"name":"XLY92婴童","note":"","status":"approved","date":"2026-07-21","imgs":["XLY92婴童_56_0.png"],"selections":[{"type":"pingche","name":"YT衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"做袖口一整套（袖口三边压线）","price":1.6,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"pingche","name":"车前中牙签线","price":0.4,"qty":1},{"type":"pingche","name":"包脚口","price":0.5,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.4,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784599399493,"name":"XLB524.526.527婴童","note":"","status":"approved","date":"2026-07-21","imgs":["XLB524.526.527婴童_57_0.png"],"selections":[{"type":"pingche","name":"做门边.做领上领定唛","price":1.7,"qty":1},{"type":"pingche","name":"做袖口一整套","price":1.2,"qty":1},{"type":"pingche","name":"车章仔","price":0.5,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"包脚口","price":0.4,"qty":1},{"type":"zache","name":"埋肩上袖埋��落唛","price":0.65,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.4,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"}},{"id":1784549993075,"name":"XLB525婴童","note":"","status":"approved","date":"2026-07-20","imgs":["XLB525婴童_58_0.png",null,null,null],"selections":[{"type":"pingche","name":"做门边.做领上领定���","price":1.7,"qty":1},{"type":"pingche","name":"做袖口一整套","price":1.2,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"包脚口","price":0.4,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪","price":0.4,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"}},{"id":1784362715666,"name":"XLM190小童","note":"","status":"approved","date":"2026-07-18","imgs":["XLM190小童_59_0.png",null,null,null],"selections":[{"type":"pingche","name":"订唛（单唛）","price":0.1,"qty":1},{"type":"pingche","name":"剪定腰耳仔*3","price":0.7,"qty":1},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"pingche","name":"压后浪","price":0.2,"qty":1},{"type":"pingche","name":"压后上飞机头","price":0.4,"qty":1},{"type":"pingche","name":"YT卷裤脚口","price":0.5,"qty":1},{"type":"zache","name":"扎拉链贴.左右片","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.45,"qty":1},{"type":"zache","name":"拼后浪埋浪.前浪扎散口（长裤）","price":0.55,"qty":1},{"type":"kanche","name":"拉耳仔","price":0.07,"qty":1},{"name":"做订三角边袋盖","type":"pingche","qty":1,"price":1.2},{"name":"点位车订工字褶侧袋","type":"pingche","qty":1,"price":1.5},{"name":"车前中拉链.压线","type":"pingche","qty":1,"price":1},{"name":"包裤腰（特殊腰）","type":"pingche","qty":1,"price":1.5},{"name":"拼假弯袋","type":"pingche","qty":1,"price":0.15},{"name":"扎袋口散","type":"zache","qty":1,"price":0.1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784361773043,"name":"AL534小童","note":"","status":"approved","date":"2026-07-18","imgs":["AL534小童_60_0.jpeg",null,null,null],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上��.压线压后门边线订位","price":0.8,"qty":1},{"type":"pingche","name":"定蝴蝶结","price":0.1,"qty":2},{"type":"pingche","name":"YT衬衣包袖口*2","price":0.5,"qty":1},{"type":"pingche","name":"YT梭织车中腰橡筋","price":0.4,"qty":1},{"type":"pingche","name":"脚卷边","price":0.4,"qty":1},{"type":"zache","name":"扎领散口","price":0.2,"qty":1},{"type":"zache","name":"埋肩上袖埋夹","price":0.5,"qty":1},{"type":"zache","name":"YT梭织缩拼中腰","price":0.3,"qty":1},{"type":"zache","name":"拼裙侧骨落唛","price":0.25,"qty":1}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784360931540,"name":"XK230婴童","note":"","status":"pending","date":"2026-07-18","imgs":["XK230婴童_61_0.jpeg",null,null,null],"selections":[{"type":"pingche","name":"车门边做领上领落唛压线定叠位","price":1.5,"qty":1},{"type":"pingche","name":"车前V。拼前上","price":0.55,"qty":1},{"type":"pingche","name":"车章仔","price":0.25,"qty":2},{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"上脚口","price":0.3,"qty":1},{"type":"zache","name":"扎前v散口","price":0.1,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.35,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤头","price":0.2,"qty":1},{"type":"pingche","name":"包脚口橡筋","price":0.5,"qty":1},{"type":"zache","name":"扎脚口散","price":0.2,"qty":1}]},{"id":1784358193119,"name":"XLG278婴童","note":"","status":"approved","date":"2026-07-18","imgs":["XLG278婴童_62_0.jpeg",null,null,null],"selections":[{"type":"pingche","name":"YT衬衣做门边.做一片领上领落唛","price":1.7,"qty":1},{"type":"pingche","name":"YT梭织车袖口橡筋","price":0.4,"qty":1},{"type":"pingche","name":"YT衬衣衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"肩带拉边拉夹（拉吊带）","price":0.55,"qty":1},{"type":"pingche","name":"定蝴蝶结","price":0.1,"qty":2},{"type":"pingche","name":"YT梭织夹底倒针","price":0.2,"qty":1},{"type":"pingche","name":"YT梭织车中腰橡筋","price":0.3,"qty":1},{"type":"pingche","name":"YT梭织裙摆卷边","price":0.4,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"密扎","price":0.2,"qty":1},{"type":"zache","name":"YT梭织缩拼中腰","price":0.3,"qty":1},{"type":"zache","name":"拼侧骨*3落唛","price":0.35,"qty":1},{"name":"裙子埋夹","type":"zache","qty":1,"price":0.15},{"name":"缩袖顶","type":"pingche","qty":1,"price":0.2}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784357700664,"name":"AL538婴童","note":"","status":"approved","date":"2026-07-18","imgs":["AL538婴童_63_0.png",null,null,null],"selections":[{"type":"pingche","name":"上腰定双唛","price":0.2,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤腰","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1}],"approvedBy":{"uid":"mrptvh66g0ej","username":"陈林英"}},{"id":1784357573496,"name":"XLY87婴童","note":"","status":"approved","date":"2026-07-18","imgs":["XLY87婴童_64_0.png",null,null,null],"selections":[{"type":"pingche","name":"YT衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"划位车���袋","price":0.4,"qty":1},{"type":"pingche","name":"车章仔","price":0.25,"qty":2},{"type":"pingche","name":"做袖口一整套","price":1.6,"qty":1},{"type":"pingche","name":"YT衬衣衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"压上衣后上双线","price":0.2,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"pingche","name":"压弯袋双线","price":0.35,"qty":1},{"type":"pingche","name":"YT压链牌线.前后浪","price":0.65,"qty":1},{"type":"pingche","name":"YT卷裤脚口","price":0.5,"qty":1},{"type":"pingche","name":"压后上飞机头","price":0.4,"qty":1},{"type":"pingche","name":"包后袋口装袋压双线","price":1.2,"qty":1},{"type":"zache","name":"YT埋肩.上袖.埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长��）","price":0.4,"qty":1},{"name":"打后幅褶","type":"pingche","qty":1,"price":0.2},{"name":"拼上衣后幅","type":"zache","qty":1,"price":0.1},{"name":"拼假袋","type":"zache","qty":1,"price":0.15},{"name":"扎拉链牌散口","type":"zache","qty":1,"price":0.05}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784357346720,"name":"XLY82婴童","note":"","status":"approved","date":"2026-07-18","imgs":["XLY82婴童_65_0.png",null,null,null],"selections":[{"type":"pingche","name":"开胸上领定唛压领线","price":0.9,"qty":1},{"type":"pingche","name":"做肩带车内贴压线","price":1.6,"qty":1},{"type":"pingche","name":"划位车口袋","price":0.4,"qty":3},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"pingche","name":"YT压链牌线.前后浪","price":0.7,"qty":1},{"type":"pingche","name":"包脚口","price":0.5,"qty":1},{"type":"zache","name":"YT扎领.胸贴散口","price":0.25,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼���后浪埋浪（长裤）","price":0.45,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"name":"袖口倒针","type":"pingche","qty":1,"price":0.2},{"name":"拼假","type":"zache","qty":1,"price":0.15},{"name":"拼前腰","type":"zache","qty":1,"price":0.1},{"name":"压前腰线","type":"pingche","qty":1,"price":0.1}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784357102384,"name":"XLY48婴童","note":"","status":"approved","date":"2026-07-18","imgs":["XLY48婴童_66_0.png",null,null,null],"selections":[{"type":"pingche","name":"拼领上领定拉链贴开拉链胸压线.落唛盖领","price":1.8,"qty":1},{"type":"pingche","name":"YT衬衣包袖口*2","price":0.4,"qty":1},{"type":"pingche","name":"YT衬衣包衫脚","price":0.35,"qty":1},{"type":"pingche","name":"YT包裤脚口","price":0.5,"qty":1},{"type":"pingche","name":"上腰定唛.压裤头线","price":0.45,"qty":1},{"type":"pingche","name":"划位车口袋","price":0.4,"qty":1},{"type":"zache","name":"YT埋肩.上袖.埋夹落唛","price":0.6,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"YT拼侧骨落唛(短裤)","price":0.25,"qty":1},{"type":"zache","name":"YT拼前后浪(短裤)","price":0.3,"qty":1},{"name":"扎拉链贴","type":"pingche","qty":1,"price":0.15}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784356368065,"name":"XLB521婴童","note":"","status":"approved","date":"2026-07-18","imgs":["XLB521婴童_67_0.png",null,null,null],"selections":[{"type":"pingche","name":"做领上领定唛压只压门边线","price":1.5,"qty":1},{"type":"pingche","name":"点位装袋","price":0.3,"qty":1},{"type":"pingche","name":"YT裤定唛","price":0.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨*4落唛","price":0.55,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"YT冚袖口","price":0.2,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤腰","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1},{"type":"kanche","name":"冚小袋口","price":0.07,"qty":1},{"name":"扎领.门边散口","type":"zache","qty":1,"price":0.3},{"name":"","type":"pingche","qty":1,"price":0}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784356067097,"name":"XLB523婴童","note":"","status":"approved","date":"2026-07-18","imgs":["XLB523婴童_68_0.png",null,null,null],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"YT裤定唛","price":0.1,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"kanche","name":"YT冚裤���","price":0.2,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚.脚口","price":1.1,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784355660857,"name":"XLB520婴童","note":"","status":"approved","date":"2026-07-18","imgs":["XLB520婴童_69_0.png",null,null,null],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"YT裤定唛","price":0.1,"qty":1},{"type":"pingche","name":"车老鼠袋","price":0.35,"qty":1},{"type":"pingche","name":"定裤绳.倒针*2","price":0.3,"qty":1},{"type":"zache","name":"YT拼帽上帽","price":0.35,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.85,"qty":1},{"type":"zache","name":"YT埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"拼上衣","price":0.2,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"���前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"YT冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"冚袋口","price":0.15,"qty":1}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784355124779,"name":"XLB518婴童","note":"","status":"approved","date":"2026-07-18","imgs":["XLB518婴童_70_0.png",null,null,null],"selections":[{"type":"pingche","name":"YT衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"划位车口袋.装袋盖","price":2,"qty":1},{"type":"pingche","name":"做袖口一整套","price":1.6,"qty":1},{"type":"pingche","name":"上下摆压三边明线","price":1.1,"qty":1},{"type":"pingche","name":"上腰定腰侧","price":0.7,"qty":1},{"type":"pingche","name":"压弯袋线","price":0.2,"qty":1},{"type":"zache","name":"YT埋肩.上袖.埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"YT拼侧骨落唛","price":0.3,"qty":1},{"type":"zache","name":"YT针织拼前后浪埋浪","price":0.4,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1},{"name":"拼假袋","type":"pingche","qty":1,"price":0.15}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784354711323,"name":"XLB528婴童","note":"","status":"pending","date":"2026-07-18","imgs":["XLB528婴童_71_0.png",null,null,null],"selections":[{"type":"pingche","name":"上领定唛压门边线","price":1.2,"qty":1},{"type":"pingche","name":"做袖口一整套","price":1.6,"qty":1},{"type":"pingche","name":"YT衬衣衫脚���边","price":0.35,"qty":1},{"type":"zache","name":"YT埋肩.上袖.埋夹落唛","price":0.6,"qty":1}]},{"id":1784345335405,"name":"XLG282小童套装","note":"","status":"approved","date":"2026-07-18","imgs":["XLG282小童套装_72_0.png",null,null,null],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"车定蝴蝶结","price":1.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"pingche","name":"YT压链牌线.前后浪","price":0.65,"qty":1},{"type":"pingche","name":"压弯袋双线","price":0.35,"qty":1},{"type":"pingche","name":"压裤中双线","price":0.8,"qty":1},{"type":"pingche","name":"压后上飞机头","price":0.4,"qty":1},{"type":"pingche","name":"划位车口袋","price":1.2,"qty":1},{"type":"pingche","name":"YT卷裤脚口","price":0.5,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"YT上领.上衫脚.上袖口","price":0.8,"qty":1},{"type":"zache","name":"YT扎腰.拉链贴散口","price":0.25,"qty":1},{"type":"zache","name":"YT拼前后��浪底","price":0.5,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.45,"qty":1},{"name":"拼飞机头","type":"zache","qty":1,"price":0.2},{"name":"YT拼假裤袋","type":"zache","qty":1,"price":0.15},{"name":"拼裤前","type":"zache","qty":1,"price":0.4}],"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784877142177,"name":"AL541婴童","note":"","status":"approved","date":"2026-07-24","imgs":["AL541婴童_73_0.png"],"selections":[{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"车章仔（特殊）","price":0.3,"qty":1},{"type":"pingche","name":"上拉链车定拉链盖压线","price":1.1,"qty":1},{"type":"pingche","name":"装前中开拉链.老鼠袋","price":0.6,"qty":1},{"type":"zache","name":"上帽拼帽","price":0.35,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"上衫脚","price":0.2,"qty":1},{"type":"kanche","name":"冚帽边","price":0.15,"qty":1},{"type":"kanche","name":"冚袋口","price":0.15,"qty":1},{"name":"扎拉链盖散口","type":"zache","qty":1,"price":0.05}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784876836337,"name":"LL355大童","note":"","status":"approved","date":"2026-07-24","imgs":["LL355大童_74_0.jpeg"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"倒针","price":0.1,"qty":2},{"type":"pingche","name":"定蝴蝶结","price":0.1,"qty":2},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛（大童）","price":0.8,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（大童）","price":0.5,"qty":1},{"type":"zache","name":"拼前后浪埋浪（大童）","price":0.55,"qty":1},{"type":"kanche","name":"冚车拉领边（大童）","price":0.18,"qty":1},{"type":"kanche","name":"YT冚袖口","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"name":"冚车拉衫脚边","type":"kanche","qty":1,"price":0.22}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784876351186,"name":"AL546小童","note":"","status":"approved","date":"2026-07-24","imgs":["AL546小童_75_0.jpeg"],"selections":[{"type":"pingche","name":"做门边做上下级领上领落唛（衬衫）","price":2.3,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英","price":1.2,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784876243058,"name":"XLB529婴童","note":"","status":"approved","date":"2026-07-24","imgs":["XLB529婴童_76_0.jpeg"],"selections":[{"type":"pingche","name":"做领开胸上领一整套","price":1.8,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"zache","name":"上袖口","price":0.3,"qty":1},{"type":"zache","name":"上裤脚口","price":0.3,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"拼上衣","price":0.2,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1},{"name":"冚裤头","type":"kanche","qty":1,"price":0.2},{"name":"扎胸贴散口","type":"zache","qty":1,"price":0.15}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784876057162,"name":"XLB530婴童","note":"","status":"approved","date":"2026-07-24","imgs":["XLB530婴童_77_0.jpeg"],"selections":[{"type":"pingche","name":"上衣定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.7,"qty":1},{"type":"zache","name":"上领口.袖口.衫脚","price":0.8,"qty":1},{"type":"zache","name":"扎腰散口","price":0.2,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"kanche","name":"YT冚裤脚","price":0.2,"qty":1}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784875810002,"name":"AL553婴童","note":"","status":"approved","date":"2026-07-24","imgs":["AL553婴童_78_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"夹底倒针","price":0.2,"qty":1},{"type":"pingche","name":"YT衬衣做门边.做一片领上领","price":1.7,"qty":1},{"type":"pingche","name":"拉袖衩倒针定褶做袖英压三边明线","price":1.6,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.35,"qty":1},{"type":"pingche","name":"平车上裤头（两侧倒针加订唛头）","price":0.7,"qty":1},{"type":"pingche","name":"压弯袋双线","price":0.35,"qty":1},{"type":"pingche","name":"压前后浪及链牌双线","price":0.65,"qty":1},{"type":"pingche","name":"走裤脚线","price":0.3,"qty":1},{"type":"zache","name":"拼吊带侧骨落唛","price":0.25,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎腰散.链牌口","price":0.25,"qty":1},{"type":"zache","name":"拼侧骨落唛（长裤）","price":0.3,"qty":1},{"type":"zache","name":"拼前后浪埋浪（长裤）","price":0.4,"qty":1},{"type":"kanche","name":"冚车拉边","price":0.55,"qty":1},{"type":"kanche","name":"冚衫脚","price":0.15,"qty":1},{"name":"拼假袋口","type":"zache","qty":1,"price":0.15}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784875494163,"name":"LL352小童","note":"","status":"approved","date":"2026-07-24","imgs":["LL352小童_79_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"拉边","price":0.15,"qty":1},{"type":"pingche","name":"压假门边线","price":0.2,"qty":1},{"type":"pingche","name":"做假袋口","price":0.8,"qty":1},{"type":"pingche","name":"合袖衩顶压线做袖英(压三边明线)","price":1.5,"qty":1},{"type":"pingche","name":"衫脚卷边","price":0.4,"qty":1},{"type":"pingche","name":"合拉链位上隐形拉链.拉链头倒针落拉链贴等","price":1.1,"qty":1},{"type":"zache","name":"埋肩上袖埋夹（开袖叉）","price":0.65,"qty":1},{"type":"zache","name":"拼上中腰*2","price":0.55,"qty":1},{"type":"zache","name":"拼裙侧骨落唛","price":0.25,"qty":1},{"name":"车订工字褶*4","type":"pingche","qty":1,"price":0.6},{"name":"拼裙","type":"pingche","qty":1,"price":0.4},{"name":"扎拉链贴","type":"zache","qty":1,"price":0.25},{"name":"拼后中一段.扎拉链位散口（大童长裙）","type":"zache","qty":1,"price":0.3}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784875135538,"name":"LL342大童","note":"","status":"approved","date":"2026-07-24","imgs":["LL342大童_80_0.jpeg"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上肩带耳仔","price":0.8,"qty":1},{"type":"pingche","name":"裙子定唛","price":0.1,"qty":1},{"type":"zache","name":"二合一上领","price":0.4,"qty":1},{"type":"zache","name":"上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"拼上裙腰","price":0.25,"qty":1},{"type":"zache","name":"拼侧骨落唛","price":0.3,"qty":1},{"type":"zache","name":"密扎","price":1.2,"qty":1},{"type":"kanche","name":"冚腰头","price":0.2,"qty":1},{"name":"包领橡筋","type":"pingche","qty":1,"price":0.5}],"createdBy":{"uid":"mrptrohcj8cl","username":"没事吃点溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784895308919,"name":"XLM183小童","note":"","status":"approved","date":"2026-07-24","imgs":["XLM183小童_81_0.png"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"pingche","name":"做肩带车���贴压线开测叉","price":2.4,"qty":1},{"type":"pingche","name":"划位车口袋.���袋盖","price":0.9,"qty":1},{"type":"pingche","name":"YT卷裤脚口","price":0.5,"qty":1},{"type":"zache","name":"上领口","price":0.25,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.7,"qty":1},{"type":"zache","name":"扎整件散口","price":0.45,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.6,"qty":1},{"type":"kanche","name":"YT冚袖口","price":0.2,"qty":1},{"type":"kanche","name":"YT冚衫脚","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784895363807,"name":"XLM177小童","note":"","status":"approved","date":"2026-07-24","imgs":["XLM177小童_82_0.png"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"zache","name":"上袖口.扎衫脚","price":0.5,"qty":1},{"type":"zache","name":"埋肩上袖埋夹落唛","price":0.65,"qty":1},{"type":"zache","name":"扎门边散","price":0.25,"qty":1},{"name":"拼小方压线","type":"pingche","qty":1,"price":0.4},{"name":"订拼4个脚围","type":"pingche","qty":1,"price":0.4},{"name":"合脚位","type":"pingche","qty":1,"price":0.2},{"name":"上螺纹领","type":"pingche","qty":1,"price":0.25},{"name":"套门边压一圈线","type":"pingche","qty":1,"price":0.9},{"name":"订肩位","type":"pingche","qty":1,"price":0.2},{"name":"扎领散","type":"pingche","qty":1,"price":0.1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}},{"id":1784895589806,"name":"XLM179小童","note":"","status":"approved","date":"2026-07-24","imgs":["XLM179小童_83_0.png"],"selections":[{"type":"pingche","name":"定唛","price":0.1,"qty":1},{"type":"pingche","name":"包领橡筋","price":0.5,"qty":1},{"type":"pingche","name":"定耳仔","price":0.1,"qty":4},{"type":"pingche","name":"定蝴蝶结","price":0.1,"qty":4},{"type":"pingche","name":"上腰定唛","price":0.1,"qty":1},{"type":"zache","name":"拼领上领","price":0.25,"qty":1},{"type":"zache","name":"上袖埋夹落唛","price":0.6,"qty":1},{"type":"zache","name":"密扎","price":0.6,"qty":1},{"type":"zache","name":"上腰橡筋","price":0.2,"qty":1},{"type":"zache","name":"XT拼侧骨落唛","price":0.45,"qty":1},{"type":"zache","name":"XT拼前后浪埋浪","price":0.5,"qty":1},{"type":"kanche","name":"冚裤头","price":0.2,"qty":1},{"type":"kanche","name":"冚裤脚","price":0.2,"qty":1}],"createdBy":{"uid":"mryo7sas6cbg","username":"溜溜梅"},"approvedBy":{"uid":"mryo7f1ljzw5","username":"19820311682"}}],"processes":{"pingche":[{"id":1784356200353,"name":"做上下领定唛压门边线","price":1.7},{"id":1784354500515,"name":"划位车口袋.装袋.做.订袋盖","price":0.9},{"id":1784354527218,"name":"做袖口一整套","price":1.6},{"id":1784549849658.4846,"name":"衫脚卷边","price":0.35},{"id":1784342709400,"name":"裤子定唛","price":0.1},{"id":1784354569314,"name":"压弯袋线","price":0.2},{"id":1784549974451.5784,"name":"开胸定唛压领线","price":0.9},{"id":1784549974451.7,"name":"包脚口","price":0.5},{"id":1784342709495,"name":"梭织车定前领假飘带","price":0.5},{"id":1784342709051,"name":"梭织木耳边卷边+缩褶","price":0.5},{"id":1784342709056,"name":"梭织上木耳边+压线","price":0.6},{"id":1784342708794,"name":"YT梭织做上���领定唛压门边线","price":2.5},{"id":1784342709456,"name":"YT梭织缩里���+面布袖山","price":0.4},{"id":1784342708745,"name":"YT梭织拼面布里布袖测","price":0.4},{"id":1784342708676,"name":"YT梭织缩拼袖口","price":0.6},{"id":1784342708696,"name":"YT梭织车袖口橡筋","price":0.4},{"id":1784342709504,"name":"YT梭织套袖山","price":0.3},{"id":1784342709231,"name":"YT梭织衫脚卷边","price":0.35},{"id":1784342708995,"name":"YT梭织缩裤脚","price":0.3},{"id":1784342709267,"name":"YT梭织上裤头套返裤子","price":1.5},{"id":1784342709516,"name":"YT梭织裤侧���蝴蝶","price":0.2},{"id":1784342708705,"name":"YT针织上衣.裤子定唛","price":0.2},{"id":1784342709323,"name":"YT上衣裤子定唛+洗水唛","price":0.3},{"id":1784342708732,"name":"YT梭织定唛","price":0.1},{"id":1784342709513,"name":"YT梭织上撞色领边","price":0.2},{"id":1784342708760,"name":"YT梭织走缩领木耳边","price":0.15},{"id":1784342709165,"name":"YT梭织折领边上木耳边","price":0.25},{"id":1784342709403,"name":"YT梭织折压后门筒定叠位压领线","price":0.3},{"id":1784342709329,"name":"YT梭织走缩飞袖","price":0.2},{"id":1784342708934,"name":"YT梭织腰褶走线","price":0.6},{"id":1784342708863,"name":"YT梭织���.剪蝴蝶结","price":0.1},{"id":1784342709020,"name":"YT梭织蝴蝶尾倒针","price":0.2},{"id":1784342708908,"name":"YT梭织打蝴蝶.定��蝶","price":0.15},{"id":1784342709016,"name":"YT梭织车定腰蝴蝶结","price":0.5},{"id":1784342708994,"name":"YT梭织车中腰橡筋","price":0.3},{"id":1784342709208,"name":"定唛","price":0.1},{"id":1784342708875,"name":"YT牛仔车弯袋","price":0.8},{"id":1784342708652,"name":"YT牛仔包裤脚","price":0.4},{"id":1784342709414,"name":"YT牛仔上腰头","price":0.4},{"id":1784342709457,"name":"YT牛仔贴假拉链牌","price":0.15},{"id":1784342708696,"name":"倒���","price":0.1},{"id":1784342709556,"name":"YT梭织做门边.做一片领上领","price":1.71},{"id":1784342709410,"name":"YT梭织车领花边","price":0.25},{"id":1784342709317,"name":"YT梭织拉夹圈","price":0.3},{"id":1784342709395,"name":"YT梭织压夹圈线","price":0.4},{"id":1784342708996,"name":"YT梭织夹底倒针","price":0.2},{"id":1784342709284,"name":"YT梭织裙摆卷边","price":0.4},{"id":1784342708660,"name":"YT车订章仔.定恐龙","price":1},{"id":1784342708980,"name":"YT车袋口.装袋","price":0.4},{"id":1784342709238,"name":"YT压前后.及拉链牌线","price":0.65},{"id":1784342709337,"name":"YT压裤假袋双线","price":0.35},{"id":1784342708899,"name":"YT上腰头","price":0.4},{"id":1784342708988,"name":"YT卷裤脚","price":0.4},{"id":1784342708766,"name":"YT装袋","price":0.25},{"id":1784342708949,"name":"YT开胸上领","price":1.05},{"id":1784342708702,"name":"YT压裤前线","price":0.2},{"id":1784342709400,"name":"YT裤定唛","price":0.1},{"id":1784342709353,"name":"YT上腰头定","price":0.4},{"id":1784342708690,"name":"YT压链牌线.前后浪","price":0.65},{"id":1784342709060,"name":"车章仔","price":0.25},{"id":1784342708744,"name":"YT压夹圈线","price":0.4},{"id":1784342708870,"name":"YT套内夹圈","price":0.45},{"id":1784342709318,"name":"YT衫脚倒针","price":0.2},{"id":1784342709243,"name":"运返耳仔.定耳仔*1","price":0.3},{"id":1784342708980,"name":"定侧线","price":0.3},{"id":1784342709454,"name":"YT衬衣做门边.做一片领上领","price":1.7},{"id":1784342709582,"name":"YT衬衣包袖口*2","price":0.4},{"id":1784342708947,"name":"YT���衣衫脚卷边","price":0.35},{"id":1784342709587,"name":"YT衬衣��腰头","price":0.4},{"id":1784342708694,"name":"YT衬衣包裤脚*2","price":0.4},{"id":1784342709133,"name":"YT衬衣做门边.做领上下领","price":2.1},{"id":1784342708833,"name":"YT卷裤脚口","price":0.5},{"id":1784342708879,"name":"YT压假裤袋线","price":0.2},{"id":1784342709551,"name":"YT上衣车袋口装袋","price":0.4},{"id":1784342708793,"name":"YT拼假裤袋","price":0.15},{"id":1784344333174,"name":"车定蝴蝶结","price":1.1},{"id":1784344895589,"name":"压弯袋双线","price":0.35},{"id":1784344918061,"name":"压裤中双线","price":0.8},{"id":1784344940165,"name":"压后上飞机头","price":0.4},{"id":1784344995509,"name":"车口袋压双线","price":1.6},{"id":1784354880042,"name":"上领定唛压门边线","price":1.2},{"id":1784355369986,"name":"车老鼠袋","price":0.6},{"id":1784355402706,"name":"定裤绳.倒针*2","price":0.3},{"id":1784356257481,"name":"划位车口袋","price":1.2},{"id":1784356964648,"name":"做上下领定唛","price":1.2},{"id":1784357000832,"name":"上拉链车定拉链贴���线","price":1.1},{"id":1784357174193,"name":"开胸上领定唛压领线","price":0.9},{"id":1784357206648,"name":"做肩带车���贴压线","price":1.2},{"id":1784357440008,"name":"压上衣��上双线","price":0.2},{"id":1784357651152,"name":"上腰定双唛","price":0.2},{"id":1784358019095,"name":"肩带拉边拉夹","price":0.55},{"id":1784358045359,"name":"定蝴蝶结","price":0.1},{"id":1784360568605,"name":"车门���做领上领落唛压线定叠位","price":1.5},{"id":1784360588797,"name":"车前V。拼前上","price":0.55},{"id":1784360895788,"name":"包脚口橡筋","price":0.5},{"id":1784361513469,"name":"压后门边线","price":0.4},{"id":1784362525507,"name":"剪定腰耳仔*3","price":0.7},{"id":1784516103815,"name":"一片领","price":1.7},{"id":1784516103718,"name":"门边","price":0.6},{"id":1784598976911,"name":"订唛（单唛）","price":0.1},{"id":1784598976960,"name":"订唛（双唛）","price":0.2},{"id":1784598977518,"name":"包后领（织带含唛头）","price":0.6},{"id":1784598976941,"name":"包后领（本布）","price":0.6},{"id":1784598977044,"name":"压前领线（整圈）","price":0.2},{"id":1784598976757,"name":"压前领线（半圈）","price":0.15},{"id":1784598977155,"name":"倒针（暗针","price":0},{"id":1784598977257,"name":"拼螺纹","price":0.1},{"id":1784598976838,"name":"订蝴蝶结","price":0.1},{"id":1784598977371,"name":"缩��袖","price":0.2},{"id":1784598977012,"name":"上拉链","price":0.6},{"id":1784598976901,"name":"开胸（正胸）","price":0.2},{"id":1784598977179,"name":"开胸（偏胸）","price":1},{"id":1784598977296,"name":"开胸加上拉链","price":1.1},{"id":1784598977669,"name":"打、订蝴蝶结","price":0.2},{"id":1784598977297,"name":"做领开胸上领一整套","price":1.8},{"id":1784598976988,"name":"车袖口橡筋*1","price":0.1},{"id":1784598976861,"name":"车门边做领上���唛（衬衫）","price":1.7},{"id":1784598977719,"name":"包袖口*1","price":0.25},{"id":1784598977406,"name":"包裤头","price":0.4},{"id":1784598977264,"name":"包衫脚（普通）","price":0.35},{"id":1784598977648,"name":"包衫脚（弧形）","price":0.4},{"id":1784598977392,"name":"车反头带.封口","price":0.5},{"id":1784598977531,"name":"上裤头（普通）","price":0.5},{"id":1784598977192,"name":"平车上裤头（两侧倒针加订唛头）","price":0.7},{"id":1784598977204,"name":"订横唛（明暗线一样）","price":0.2},{"id":1784598977239,"name":"订横唛（明暗线一样）+码标剪标","price":0.3},{"id":1784598977078,"name":"订水洗唛（需手剪）","price":0.1},{"id":1784598977499,"name":"开弯袋*1（单线）","price":0.3},{"id":1784598977129,"name":"开弯袋*1（双线）","price":0.4},{"id":1784598977035,"name":"开弯袋*1（压内线）","price":0.35},{"id":1784598977615,"name":"包脚口丈根长裤*1(级车级散口）","price":0.25},{"id":1784598976824,"name":"包脚口丈根长裤*1（平车直接包）","price":0.3},{"id":1784598977522,"name":"包脚口丈根短裤*1（钣车级散口）","price":0.25},{"id":1784598976967,"name":"包脚口丈根短裤*1（平车直接包）","price":0.3},{"id":1784598977461,"name":"上落坑线裤头（平车拼）","price":1},{"id":1784598976823,"name":"订位装口袋（尖角）","price":0.45},{"id":1784598977375,"name":"订位装口袋（圆角）","price":0.4},{"id":1784598977156,"name":"订位装口袋（卷口）","price":0.5},{"id":1784598977249,"name":"做反订耳仔","price":0.4},{"id":1784598977666,"name":"车章仔��普通）","price":0.25},{"id":1784598976853,"name":"车章仔��特殊）","price":0.3},{"id":1784598976874,"name":"上下领","price":2.3},{"id":1784598977283,"name":"做订蝴蝶结","price":2.7},{"id":1784598977027,"name":"缩褶","price":0.15},{"id":1784599340651.597,"name":"做门边.做领上领定唛","price":1.7},{"id":1784599340651.5054,"name":"上腰橡筋","price":0.2},{"id":1784599340651.1855,"name":"拼侧骨落唛","price":0.3},{"id":1784599340651.3076,"name":"拼前后浪埋浪","price":0.4},{"id":1784601504618.499,"name":"车前中牙签线","price":0.4},{"id":1784873790516.28,"name":"领口袖口倒针*4","price":0.4},{"id":1784873790516.2476,"name":"压前幅线","price":0.3},{"id":1784873790516.001,"name":"缩拼荷叶边","price":0.3},{"id":1784873869882.8997,"name":"上衣定唛","price":0.1},{"id":1784873869882.579,"name":"直包腰定唛","price":0.5},{"id":1784873869882.601,"name":"剪定腰耳仔","price":0.65},{"id":1784873869882.653,"name":"压双线袋口","price":0.35},{"id":1784873869882.893,"name":"压前中双线","price":0.2},{"id":1784873869882.159,"name":"划位车袋盖.口袋","price":2.2},{"id":1784873869882.354,"name":"压后中双线","price":0.2},{"id":1784873963849.7004,"name":"上拉链做定拉链贴压线","price":1.1},{"id":1784873963849.654,"name":"包袖口橡筋","price":0.5},{"id":1784873963849.292,"name":"包衫脚橡筋","price":0.5},{"id":1784873963849.054,"name":"车上衣织带","price":0.9},{"id":1784874009545.0044,"name":"压前幅线走边线","price":0.3},{"id":1784874009545.9727,"name":"车裤口袋","price":0.9},{"id":1784874032020.6511,"name":"上衣定唛压门边线","price":0.5},{"id":1784874032020.7556,"name":"做假袋口","price":0.8},{"id":1784874032020.925,"name":"压脚口.袖口贴","price":1},{"id":1784874080417.5085,"name":"包后领条车横唛","price":0.8},{"id":1784874080417.0403,"name":"压前后浪及链牌双线","price":0.65},{"id":1784874143303.2737,"name":"订横唛（明暗线一样）+ 码标剪标","price":0.3},{"id":1784874143303.6265,"name":"领口.裤脚倒针","price":0.5},{"id":1784874143303.3398,"name":"压假织带线","price":0.4},{"id":1784874143303.9102,"name":"车返耳朵折订耳朵订位","price":0.7},{"id":1784874284916,"name":"上侧骨织带","price":0.4},{"id":1784875021667,"name":"上肩带耳仔","price":0.8},{"id":1784875307171,"name":"拉边","price":0.15},{"id":1784875334994,"name":"压假门边线","price":0.2},{"id":1784875415982,"name":"拉袖衩倒针定褶做袖英压三边明线","price":1.6},{"id":1784875416339,"name":"拉袖衩倒针定褶做袖英","price":1.3},{"id":1784876159752,"name":"开胸做领上领落唛压线一整套","price":1.8},{"id":1784876696513,"name":"领口倒针","price":0.1},{"id":1784885631286,"name":"上侧骨织带拼侧骨*4","price":1.6},{"id":1784886031892,"name":"上拉链车定拉链盖压线","price":1.1},{"id":1784886031916,"name":"装前中开拉链.老鼠袋","price":0.6},{"id":1784886256920,"name":"做门边做上下级领上领落唛（衬衫）","price":2.3},{"id":1784889737285,"name":"��底��针","price":0.2},{"id":1784889736629,"name":"走裤脚线","price":0.3},{"id":1784893100123,"name":"合袖衩顶压线做袖英(压三边明线)","price":1.5},{"id":1784893100522,"name":"合拉链位上隐形拉链.拉链头倒针落拉链贴","price":1.1},{"id":1784893099931,"name":"车订工字褶*4","price":0.6},{"id":1784893100382,"name":"拼裙","price":0.25},{"id":1784893100156,"name":"拼后中一段.扎拉链位散口（大童长裙）","price":0.3},{"id":1784894020281,"name":"包领橡筋","price":0.5},{"id":1784895447702,"name":"定耳仔","price":0.1},{"id":1784895476094,"name":"做肩带车内贴压线","price":1.6},{"id":1784895476382,"name":"划位车口袋.装袋盖","price":2},{"id":1784896798031,"name":"拼小方压线","price":0.4},{"id":1784896797620,"name":"订拼4个脚围","price":0.4},{"id":1784896798315,"name":"合脚位","price":0.2},{"id":1784896797890,"name":"上螺纹领","price":0.25},{"id":1784896797791,"name":"套门边压一圈线","price":0.9},{"id":1784896797859,"name":"订肩位","price":0.2},{"id":1784896797988,"name":"扎领散","price":0},{"id":1784897855740,"name":"做肩带车���贴压线开测叉","price":2.4},{"id":1784898073219,"name":"上领.压线压后门边线订位","price":0.8},{"id":1784898073750,"name":"脚卷边","price":0.4},{"id":1784963808620,"name":"做领结","price":0.6},{"id":1784964208804,"name":"套里布压线","price":0.6},{"id":1784965626501,"name":"做门边做一片领上领落唛（衬衫）","price":1.7},{"id":1784966175725,"name":"车花边","price":0.4},{"id":1784966450942,"name":"车章仔（普通）","price":0.25},{"id":1784979929063,"name":"订后褶*2","price":0.2},{"id":1784980290117,"name":"开胸做领上领落唛压领线一整套","price":1.1},{"id":1784980289514,"name":"包裤脚口","price":0.5},{"id":1784980720434,"name":"上腰定唛（只后中缝倒针）","price":0.7},{"id":1784980720598,"name":"拼假袋","price":0.15},{"id":1784980981333,"name":"开胸压线","price":0.8},{"id":1784980981697,"name":"订","price":0},{"id":1784980981751,"name":"衫脚倒针","price":0},{"id":1784981855806,"name":"做帽子","price":0.7},{"id":1784981855767,"name":"车定小月亮拉链护贴","price":0.3},{"id":1784981855730,"name":"拼门襟.螺纹脚点","price":0.4},{"id":1784981855881,"name":"上拉链.上帽.套门边.压领.门边线","price":1.35},{"id":1785046392722,"name":"上领","price":0.3},{"id":1785046811572,"name":"手工褶裙摆","price":1.6},{"id":1785046995995,"name":"定牙齿","price":0.1},{"id":1785047042035,"name":"车返角","price":0.3},{"id":1785048975675,"name":"YT上腰定唛","price":0.1},{"id":1785049051290,"name":"缩袖顶","price":0.2},{"id":1785049322243,"name":"定肩压织带线","price":0.6},{"id":1785054328042.6895,"name":"埋肩上袖埋夹落唛","price":0.6},{"id":1785054328042.6746,"name":"拼前后浪.埋浪","price":0.3},{"id":1785201261127,"name":"扎领散口","price":0.1},{"id":1785201261306,"name":"扎胸贴散口","price":0.15},{"id":1785209350628,"name":"划位车���袋","price":0.4},{"id":1785209350703,"name":"压上衣后上双线","price":0.2},{"id":1785209350054,"name":"包袋口装压双线","price":1.2},{"id":1785209350274,"name":"打后幅褶","price":0.2},{"id":1785209350471,"name":"扎拉链牌散口","price":0.05},{"id":1785223986040,"name":"做整��包包","price":1.6},{"id":1785224035608,"name":"做整件马甲","price":2.4},{"id":1785226252792,"name":"定脚口","price":0.4},{"id":1785228071348,"name":"领口订橡筋","price":0.1},{"id":1785232136527,"name":"压后浪","price":0.2},{"id":1785232136818,"name":"做订三角边袋盖","price":1.2},{"id":1785232136680,"name":"点位车订工字褶侧袋","price":1.5},{"id":1785232136382,"name":"车前中拉链.压线","price":1},{"id":1785232136657,"name":"包裤腰（特殊腰）","price":1.5},{"id":1785232136326,"name":"拼假弯袋","price":0.15},{"id":1785232136501,"name":"��袋","price":0},{"id":1785237592658,"name":"划位车口袋.装袋.做袋盖装袋盖","price":2},{"id":1785237592927,"name":"贴前幅拼色走边线","price":0.35},{"id":1785237592700,"name":"上腰定唛（不用订腰测）","price":0.6},{"id":1785237592535,"name":"车裤口袋贴裤袋","price":0.9},{"id":1785239505877,"name":"做门边做领上领落唛（假上下级领）","price":2},{"id":1785239505888,"name":"YT裤腰定唛","price":0.1},{"id":1785239505880,"name":"YT包裤脚口","price":0.5},{"id":1785239505628,"name":"压上衣后幅","price":0.1},{"id":1785240146982,"name":"做门边做（假上下级领）上领落唛（衬衫）","price":2},{"id":1785240147119,"name":"扎马甲","price":1.1},{"id":1785241027964,"name":"上下摆压线","price":1},{"id":1785241028130,"name":"上腰定���","price":0.7},{"id":1785241622137,"name":"上下摆压三边明线","price":1.1},{"id":1785241622162,"name":"上腰定腰侧","price":0.7},{"id":1785242426853,"name":"上腰定唛","price":0.7},{"id":1785242529252,"name":"包后袋口装袋压双线","price":1.2},{"id":1785242937757,"name":"YT衬衣做门边.做一片领上领落唛","price":1.7},{"id":1785243048616,"name":"肩带拉边拉夹（拉吊带）","price":0.55},{"id":1785482101953,"name":"缩订飞袖","price":0.45},{"id":1785482102152,"name":"密扎","price":0.2},{"id":1785482101686,"name":"缩拼裙摆","price":0.3},{"id":1785482358482,"name":"领子拉边","price":0.15},{"id":1785482358624,"name":"后领口倒针","price":0.2},{"id":1785485015265,"name":"运反下摆两端上下摆包下摆压三边明线","price":1.1},{"id":1785485015336,"name":"上腰定唛定腰","price":0.6},{"id":1785485014803,"name":"拼上衣前幅","price":0.2},{"id":1785485015173,"name":"压上衣前幅线","price":0.2},{"id":1785485825422,"name":"包衫脚","price":0.4},{"id":1785485825004,"name":"上腰定唛（只后中缝倒针）牛仔款","price":0.7},{"id":1785485825566,"name":"车袋口点位装袋压双线","price":1.2},{"id":1785485825311,"name":"包裤脚","price":0.5},{"id":1785485825641,"name":"拼裤袋","price":0.15},{"id":1785742592264,"name":"做假袋盖","price":0.8},{"id":1785742648048,"name":"定章仔","price":0.5},{"id":1785743020144,"name":"衬衣做门边.做一片领上领","price":1.7},{"id":1785743020365,"name":"包袖口","price":0.4},{"id":1785743193160,"name":"套帽里布","price":0.3},{"id":1785743651944,"name":"压前后中双线","price":0.8},{"id":1785743706864,"name":"压假袋口线","price":0.8},{"id":1786002621796,"name":"缩袖顶+丝带固定","price":0.45},{"id":1786002813412,"name":"扎拉","price":0.5},{"id":1786003373898,"name":"拼","price":0.15},{"id":1786003428799,"name":"上腰订唛订腰侧","price":0.8},{"id":1786004379568,"name":"拼裙*3侧骨落唛","price":0.28},{"id":1786004379576,"name":"密袖口.裙摆","price":0.55},{"id":1786004740975,"name":"合订帽顶","price":0.1},{"id":1786004741462,"name":"做装饰袋唇","price":0.8},{"id":1786004741641,"name":"扎拉链盖散口","price":0.05},{"id":1786007296131,"name":"贴门边做领口压线.做领上领落唛压三边线","price":2.3},{"id":1786007295853,"name":"封叉顶压后袖.叉位线做袖英压三边明线","price":1.8},{"id":1786007295664,"name":"压上衣前后中双线","price":0.8},{"id":1786007295910,"name":"走口袋线","price":0.45},{"id":1786007295552,"name":"做袋盖压线.订袋盖","price":1},{"id":1786007485868,"name":"划位车口袋装袋.做装袋盖","price":2.2},{"id":1786007822210,"name":"点位.定蝴蝶结","price":0.1},{"id":1786007821623,"name":"裙脚倒针","price":0.1},{"id":1786008276219,"name":"冚袋口","price":0.15},{"id":1786008276160,"name":"压衫脚线","price":0.35},{"id":1786008320154,"name":"包后领","price":0.5},{"id":1786008596899,"name":"拼前幅","price":0.2},{"id":1786008597579,"name":"拼领顶.上领","price":0.31},{"id":1786009408610,"name":"袖口倒针","price":0.2},{"id":1786009409065,"name":"压前腰线","price":0.1},{"id":1786010298649,"name":"领口","price":0},{"id":1786010354258,"name":"领口.衫脚.袖口.裤脚倒针","price":0.6},{"id":1786013011139,"name":"车前V。拼前��","price":0.55},{"id":1786013648491,"name":"拼领上领定拉链贴开拉链胸压线.落唛盖领","price":1.8},{"id":1786013648057,"name":"YT衬衣包衫脚","price":0.35},{"id":1786013648243,"name":"上腰定唛.压裤头线","price":0.45},{"id":1786013648564,"name":"扎拉链贴","price":0.15},{"id":1786013811543,"name":"拉袖衩倒针定褶做袖英压","price":1.3},{"id":1786013811264,"name":"点位车口袋装袋","price":0.4},{"id":1786014019105,"name":"拉袖衩倒针定褶做上袖英","price":1.3},{"id":1786087312091,"name":"做领上领定唛压只压门边线","price":1.5},{"id":1786087312270,"name":"点位装袋","price":0.3},{"id":1786087312832,"name":"","price":0}],"zache":[{"id":1784549849658.9075,"name":"埋肩上袖埋夹落唛","price":0.7},{"id":1784345307939,"name":"扎腰散口","price":0.2},{"id":1784549849658.3513,"name":"拼侧骨落唛","price":0.45},{"id":1784549849658.443,"name":"拼前后浪埋浪","price":0.5},{"id":1784355528802,"name":"上腰橡���","price":0.2},{"id":1784342720124,"name":"YT���织埋肩埋夹落唛上圆袖","price":0.65},{"id":1784342720509,"name":"YT梭织��前拼散口","price":0.15},{"id":1784342721023,"name":"YT梭织扎裤子+里布","price":1.05},{"id":1784342720100,"name":"YT针织埋肩上袖埋夹落唛","price":0.6},{"id":1784342720650,"name":"YT针织���领","price":0.25},{"id":1784342720929,"name":"YT针织拼侧骨落唛","price":0.25},{"id":1784342720075,"name":"YT针织上腰头橡筋","price":0.2},{"id":1784342720273,"name":"YT梭织埋肩上���袖埋夹","price":0.5},{"id":1784342720722,"name":"YT梭织上中腰","price":0.2},{"id":1784342720916,"name":"YT梭织密扎","price":0.8},{"id":1784342720377,"name":"YT牛仔拼前后浪","price":0.2},{"id":1784342720326,"name":"YT牛仔埋浪底","price":0.1},{"id":1784342721059,"name":"YT牛仔扎腰.链牌散口.弯袋散口","price":0.4},{"id":1784342720906,"name":"YT梭织埋肩.埋夹","price":0.3},{"id":1784342720140,"name":"YT梭织缩拼中腰","price":0.3},{"id":1784342720920,"name":"YT上扁机��","price":0.2},{"id":1784342720426,"name":"YT拼裤侧落唛","price":0.3},{"id":1784342720355,"name":"YT扎腰散口","price":0.2},{"id":1784342720436,"name":"YT拼袋口","price":0.07},{"id":1784342720648,"name":"YT扎领.胸贴散口","price":0.25},{"id":1784342720819,"name":"YT扎裤子","price":0.7},{"id":1784342720491,"name":"YT埋肩.埋夹落唛","price":0.4},{"id":1784342720314,"name":"YT拼前后浪","price":0.2},{"id":1784342720880,"name":"YT拼侧骨落唛","price":0.25},{"id":1784342720694,"name":"YT扎腰.链牌散口","price":0.25},{"id":1784342720686,"name":"YT扎车拼下脚","price":0.2},{"id":1784342720558,"name":"YT埋肩埋夹落唛","price":0.45},{"id":1784342721004,"name":"YT拼面夹贴","price":0.25},{"id":1784342720563,"name":"YT上夹贴","price":0.2},{"id":1784342720834,"name":"YT内��埋肩上袖埋夹","price":0.5},{"id":1784342720672,"name":"YT扎内夹圈散口","price":0.2},{"id":1784342720415,"name":"YT拼帽上帽","price":0.35},{"id":1784342720393,"name":"YT上领","price":0.25},{"id":1784342721014,"name":"YT上腰头橡筋","price":0.2},{"id":1784342720583,"name":"YT拉剪领夹圈边","price":0.45},{"id":1784342720934,"name":"YT梭织埋肩上���埋夹落唛","price":0.6},{"id":1784342720812,"name":"YT梭织拼测骨落唛","price":0.3},{"id":1784342720363,"name":"YT梭织扎腰散口","price":0.2},{"id":1784342720570,"name":"YT埋肩.上袖.埋夹落唛（短袖）","price":0.6},{"id":1784342720417,"name":"YT拼前后浪(短裤)","price":0.3},{"id":1784342721033,"name":"YT埋���底(短裤)","price":0.1},{"id":1784342720540,"name":"YT拼侧骨��唛(短裤)","price":0.25},{"id":1784345307300,"name":"上领口.袖口.衫脚","price":0.8},{"id":1784345307443,"name":"XT拼侧骨落唛","price":0.45},{"id":1784345307526,"name":"XT拼前后浪��浪","price":0.5},{"id":1784355501114,"name":"拼上衣","price":0.2},{"id":1784355603002,"name":"拼前后浪埋浪（长裤）","price":0.4},{"id":1784355827729,"name":"上领口.袖口.衫脚.脚口","price":1.1},{"id":1784355901057,"name":"拼侧骨落唛（长裤）","price":0.3},{"id":1784356314312,"name":"拼侧骨*4落唛","price":0.55},{"id":1784357295992,"name":"��袖口","price":0.3},{"id":1784357312264,"name":"扎内贴散口","price":0.2},{"id":1784358100702,"name":"密扎","price":0.2},{"id":1784360738381,"name":"上脚口","price":0.3},{"id":1784360770556,"name":"扎前v散口","price":0.1},{"id":1784361012700,"name":"扎脚口散","price":0.2},{"id":1784361600051,"name":"埋肩上袖埋夹","price":0.6},{"id":1784361622355,"name":"拼裙侧骨落唛","price":0.65},{"id":1784459965487,"name":"扎领散口","price":0.1},{"id":1784460197942,"name":"上夹螺纹","price":0.4},{"id":1784516104183,"name":"YT埋肩上袖埋夹落唛","price":0.65},{"id":1784598994862,"name":"上袖埋夹（短袖）","price":0.6},{"id":1784598995695,"name":"上袖埋夹（长袖）","price":0.65},{"id":1784598995252,"name":"上袖埋夹（插肩袖短袖）","price":0.65},{"id":1784598995545,"name":"上袖埋夹（插肩袖长袖）","price":0.7},{"id":1784598994796,"name":"上领（本布","price":0},{"id":1784598995692,"name":"袖口螺纹*1","price":0.15},{"id":1784598995076,"name":"下摆螺纹","price":0.25},{"id":1784598994861,"name":"密扎飞袖*1","price":0.1},{"id":1784598995555,"name":"密扎下摆","price":0.2},{"id":1784598995556,"name":"密扎袖子*1","price":0.1},{"id":1784598995398,"name":"上裤头丈根","price":0.2},{"id":1784598994830,"name":"裤头散口","price":0.15},{"id":1784598994845,"name":"侧骨*2（长裤）","price":0.3},{"id":1784598995690,"name":"侧骨*2（短裤）","price":0.25},{"id":1784598995327,"name":"前后浪","price":0.2},{"id":1784598994960,"name":"前后浪（长裤）","price":0.2},{"id":1784598995326,"name":"底浪（短裤）","price":0.1},{"id":1784598995521,"name":"弯袋布*2","price":0.15},{"id":1784598995680,"name":"密扎裤脚","price":0.2},{"id":1784598995322,"name":"�����线","price":0.1},{"id":1784598995694,"name":"扎肩","price":0.2},{"id":1784873869882.2605,"name":"埋肩上袖埋夹落唛*2","price":1.3},{"id":1784873869882.9106,"name":"扎袋口散","price":0.1},{"id":1784873869882.5227,"name":"拼袋","price":0.15},{"id":1784873869882.446,"name":"拼前后浪.埋浪","price":0.4},{"id":1784873919253.0164,"name":"上帽拼帽","price":0.35},{"id":1784873919253.1348,"name":"上袖口.衫脚.脚口","price":0.8},{"id":1784873963849.3105,"name":"上袖埋夹落唛","price":0.7},{"id":1784873963849.478,"name":"扎袖口.衫脚.腰.脚口散","price":0.8},{"id":1784874032020.1904,"name":"上腰���唛","price":0.2},{"id":1784874106377.1655,"name":"上领.袖口.衫脚","price":0.8},{"id":1784874143303.25,"name":"拼前幅","price":0.1},{"id":1784874143303.549,"name":"上袖口.脚口","price":0.7},{"id":1784874143303.133,"name":"拼浪底埋浪","price":0.2},{"id":1784875063515,"name":"二合一上领","price":0.4},{"id":1784875105074,"name":"拼裙摆","price":0.4},{"id":1784875715563,"name":"拼吊带侧骨落唛","price":0.25},{"id":1784876757665,"name":"拼侧骨落唛（大童）","price":0.5},{"id":1784876771593,"name":"拼前后浪埋浪（大童）","price":0.55},{"id":1784877121929,"name":"上衫脚","price":0.2},{"id":1784885631041,"name":"上裤头","price":0.2},{"id":1784885631226,"name":"扎侧骨散口*4落唛","price":0.45},{"id":1784886031580,"name":"扎拉链盖散口","price":0.05},{"id":1784886596569,"name":"上裤脚口","price":0.3},{"id":1784886597117,"name":"扎胸贴散口","price":0.15},{"id":1784889737286,"name":"扎腰散.链牌口","price":0.25},{"id":1784889736842,"name":"拼假袋口","price":0.15},{"id":1784890178909,"name":"埋肩上袖埋夹落唛（大童）","price":0.8},{"id":1784893100349,"name":"埋肩上袖埋夹（开袖叉）","price":0.65},{"id":1784893100489,"name":"拼上中腰*2","price":0.55},{"id":1784893100418,"name":"扎拉链贴","price":0.2},{"id":1784894020006,"name":"拼上裙腰","price":0.25},{"id":1784894909287,"name":"扎门边散","price":0.25},{"id":1784895244622,"name":"上领口","price":0.25},{"id":1784896797821,"name":"上袖口.扎衫脚","price":0.5},{"id":1784897052630,"name":"拼领上领","price":0.25},{"id":1784897855848,"name":"扎整件散口","price":0.45},{"id":1784966774817,"name":"上腰橡筋","price":0.2},{"id":1784979929709,"name":"拼后幅","price":0},{"id":1784981855538,"name":"拼帽*2","price":0.35},{"id":1785046556035,"name":"扎袖口散","price":0.2},{"id":1785209350019,"name":"YT埋肩.上袖.埋夹落唛","price":0.6},{"id":1785209350092,"name":"拼前后浪埋浪（长��）","price":0.4},{"id":1785209350682,"name":"拼上衣后幅","price":0.1},{"id":1785224161328,"name":"埋肩","price":0.2},{"id":1785224186312,"name":"埋夹*2","price":0.4},{"id":1785224203344,"name":"上袖","price":0.2},{"id":1785224253632,"name":"拼包包","price":0.2},{"id":1785226237087,"name":"包中腰橡筋","price":0.5},{"id":1785227021431,"name":"埋肩*2上袖.埋夹落唛*2","price":1.1},{"id":1785232136981,"name":"扎拉链贴.左右片","price":0.2},{"id":1785232137150,"name":"拼后浪埋浪.前浪扎散口（长裤）","price":0.55},{"id":1785239505848,"name":"扎衬衫整件","price":0.8},{"id":1785239505272,"name":"扎马甲整件","price":0.95},{"id":1785239505216,"name":"拼后上","price":0.1},{"id":1785240147046,"name":"扎衬衫","price":0.7},{"id":1785241028005,"name":"YT埋肩.上���.埋夹落唛","price":0.6},{"id":1785241027735,"name":"YT拼侧骨落��","price":0.25},{"id":1785241027829,"name":"YT针织拼前后浪埋浪","price":0.3},{"id":1785241914812,"name":"���前后浪埋浪（长裤）","price":0.4},{"id":1785242426872,"name":"拼假袋","price":0.15},{"id":1785242426551,"name":"扎拉链牌散口","price":0.05},{"id":1785242937870,"name":"拼侧骨*3落唛","price":0.35},{"id":1785242937906,"name":"裙子埋夹","price":0.15},{"id":1785393832576,"name":"拼裤子","price":0.4},{"id":1785394644833,"name":"埋肩上袖","price":0.4},{"id":1785482102060,"name":"缩拼��身","price":0.2},{"id":1785482358840,"name":"缩拼裙摆","price":0.4},{"id":1785485015157,"name":"扎腰散口.扎链牌散口","price":0.25},{"id":1785485015265,"name":"拼裤袋","price":0.15},{"id":1785743020635,"name":"XT拼前后浪埋浪","price":0.5},{"id":1786003066561,"name":"扎马甲","price":0.95},{"id":1786003169848,"name":"上袖口","price":0.3},{"id":1786003575013,"name":"YT拼假裤袋","price":0.15},{"id":1786004379647,"name":"扎包包+密口","price":0.4},{"id":1786004379508,"name":"扎裙子身","price":0.65},{"id":1786004379524,"name":"缩拼上中下裙片","price":1},{"id":1786004740970,"name":"拼帽.合帽口.上帽","price":0.65},{"id":1786007295937,"name":"拼前上后上","price":0.3},{"id":1786007295808,"name":"拼后袖.开叉口","price":0.25},{"id":1786007822067,"name":"拼门边两端.上门边","price":0.4},{"id":1786008276752,"name":"扎袖口.拉链盖散口","price":0.25},{"id":1786008276083,"name":"扎衫脚散口","price":0.15},{"id":1786008612885,"name":"拼领顶.上领","price":0.3},{"id":1786009409307,"name":"拼���后浪埋浪（长裤）","price":0.45},{"id":1786009408807,"name":"拼假","price":0.15},{"id":1786009408821,"name":"拼前腰","price":0.1},{"id":1786009847015,"name":"YT埋肩上袖埋夹落唛（前幅夹里布）","price":0.9},{"id":1786013010322,"name":"车门边做领上领落唛压线定叠位","price":1.5},{"id":1786013010685,"name":"拼后浪","price":0.15},{"id":1786013011007,"name":"扎V领螺纹.V领散口","price":0.2},{"id":1786013648475,"name":"YT拼侧骨落唛(短裤)","price":0.25},{"id":1786087312385,"name":"扎领.门边散口","price":0.3},{"id":1786088084450,"name":"YT上领.上衫脚.上袖口","price":0.8},{"id":1786088084739,"name":"YT扎腰.拉链贴散口","price":0.25},{"id":1786088084220,"name":"YT拼前后��浪底","price":0.5},{"id":1786088084256,"name":"拼飞机头","price":0.2},{"id":1786088084210,"name":"拼","price":0.15},{"id":1786088084693,"name":"拼裤前","price":0.4}],"kanche":[{"id":1784549849658.9795,"name":"冚裤脚","price":0.2},{"id":1784342729009,"name":"YT针织冚裤脚","price":0.2},{"id":1784342729448,"name":"YT针织冚下脚","price":0.2},{"id":1784342729601,"name":"YT冚下脚","price":0.2},{"id":1784342729769,"name":"YT冚裤腰","price":0.2},{"id":1784342729791,"name":"YT冚裤��","price":0.2},{"id":1784342729561,"name":"YT背心拉边","price":0.45},{"id":1784342729883,"name":"YT冚衫脚","price":0.2},{"id":1784342729510,"name":"YT冚袖口","price":0.2},{"id":1784342729623,"name":"YT冚帽边","price":0.15},{"id":1784342729061,"name":"YT冚下摆","price":0.2},{"id":1784342729567,"name":"YT拉剪领夹圈边","price":0.45},{"id":1784342729670,"name":"YT拉裤剪边","price":0.35},{"id":1784355646257,"name":"冚袋口","price":0.15},{"id":1784356362937,"name":"冚小袋口","price":0.07},{"id":1784362707994,"name":"拉耳仔","price":0.07},{"id":1784599008500,"name":"袖口*2","price":0.2},{"id":1784599008293,"name":"下脚","price":0.2},{"id":1784599009227,"name":"拉后领","price":0.1},{"id":1784599008623,"name":"袖口*2加下脚（整件）","price":0.35},{"id":1784599008681,"name":"拉领","price":0.15},{"id":1784599008337,"name":"冚帽边","price":0.15},{"id":1784599008406,"name":"�������吊带","price":0.45},{"id":1784599009179,"name":"冚裤头","price":0.2},{"id":1784599009076,"name":"拉裤头","price":0.2},{"id":1784599008754,"name":"冚裤脚（长裤）*2","price":0.2},{"id":1784599009096,"name":"冚裤脚（短裤）*2","price":0.2},{"id":1784873805787.426,"name":"冚车拉边","price":0.15},{"id":1784873805787.384,"name":"冚后幅","price":0.1},{"id":1784873869882.16,"name":"冚车拉耳仔","price":0.05},{"id":1784874143303.3699,"name":"冚浪底","price":0.15},{"id":1784876809545,"name":"冚车拉边（大童）","price":0.2},{"id":1784889736630,"name":"冚衫脚","price":0.2},{"id":1784890178498,"name":"冚车拉领边（大童）","price":0.18},{"id":1784890178477,"name":"冚车拉衫脚边","price":0.22},{"id":1784894020228,"name":"冚腰头","price":0.2},{"id":1784962148314,"name":"冚耳仔","price":0.07},{"id":1784980981582,"name":"拉边","price":0.25},{"id":1785240251181,"name":"冚车拉边（外包拉边）","price":0.4},{"id":1785241028154,"name":"YT冚裤脚","price":0.2},{"id":1786013010742,"name":"冚后浪","price":0.15}]},"recycleBin":[],"_updatedAt":1786088133327,"_updatedBy":"19820311682"};



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

      // 隐藏未登录遮罩层（使用我们自己的登录系统）

      var overlay = document.getElementById('unloginOverlay');

      if (overlay) overlay.style.display = 'none';

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

  

  // ── 纯前端模式：检查登录状态 ──

  if (!useAPI) {

    // 版本检测与数据保护（不覆盖已有数据）

    var versionInfo = checkVersionAndMigrate();

    if (versionInfo.isUpdate) {

      // 延迟显示更新提示，等页面加载完成

      setTimeout(function() {

        showUpdateBanner(versionInfo.oldVersion);

      }, 500);

    }

    // 启动新版本定期检测

    startUpdateChecker();

    initUsers();

    checkLogin();

  }

}



// ===== 存储（localStorage + IndexedDB 双保险，联网模式走服务器 API）=====

let storageOK = true;

let currentUser = null;

const IDB_NAME = 'gf_cost_db_idb';

const IDB_STORE = 'kv';



// ===== 用户系统（纯前端模式）=====

const USERS_KEY = 'app_users';

const CURRENT_USER_KEY = 'app_current_user';



// 简单的密码哈希（Base64编码，仅用于本地演示，非安全加密）

function hashPassword(pwd) {

  try {

    return btoa(unescape(encodeURIComponent(pwd + '_dqas_salt')));

  } catch(e) {

    return pwd;

  }

}



// 初始化用户系统，预设主账号

function initUsers() {

  var users = localStorage.getItem(USERS_KEY);

  if (!users) {

    // 预设主账号（管理员）

    var defaultUsers = {

      'admin': {

        username: 'admin',

        password: hashPassword('admin123'),

        role: 'admin',

        isAdmin: true,

        createdAt: Date.now(),

        uid: 'admin_001'

      }

    };

    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));

    console.log('已初始化用户系统，主账号: admin / admin123');

  } else {

    // 确保主账号admin始终存在

    try {

      var userData = JSON.parse(users);

      if (!userData['admin']) {

        userData['admin'] = {

          username: 'admin',

          password: hashPassword('admin123'),

          role: 'admin',

          isAdmin: true,

          createdAt: Date.now(),

          uid: 'admin_001'

        };

        localStorage.setItem(USERS_KEY, JSON.stringify(userData));

        console.log('已添加主账号admin');

      }

    } catch(e) {}

  }

}



// 获取所有用户

function getUsers() {

  try {

    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');

  } catch(e) {

    return {};

  }

}



// 保存用户

function saveUsers(users) {

  localStorage.setItem(USERS_KEY, JSON.stringify(users));

}



// 检查登录状态

function checkLogin() {

  var savedUser = localStorage.getItem(CURRENT_USER_KEY);
  
  // 兼容逻辑：如果localStorage中没有，但是sessionStorage中有，就复制到localStorage
  if (!savedUser) {
    var sessionUser = sessionStorage.getItem(CURRENT_USER_KEY);
    if (sessionUser) {
      localStorage.setItem(CURRENT_USER_KEY, sessionUser);
      savedUser = sessionUser;
      console.log('已将登录状态从sessionStorage迁移到localStorage');
    }
  }

  if (savedUser) {

    try {

      currentUser = JSON.parse(savedUser);

      updateUserUI();

      hideLoginOverlay();

      return true;

    } catch(e) {}

  }

  // 未登录，显示登录弹窗

  showLoginOverlay();

  return false;

}



// 显示登录弹窗

function showLoginOverlay() {

  var overlay = document.getElementById('loginOverlay');

  if (overlay) overlay.style.display = 'flex';

  showLogin();

}



// 隐藏登录弹窗

function hideLoginOverlay() {

  var overlay = document.getElementById('loginOverlay');

  if (overlay) overlay.style.display = 'none';

}



// 显示登录表单

function showLogin() {

  document.getElementById('loginForm').style.display = 'block';

  document.getElementById('registerForm').style.display = 'none';

  document.getElementById('loginSubtitle').textContent = '请登录后使用';

  document.getElementById('loginMsg').textContent = '';

  document.getElementById('regMsg').textContent = '';

}



// 显示注册表单

function showRegister() {

  document.getElementById('loginForm').style.display = 'none';

  document.getElementById('registerForm').style.display = 'block';

  document.getElementById('loginSubtitle').textContent = '创建新账号';

  document.getElementById('loginMsg').textContent = '';

  document.getElementById('regMsg').textContent = '';

  // 重置头像预览
  var avatarPreview = document.getElementById('regAvatarPreview');
  if (avatarPreview) {
    avatarPreview.innerHTML = '👤';
    avatarPreview.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
  }
  window._tempRegAvatar = null;

}

// 预览注册头像
function previewRegAvatar(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      window._tempRegAvatar = e.target.result;
      var avatarPreview = document.getElementById('regAvatarPreview');
      if (avatarPreview) {
        avatarPreview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        avatarPreview.style.background = 'transparent';
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}



// 登录

function doLogin() {

  var username = document.getElementById('loginUsername').value.trim();

  var password = document.getElementById('loginPassword').value;

  var msgEl = document.getElementById('loginMsg');

  

  if (!username) {

    msgEl.textContent = '请输入用户名';

    return;

  }

  if (!password) {

    msgEl.textContent = '请输入密码';

    return;

  }

  

  var users = getUsers();

  var user = users[username];

  

  if (!user) {

    msgEl.textContent = '用户不存在，请先注册';

    return;

  }

  

  if (user.password !== hashPassword(password)) {

    msgEl.textContent = '密码错误';

    return;

  }

  

  // 登录成功

  currentUser = {

    username: user.username,

    role: user.role,

    isAdmin: user.isAdmin,

    uid: user.uid

  };

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

  updateUserUI();

  hideLoginOverlay();

  toast('✅ 登录成功，欢迎 ' + user.username);

}



// 注册

function doRegister() {

  var username = document.getElementById('regUsername').value.trim();

  var password = document.getElementById('regPassword').value;

  var password2 = document.getElementById('regPassword2').value;

  var msgEl = document.getElementById('regMsg');

  

  if (!username) {

    msgEl.textContent = '请输入用户名';

    return;

  }

  if (username.length < 3 || username.length > 20) {

    msgEl.textContent = '用户名长度需为3-20位';

    return;

  }

  if (!password) {

    msgEl.textContent = '请输入密码';

    return;

  }

  if (password.length < 4) {

    msgEl.textContent = '密码至少4位';

    return;

  }

  if (password !== password2) {

    msgEl.textContent = '两次密码输入不一致';

    return;

  }

  

  var users = getUsers();

  if (users[username]) {

    msgEl.textContent = '用户名已存在';

    return;

  }

  

  // 创建新用户（普通用户角色）

  var newUser = {

    username: username,

    password: hashPassword(password),

    role: 'user',

    isAdmin: false,

    createdAt: Date.now(),

    uid: 'user_' + Date.now()

  };

  // 保存头像
  if (window._tempRegAvatar) {
    newUser.avatar = window._tempRegAvatar;
    window._tempRegAvatar = null;
  }

  users[username] = newUser;

  saveUsers(users);

  

  // 自动登录

  currentUser = {

    username: newUser.username,

    role: newUser.role,

    isAdmin: newUser.isAdmin,

    uid: newUser.uid

  };

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

  updateUserUI();

  hideLoginOverlay();

  toast('✅ 注册成功，欢迎 ' + username);

}



// 退出登录

function doLogout() {

  if (!confirm('确定要退出登录吗？')) return;

  currentUser = null;

  localStorage.removeItem(CURRENT_USER_KEY);

  document.getElementById('loginUsername').value = '';

  document.getElementById('loginPassword').value = '';

  showLoginOverlay();

  toast('👋 已退出登录');

}



// 更新用户界面

function updateUserUI() {

  var badge = document.getElementById('userBadge');

  var adminBtn = document.getElementById('adminBtn');

  var logsTabBtn = document.getElementById('logsTabBtn');

  var mnavLogs = document.getElementById('mnavLogs');

  var changePwdBtn = document.getElementById('changePwdBtn');

  

  if (!currentUser) {

    if (badge) badge.textContent = '👤 未登录';

    // 所有用户都显示管理功能（已开启）

    if (adminBtn) adminBtn.style.display = '';

    if (logsTabBtn) logsTabBtn.style.display = '';

    if (mnavLogs) mnavLogs.style.display = '';

    if (changePwdBtn) changePwdBtn.style.display = 'none';

    return;

  }

  

  // 更新用户徽章

  if (badge) {

    if (currentUser.isAdmin || currentUser.role === 'admin') {

      badge.textContent = '👑 ' + currentUser.username + '（管理员）';

    } else {

      badge.textContent = '👤 ' + currentUser.username;

    }

  }

  

  // 所有用户都显示管理功能（已开启）

  if (adminBtn) adminBtn.style.display = '';

  if (logsTabBtn) logsTabBtn.style.display = '';

  if (mnavLogs) mnavLogs.style.display = '';

  if (changePwdBtn) changePwdBtn.style.display = 'none'; // 纯前端模式不需要修改密码

}



// ===== 管理后台 =====

function openAdminPanel() {

  var users = getUsers();

  var userList = Object.values(users);

  var exportLogs = getExportLogs();

  var backups = getBackups();

  

  // 计算存储使用情况

  var storageUsed = 0;

  try {

    for (var key in localStorage) {

      if (localStorage.hasOwnProperty(key)) {

        storageUsed += (localStorage[key].length + key.length) * 2;

      }

    }

  } catch(e) {}

  var storageMB = (storageUsed / 1024 / 1024).toFixed(2);

  

  var html = '<div style="max-height:600px;overflow-y:auto">';

  

  // 数据统计

  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">';

  html += '<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:16px;border-radius:12px;text-align:center">';

  html += '<div style="font-size:28px;font-weight:700">' + (DB.styles || []).length + '</div>';

  html += '<div style="font-size:12px;opacity:0.9">款式总数</div></div>';

  html += '<div style="background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;padding:16px;border-radius:12px;text-align:center">';

  var procCount = (DB.processes.pingche || []).length + (DB.processes.zache || []).length + (DB.processes.kanche || []).length;

  html += '<div style="font-size:28px;font-weight:700">' + procCount + '</div>';

  html += '<div style="font-size:12px;opacity:0.9">工序总数</div></div>';

  html += '<div style="background:linear-gradient(135deg,#4facfe,#00f2fe);color:#fff;padding:16px;border-radius:12px;text-align:center">';

  html += '<div style="font-size:28px;font-weight:700">' + exportLogs.length + '</div>';

  html += '<div style="font-size:12px;opacity:0.9">导出记录</div></div>';

  html += '<div style="background:linear-gradient(135deg,#43e97b,#38f9d7);color:#fff;padding:16px;border-radius:12px;text-align:center">';

  html += '<div style="font-size:28px;font-weight:700">' + backups.length + '</div>';

  html += '<div style="font-size:12px;opacity:0.9">备份数量</div></div>';

  html += '</div>';

  

  // 系统信息

  html += '<div style="background:#f8f9fa;padding:14px;border-radius:10px;margin-bottom:20px">';

  html += '<div style="font-size:14px;font-weight:600;color:#333;margin-bottom:10px">📊 系统信息</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:13px;color:#666">';

  html += '<div>版本号：<strong>v' + APP_VERSION + '</strong></div>';

  html += '<div>存储使用：<strong>' + storageMB + ' MB</strong></div>';

  html += '<div>当前用户：<strong>' + (currentUser ? currentUser.username : '未登录') + '</strong></div>';

  html += '<div>注册用户：<strong>' + userList.length + ' 个</strong></div>';

  html += '</div></div>';

  

  // 用户管理

  html += '<div style="margin-bottom:20px">';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';

  html += '<div style="font-size:14px;font-weight:600;color:#333">👥 用户管理（' + userList.length + '个）</div>';

  html += '<button onclick="showAddUser()" style="padding:6px 14px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">➕ 添加用户</button>';

  html += '</div>';

  if (userList.length === 0) {

    html += '<div style="text-align:center;padding:20px;color:#aaa;font-size:13px">暂无注册用户</div>';

  } else {

    html += '<div style="border:1px solid #eee;border-radius:8px;overflow:hidden">';

    html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';

    html += '<thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:center;border-bottom:1px solid #eee">头像</th><th style="padding:8px;text-align:left;border-bottom:1px solid #eee">用户名</th><th style="padding:8px;text-align:left;border-bottom:1px solid #eee">角色</th><th style="padding:8px;text-align:left;border-bottom:1px solid #eee">注册时间</th><th style="padding:8px;text-align:center;border-bottom:1px solid #eee">操作</th></tr></thead>';

    html += '<tbody>';

    userList.forEach(function(user) {

      var regDate = user.createdAt ? new Date(user.createdAt).toLocaleString() : '未知';

      var roleText = user.isAdmin || user.role === 'admin' ? '👑 管理员' : '👤 普通用户';

      var avatar = user.avatar ? user.avatar : '';

      var avatarHtml = avatar 

        ? '<img src="' + avatar + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #e0e0e0">' 

        : '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600">' + user.username.charAt(0).toUpperCase() + '</div>';

      html += '<tr style="border-bottom:1px solid #f5f5f5">';

      html += '<td style="padding:8px;text-align:center">' + avatarHtml + '</td>';

      html += '<td style="padding:8px;font-weight:600">' + escHtml(user.username) + '</td>';

      html += '<td style="padding:8px">' + roleText + '</td>';

      html += '<td style="padding:8px;color:#888;font-size:12px">' + regDate + '</td>';

      html += '<td style="padding:8px;text-align:center;white-space:nowrap">';

      html += '<button onclick="editUser(\'' + escAttr(user.username) + '\')" style="padding:4px 10px;background:#4361ee;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;margin-right:4px">编辑</button>';

      if (!user.isAdmin && user.role !== 'admin') {

        html += '<button onclick="deleteUser(\'' + escAttr(user.username) + '\')" style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">删除</button>';

      }

      html += '</td></tr>';

    });

    html += '</tbody></table></div>';

  }

  html += '</div>';

  

  // 数据管理

  html += '<div style="background:#fff5f5;padding:14px;border-radius:10px;border:1px solid #fecaca">';

  html += '<div style="font-size:14px;font-weight:600;color:#991b1b;margin-bottom:10px">⚠️ 数据管理（危险操作）</div>';

  html += '<div style="display:flex;gap:10px;flex-wrap:wrap">';

  html += '<button onclick="resetToDefaultData()" style="padding:8px 16px;background:#f59e0b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🔄 重置为默认数据</button>';

  html += '<button onclick="clearAllData()" style="padding:8px 16px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🗑️ 清空所有数据</button>';

  html += '</div></div>';

  

  html += '</div>';

  

  // 显示弹窗

  var modal = document.getElementById('detailModal');

  var content = document.getElementById('detailContent');

  if (modal && content) {

    content.innerHTML = '<h2 style="margin-bottom:16px">👑 管理后台</h2>' + html;

    modal.classList.add('show');

  }

}



// 删除用户

function deleteUser(username) {

  if (!confirm('确定要删除用户「' + username + '」吗？')) return;

  var users = getUsers();

  delete users[username];

  saveUsers(users);

  toast('✅ 已删除用户「' + username + '」');

  openAdminPanel(); // 刷新管理后台

}



// 添加用户

function showAddUser() {

  var html = '<div style="max-height:500px;overflow-y:auto">';

  html += '<div style="text-align:center;margin-bottom:20px">';

  html += '<div id="addAvatarPreview" style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:600;cursor:pointer;margin:0 auto" onclick="document.getElementById(\'addAvatarInput\').click()">👤</div>';

  html += '<input type="file" id="addAvatarInput" accept="image/*" style="display:none" onchange="handleAddAvatar(this)">';

  html += '<div style="font-size:12px;color:#888;margin-top:8px">点击头像可上传</div>';

  html += '</div>';

  

  html += '<div style="margin-bottom:14px">';

  html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px">用户名</label>';

  html += '<input type="text" id="addUsername" placeholder="输入用户名" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box">';

  html += '</div>';

  

  html += '<div style="margin-bottom:14px">';

  html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px">密码</label>';

  html += '<input type="password" id="addPassword" placeholder="输入密码（至少4位）" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box">';

  html += '</div>';

  

  html += '<div style="margin-bottom:14px">';

  html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px">确认密码</label>';

  html += '<input type="password" id="addPassword2" placeholder="再次输入密码" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box">';

  html += '</div>';

  

  html += '<div style="margin-bottom:14px">';

  html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px">角色</label>';

  html += '<select id="addRole" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box">';

  html += '<option value="user">👤 普通用户</option>';

  html += '<option value="admin">👑 管理员</option>';

  html += '</select>';

  html += '</div>';

  

  html += '<div style="display:flex;gap:10px;margin-top:20px">';

  html += '<button onclick="addUser()" style="flex:1;padding:12px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">✅ 添加用户</button>';

  html += '<button onclick="openAdminPanel()" style="flex:1;padding:12px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">取消</button>';

  html += '</div>';

  html += '</div>';

  

  var modal = document.getElementById('detailModal');

  var content = document.getElementById('detailContent');

  if (modal && content) {

    content.innerHTML = '<h2 style="margin-bottom:16px">➕ 添加新用户</h2>' + html;

    modal.classList.add('show');

  }

}



// 处理添加用户头像上传

function handleAddAvatar(input) {

  var file = input.files[0];

  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {

    toast('⚠️ 图片大小不能超过2MB');

    return;

  }

  var reader = new FileReader();

  reader.onload = function(e) {

    var preview = document.getElementById('addAvatarPreview');

    if (preview) {

      preview.outerHTML = '<img id="addAvatarPreview" src="' + e.target.result + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #e0e0e0;cursor:pointer;margin:0 auto" onclick="document.getElementById(\'addAvatarInput\').click()">';

    }

    window._tempAddAvatar = e.target.result;

  };

  reader.readAsDataURL(file);

}



// 添加用户

function addUser() {

  var username = document.getElementById('addUsername').value.trim();

  var password = document.getElementById('addPassword').value;

  var password2 = document.getElementById('addPassword2').value;

  var role = document.getElementById('addRole').value;

  

  if (!username) {

    toast('⚠️ 用户名不能为空');

    return;

  }

  if (!password || password.length < 4) {

    toast('⚠️ 密码长度至少4位');

    return;

  }

  if (password !== password2) {

    toast('⚠️ 两次输入的密码不一致');

    return;

  }

  

  var users = getUsers();

  if (users[username]) {

    toast('⚠️ 用户名「' + username + '」已存在');

    return;

  }

  

  var newUser = {

    username: username,

    password: hashPassword(password),

    role: role,

    isAdmin: role === 'admin',

    createdAt: Date.now(),

    uid: 'user_' + Date.now()

  };

  

  if (window._tempAddAvatar) {

    newUser.avatar = window._tempAddAvatar;

    window._tempAddAvatar = null;

  }

  

  users[username] = newUser;

  saveUsers(users);

  toast('✅ 用户「' + username + '」添加成功');

  openAdminPanel();

}



// 编辑用户

function editUser(username) {

  var users = getUsers();

  var user = users[username];

  if (!user) {

    toast('❌ 用户不存在');

    return;

  }

  

  var avatar = user.avatar || '';

  var avatarPreview = avatar 

    ? '<img id="editAvatarPreview" src="' + avatar + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #e0e0e0;cursor:pointer" onclick="document.getElementById(\'editAvatarInput\').click()">'

    : '<div id="editAvatarPreview" style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:600;cursor:pointer" onclick="document.getElementById(\'editAvatarInput\').click()">' + user.username.charAt(0).toUpperCase() + '</div>';

  

  var html = '<div style="max-height:500px;overflow-y:auto">';

  html += '<div style="text-align:center;margin-bottom:20px">';

  html += avatarPreview;

  html += '<input type="file" id="editAvatarInput" accept="image/*" style="display:none" onchange="handleEditAvatar(this)">';

  html += '<div style="font-size:12px;color:#888;margin-top:8px">点击头像可更换</div>';

  html += '</div>';

  

  html += '<div style="margin-bottom:14px">';

  html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px">用户名</label>';

  html += '<input type="text" id="editUsername" value="' + escAttr(user.username) + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box">';

  html += '</div>';

  

  html += '<div style="margin-bottom:14px">';

  html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px">新密码（留空则不修改）</label>';

  html += '<input type="password" id="editPassword" placeholder="输入新密码" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box">';

  html += '</div>';

  

  html += '<div style="margin-bottom:14px">';

  html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px">确认新密码</label>';

  html += '<input type="password" id="editPassword2" placeholder="再次输入新密码" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box">';

  html += '</div>';

  

  // 权限设置

  var isNormalUser = !user.isAdmin && user.role !== 'admin';

  if (isNormalUser) {

    // 普通用户固定为只读

    html += '<div style="margin-bottom:14px">';

    html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:8px">🔐 权限设置</label>';

    html += '<div style="background:#fff3cd;padding:12px;border-radius:8px;border:1px solid #ffc107;color:#856404;font-size:13px">';

    html += '<div style="font-weight:600;margin-bottom:6px">👤 普通用户（只读权限）</div>';

    html += '<div>普通用户固定只能查看数据，不能进行添加、编辑、删除、导出等操作。</div>';

    html += '</div></div>';

  } else {

    // 管理员可以编辑权限

    var perms = user.permissions || {};

    var permList = [

      { key: 'canAddStyle', label: '➕ 添加款式' },

      { key: 'canEditStyle', label: '✏️ 编辑款式' },

      { key: 'canDeleteStyle', label: '🗑️ 删除款式' },

      { key: 'canExport', label: '📥 导出数据' },

      { key: 'canManageProcesses', label: '🔧 管理工序' },

      { key: 'canManageUsers', label: '👥 管理用户' }

    ];

    html += '<div style="margin-bottom:14px">';

    html += '<label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:8px">🔐 权限设置</label>';

    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;background:#f8f9fa;padding:12px;border-radius:8px">';

    permList.forEach(function(p) {

      var checked = perms[p.key] !== false ? 'checked' : '';

      html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#333">';

      html += '<input type="checkbox" id="perm_' + p.key + '" ' + checked + ' style="width:16px;height:16px;cursor:pointer">';

      html += '<span>' + p.label + '</span>';

      html += '</label>';

    });

    html += '</div></div>';

  }

  

  html += '<div style="display:flex;gap:10px;margin-top:20px">';

  html += '<button onclick="saveEditUser(\'' + escAttr(username) + '\')" style="flex:1;padding:12px;background:#4361ee;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">💾 保存修改</button>';

  html += '<button onclick="openAdminPanel()" style="flex:1;padding:12px;background:#f0f0f0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">取消</button>';

  html += '</div>';

  html += '</div>';

  

  var modal = document.getElementById('detailModal');

  var content = document.getElementById('detailContent');

  if (modal && content) {

    content.innerHTML = '<h2 style="margin-bottom:16px">✏️ 编辑用户</h2>' + html;

    modal.classList.add('show');

  }

}



// 处理编辑头像上传

function handleEditAvatar(input) {

  var file = input.files[0];

  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {

    toast('⚠️ 图片大小不能超过2MB');

    return;

  }

  var reader = new FileReader();

  reader.onload = function(e) {

    var preview = document.getElementById('editAvatarPreview');

    if (preview) {

      preview.outerHTML = '<img id="editAvatarPreview" src="' + e.target.result + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #e0e0e0;cursor:pointer" onclick="document.getElementById(\'editAvatarInput\').click()">';

    }

    // 保存临时头像数据

    window._tempEditAvatar = e.target.result;

  };

  reader.readAsDataURL(file);

}



// 保存编辑用户

function saveEditUser(oldUsername) {

  var newUsername = document.getElementById('editUsername').value.trim();

  var newPassword = document.getElementById('editPassword').value;

  var newPassword2 = document.getElementById('editPassword2').value;

  

  if (!newUsername) {

    toast('⚠️ 用户名不能为空');

    return;

  }

  

  if (newPassword || newPassword2) {

    if (newPassword !== newPassword2) {

      toast('⚠️ 两次输入的密码不一致');

      return;

    }

    if (newPassword.length < 4) {

      toast('⚠️ 密码长度至少4位');

      return;

    }

  }

  

  var users = getUsers();

  var user = users[oldUsername];

  if (!user) {

    toast('❌ 用户不存在');

    return;

  }

  

  // 如果用户名修改了，检查新用户名是否已存在

  if (newUsername !== oldUsername) {

    if (users[newUsername]) {

      toast('⚠️ 用户名「' + newUsername + '」已存在');

      return;

    }

    // 删除旧用户，添加新用户

    delete users[oldUsername];

    user.username = newUsername;

    users[newUsername] = user;

  }

  

  // 修改密码

  if (newPassword) {

    user.password = hashPassword(newPassword);

  }

  

  // 修改头像

  if (window._tempEditAvatar) {

    user.avatar = window._tempEditAvatar;

    window._tempEditAvatar = null;

  }

  

  // 保存权限设置

  var isNormalUser = !user.isAdmin && user.role !== 'admin';

  if (isNormalUser) {

    // 普通用户固定为只读

    user.permissions = {

      canAddStyle: false,

      canEditStyle: false,

      canDeleteStyle: false,

      canExport: false,

      canManageProcesses: false,

      canManageUsers: false

    };

  } else {

    // 管理员可以编辑权限

    var permKeys = ['canAddStyle', 'canEditStyle', 'canDeleteStyle', 'canExport', 'canManageProcesses', 'canManageUsers'];

    var permissions = {};

    permKeys.forEach(function(key) {

      var checkbox = document.getElementById('perm_' + key);

      if (checkbox) {

        permissions[key] = checkbox.checked;

      }

    });

    user.permissions = permissions;

  }

  

  saveUsers(users);

  toast('✅ 用户信息已更新');

  

  // 如果修改的是当前登录用户，更新当前用户信息

  if (currentUser && currentUser.username === oldUsername) {

    currentUser.username = newUsername;

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

    updateUserUI();

  }

  

  openAdminPanel(); // 刷新管理后台

}



// 重置为默认数据

function resetToDefaultData() {

  if (!confirm('确定要重置为默认数据吗？当前数据将被覆盖！')) return;

  localStorage.removeItem('gf_cost_db');

  toast('✅ 已重置，页面即将刷新...');

  setTimeout(function() { location.reload(); }, 1000);

}



// 清空所有数据

function clearAllData() {

  if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;

  if (!confirm('再次确认：真的要清空所有款式、工序、用户数据吗？')) return;

  localStorage.clear();

  toast('✅ 已清空所有数据，页面即将刷新...');

  setTimeout(function() { location.reload(); }, 1000);

}



// ===== 导出记录功能 =====

const EXPORT_LOG_KEY = 'app_export_logs';



function getExportLogs() {

  try {

    return JSON.parse(localStorage.getItem(EXPORT_LOG_KEY) || '[]');

  } catch(e) {

    return [];

  }

}



function saveExportLog(logs) {

  localStorage.setItem(EXPORT_LOG_KEY, JSON.stringify(logs));

}



function addExportRecord(styleName, styleId, format, itemCount) {

  var logs = getExportLogs();

  var record = {

    id: Date.now(),

    styleName: styleName,

    styleId: styleId,

    format: format,

    itemCount: itemCount,

    exportedBy: currentUser ? currentUser.username : '未知用户',

    exportedAt: Date.now()

  };

  logs.unshift(record);

  // 最多保留100条记录

  if (logs.length > 100) logs = logs.slice(0, 100);

  saveExportLog(logs);

  return record;

}



// 获取某个款式的导出次数

function getExportCount(styleId) {

  var logs = getExportLogs();

  // 用 == 比较，避免数字和字符串类型不匹配

  return logs.filter(function(l) { return l.styleId == styleId; }).length;

}



function showExportRecords(styleId) {

  var logs = getExportLogs();

  // 用 == 比较，避免数字和字符串类型不匹配

  var styleLogs = logs.filter(function(l) { return l.styleId == styleId; });

  

  if (styleLogs.length === 0) {

    toast('📋 该款式暂无导出记录');

    return;

  }

  

  var html = '<div style="max-height:400px;overflow-y:auto">';

  html += '<p style="font-size:13px;color:#666;margin-bottom:12px">共 ' + styleLogs.length + ' 条导出记录</p>';

  styleLogs.forEach(function(log) {

    var date = new Date(log.exportedAt);

    var dateStr = date.getFullYear() + '-' + 

      String(date.getMonth() + 1).padStart(2, '0') + '-' + 

      String(date.getDate()).padStart(2, '0') + ' ' +

      String(date.getHours()).padStart(2, '0') + ':' +

      String(date.getMinutes()).padStart(2, '0') + ':' +

      String(date.getSeconds()).padStart(2, '0');

    html += '<div style="padding:10px 12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;background:#fafafa">';

    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';

    html += '<span style="font-size:13px;font-weight:600;color:#333">' + escHtml(log.styleName) + '</span>';

    html += '<div style="display:flex;align-items:center;gap:8px">';

    html += '<span style="font-size:11px;background:#e8f4fd;color:#4361ee;padding:2px 8px;border-radius:10px">' + escHtml(log.format) + '</span>';

    html += '<button onclick="deleteExportRecord(' + log.id + ', ' + styleId + ')" style="padding:2px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">删除</button>';

    html += '</div></div>';

    html += '<div style="font-size:12px;color:#888">';

    html += '👤 ' + escHtml(log.exportedBy) + ' · 📦 ' + log.itemCount + ' 项 · 🕐 ' + dateStr;

    html += '</div>';

    html += '</div>';

  });

  html += '</div>';

  

  // 显示弹窗

  var modal = document.getElementById('detailModal');

  var content = document.getElementById('detailContent');

  if (modal && content) {

    content.innerHTML = '<h2 style="margin-bottom:16px">📋 导出记录</h2>' + html;

    modal.classList.add('show');

  } else {

    alert('该款式导出记录：\n\n' + styleLogs.map(function(l) {

      var d = new Date(l.exportedAt);

      return l.format + ' - ' + l.exportedBy + ' - ' + d.toLocaleString();

    }).join('\n'));

  }

}



// 删除导出记录

function deleteExportRecord(logId, styleId) {

  if (!confirm('确定要删除这条导出记录吗？')) return;

  var logs = getExportLogs();

  logs = logs.filter(function(l) { return l.id !== logId; });

  saveExportLog(logs);

  toast('✅ 已删除导出记录');

  // 刷新导出记录列表

  showExportRecords(styleId);

}



// ===== 自动备份功能 =====

const BACKUP_KEY = 'app_auto_backups';

const MAX_BACKUPS = 0; // 0表示不限制数量（无限备份）

const BACKUP_EXPIRE_DAYS = 0; // 0表示不自动删除（永久保留）

const ONE_DAY_MS = 24 * 60 * 60 * 1000;



// 清理过期备份（超过一个月自动删除）

function cleanExpiredBackups(backups) {

  if (!backups || backups.length === 0) return [];

  // 如果设置为0，表示不自动删除

  if (BACKUP_EXPIRE_DAYS <= 0) return backups;

  var now = Date.now();

  var expireTime = BACKUP_EXPIRE_DAYS * ONE_DAY_MS;

  var before = backups.length;

  var valid = backups.filter(function(b) {

    return b.timestamp && (now - b.timestamp) < expireTime;

  });

  var removed = before - valid.length;

  if (removed > 0) {

    console.log('🧹 自动清理了 ' + removed + ' 个超过' + BACKUP_EXPIRE_DAYS + '天的过期备份');

  }

  return valid;

}



function getBackups() {

  try {

    var backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');

    // 自动清理过期备份

    var cleaned = cleanExpiredBackups(backups);

    if (cleaned.length !== backups.length) {

      saveBackups(cleaned);

    }

    return cleaned;

  } catch(e) {

    return [];

  }

}



function saveBackups(backups) {

  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));

}



function createAutoBackup(reason) {

  try {

    var backups = getBackups();

    var backup = {

      id: Date.now(),

      timestamp: Date.now(),

      reason: reason || '自动备份',

      data: JSON.parse(JSON.stringify(DB)),

      createdBy: currentUser ? currentUser.username : '系统'

    };

    backups.unshift(backup);

    // 最多保留MAX_BACKUPS个备份（0表示不限制）

    if (MAX_BACKUPS > 0 && backups.length > MAX_BACKUPS) backups = backups.slice(0, MAX_BACKUPS);

    saveBackups(backups);

    var limitText = MAX_BACKUPS > 0 ? ('最多' + MAX_BACKUPS + '个') : '无限';

    var expireText = BACKUP_EXPIRE_DAYS > 0 ? ('超过' + BACKUP_EXPIRE_DAYS + '天自动删除') : '永久保留';

    console.log('💾 自动备份已创建: ' + reason + ' (共' + backups.length + '个备份, ' + limitText + ', ' + expireText + ')');

    return backup;

  } catch(e) {

    console.warn('自动备份失败:', e);

    return null;

  }

}



function restoreBackup(backupId) {

  var backups = getBackups();

  var backup = backups.find(function(b) { return b.id === backupId; });

  if (!backup) {

    toast('❌ 备份不存在');

    return false;

  }

  if (!confirm('确定要恢复到 ' + new Date(backup.timestamp).toLocaleString() + ' 的备份吗？\n当前数据将被覆盖！')) {

    return false;

  }

  DB = JSON.parse(JSON.stringify(backup.data));

  saveDB();

  renderManageList();

  renderProcessSelect();

  renderHistory();

  renderRecycleBin();

  toast('✅ 已恢复到备份数据');

  return true;

}



// 删除备份

function deleteBackup(backupId) {

  if (!confirm('确定要删除这个备份吗？此操作不可恢复！')) return;

  var backups = getBackups();

  backups = backups.filter(function(b) { return b.id !== backupId; });

  saveBackups(backups);

  toast('✅ 已删除备份');

  showBackupManager(); // 刷新备份列表

}



// 手动备份

function doManualBackup() {

  try {

    var backup = createAutoBackup('手动备份');

    if (backup) {

      toast('✅ 手动备份已创建');

      // 延迟刷新列表，确保数据已保存

      setTimeout(function() {

        showBackupManager();

      }, 100);

    } else {

      toast('⚠️ 备份创建失败，请检查数据');

    }

  } catch(e) {

    console.error('手动备份失败:', e);

    toast('⚠️ 备份创建失败: ' + e.message);

  }

}



function showBackupManager() {

  var backups = getBackups();

  var html = '<div style="max-height:500px;overflow-y:auto">';

  

  if (backups.length === 0) {

    html += '<div style="text-align:center;padding:40px;color:#aaa">';

    html += '<div style="font-size:48px;margin-bottom:12px">💾</div>';

    html += '<p>暂无备份记录</p>';

    html += '<p style="font-size:12px;margin-top:8px">数据修改时会自动创建备份</p>';

    var limitTip1 = MAX_BACKUPS > 0 ? ('最多保留' + MAX_BACKUPS + '个备份') : '备份数量不限';

    var expireTip1 = BACKUP_EXPIRE_DAYS > 0 ? ('，超过' + BACKUP_EXPIRE_DAYS + '天自动删除') : '，永久保留';

    html += '<p style="font-size:11px;margin-top:4px;color:#bbb">' + limitTip1 + expireTip1 + '</p>';

    html += '</div>';

  } else {

    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';

    var limitTip2 = MAX_BACKUPS > 0 ? ('最多' + MAX_BACKUPS + '个') : '无限';

    var expireTip2 = BACKUP_EXPIRE_DAYS > 0 ? ('，超过' + BACKUP_EXPIRE_DAYS + '天自动删除') : '，永久保留';

    html += '<span style="font-size:13px;color:#666">共 ' + backups.length + ' 个备份（' + limitTip2 + expireTip2 + '）</span>';

    html += '<button onclick="doManualBackup()" style="padding:6px 14px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">➕ 立即备份</button>';

    html += '</div>';

    

    backups.forEach(function(backup) {

      var date = new Date(backup.timestamp);

      var dateStr = date.getFullYear() + '-' + 

        String(date.getMonth() + 1).padStart(2, '0') + '-' + 

        String(date.getDate()).padStart(2, '0') + ' ' +

        String(date.getHours()).padStart(2, '0') + ':' +

        String(date.getMinutes()).padStart(2, '0');

      var styleCount = (backup.data.styles || []).length;

      var procCount = (backup.data.processes ? 

        (backup.data.processes.pingche || []).length + 

        (backup.data.processes.zache || []).length + 

        (backup.data.processes.kanche || []).length : 0);

      

      html += '<div style="padding:12px;border:1px solid #eee;border-radius:10px;margin-bottom:8px;background:#fafafa;transition:all 0.2s" onmouseover="this.style.background=\'#f0f7ff\';this.style.borderColor=\'#4361ee\'" onmouseout="this.style.background=\'#fafafa\';this.style.borderColor=\'#eee\'">';

      html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">';

      html += '<div style="flex:1">';

      html += '<div style="font-size:14px;font-weight:600;color:#333;margin-bottom:4px">💾 ' + escHtml(backup.reason) + '</div>';

      html += '<div style="font-size:12px;color:#888;margin-bottom:4px">🕐 ' + dateStr + ' · 👤 ' + escHtml(backup.createdBy) + '</div>';

      html += '<div style="font-size:11px;color:#aaa">📦 款式 ' + styleCount + ' 个 · 🔧 工序 ' + procCount + ' 项</div>';

      html += '</div>';

      html += '<div style="display:flex;flex-direction:column;gap:6px">';

      html += '<button onclick="restoreBackup(' + backup.id + ')" style="padding:6px 14px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;white-space:nowrap">恢复</button>';

      html += '<button onclick="deleteBackup(' + backup.id + ')" style="padding:6px 14px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;white-space:nowrap">删除</button>';

      html += '</div>';

      html += '</div>';

      html += '</div>';

    });

  }

  

  html += '</div>';

  

  // 显示弹窗

  var modal = document.getElementById('detailModal');

  var content = document.getElementById('detailContent');

  if (modal && content) {

    content.innerHTML = '<h2 style="margin-bottom:16px">💾 数据备份管理</h2>' + html;

    modal.classList.add('show');

  } else {

    alert('备份管理功能需要弹窗支持');

  }

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

  // 始终先保存到 localStorage（确保数据不丢失）

  try {

    const str = JSON.stringify(DB);

    try { localStorage.setItem('gf_cost_db', str); } catch(e) {

      console.warn('localStorage保存失败', e);

    }

    idbSave(DB);

  } catch(e) {

    console.error('数据序列化失败', e);

    toast('⚠️ 数据保存失败，请检查数据量');

  }

  

  // 如果有后端API，同时保存到服务器

  if (useAPI) {

    fetch('/api/save', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(DB) })

      .then(r => r.json())

      .then(d => { if (d && d.updatedAt) { DB._updatedAt = d.updatedAt; } })

      .catch(e => console.warn('保存到服务器失败（本地已保存）', e));

  }

  

  // 自动备份：节流，最多每30秒自动备份一次

  try {

    var now = Date.now();

    if (!window._lastAutoBackup || now - window._lastAutoBackup > 30000) {

      window._lastAutoBackup = now;

      if (typeof createAutoBackup === 'function') {

        createAutoBackup('数据修改自动备份');

      }

    }

  } catch(e) {

    console.warn('自动备份失败:', e);

  }

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

    try {

      DB = JSON.parse(raw);

      migrateDB();

      // 检查：如果本地数据款式少于10个，自动加载默认84款数据

      var localStylesCount = (DB.styles || []).length;

      if (localStylesCount < 10 && typeof DEFAULT_DATA !== 'undefined') {

        console.log('📊 本地数据款式仅' + localStylesCount + '个，自动加载默认84款数据');

        DB = JSON.parse(JSON.stringify(DEFAULT_DATA));

        migrateDB();

        try {

          const dbStr = JSON.stringify(DB);

          localStorage.setItem('gf_cost_db', dbStr);

          console.log('默认数据已保存到本地，款式数:', DB.styles.length);

        } catch(e) {

          console.warn('保存到localStorage失败:', e);

        }

        idbSave(DB);

      }

      return;

    } catch(e) {}

  }

  const fromIdb = await idbLoad();

  if (fromIdb) { DB = fromIdb; migrateDB(); return; }

  

  // 本地无数据时，从内置默认数据加载

  try {

    console.log('本地无数据，加载内置默认数据...');

    if (typeof DEFAULT_DATA !== 'undefined') {

      DB = JSON.parse(JSON.stringify(DEFAULT_DATA));

      migrateDB();

      // 保存到localStorage，下次直接读取

      try { 

        const dbStr = JSON.stringify(DB);

        localStorage.setItem('gf_cost_db', dbStr); 

        console.log('默认数据已加载并保存到本地，款式数:', DB.styles.length, '数据大小:', dbStr.length, '字节');

      } catch(e) {

        console.warn('保存到localStorage失败（数据可能太大）:', e);

      }

      idbSave(DB);

      console.log('✅ 已从内置默认数据加载数据（' + DB.styles.length + '款）');

      return;

    }

  } catch(e) {

    console.warn('加载内置默认数据失败:', e);

  }

  

  // 最后尝试从内置默认数据加载（通过script标签引入，无CORS问题）

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

  DB.styles.forEach(s => { 

    if (!s.status) s.status = 'pending';

    // 修正图片路径：去掉 assets/images/ 前缀（图片在根目录）

    if (s.imgs && Array.isArray(s.imgs)) {

      s.imgs = s.imgs.map(function(img) {

        if (typeof img === 'string' && img.indexOf('assets/images/') === 0) {

          return img.replace('assets/images/', '');

        }

        return img;

      });

    }

  });

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

    // 勾选工序后自动清除搜索关键词

    if (processFilter) {

      processFilter = '';

      var filterInput = document.getElementById('procFilter');

      if (filterInput) filterInput.value = '';

    }

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

    // 导出次数

    const exportCount = getExportCount(s.id);

    const exportBadge = exportCount > 0

      ? '<div style="text-align:right;margin-bottom:4px"><span style="font-size:11px;color:#8e44ad;background:#f3e8ff;padding:2px 8px;border-radius:10px;font-weight:600">📥 已导出' + exportCount + '次</span></div>'

      : '';

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

        <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:4px">

          ${exportBadge}

          <div class="htotal">¥${total.toFixed(2)}</div>

        </div>

        <div style="position:absolute;top:8px;right:48px;display:flex;gap:4px">
          <button class="del-history" data-role-block onclick="event.stopPropagation(); deleteHistory('${s.id}')" title="删除">✕</button>
        </div>

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

  // 导出次数

  const exportCount = getExportCount(style.id);

  const exportBadge = exportCount > 0

    ? '<span style="font-size:11px;color:#8e44ad;background:#f3e8ff;padding:2px 10px;border-radius:10px;font-weight:600">📥 已导出' + exportCount + '次</span>'

    : '';



  document.getElementById('detailContent').innerHTML = `

    <div style="display:flex;gap:16px;margin-bottom:14px;align-items:flex-start">

      ${(style.imgs && style.imgs.some(Boolean)) ? `<div class="img-grid detail-imgs" style="width:120px;flex-shrink:0">${style.imgs.map((src,i) => src ? `<img src="${src}" data-lb-src="${src}" data-lb-imgs="${encodeURIComponent(JSON.stringify(style.imgs||[]))}" data-lb-idx="${i}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid #eee;cursor:zoom-in">` : '').join('')}</div>` : '<div style="width:120px;height:120px;border-radius:10px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:13px;flex-shrink:0">无图</div>'}

      <div style="flex:1;min-width:0">

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">

          <span style="font-size:17px;font-weight:700;color:#1a1a2e">${escHtml(style.name)}</span>

          ${exportBadge}

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

          ${currentUser && currentUser.role === 'viewer' ? '' : '<button id="addDetailProcBtn" onclick="addDetailProcess()" style="padding:3px 10px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;white-space:nowrap">➕ 新增工序</button>'}

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
  
  // 直接在JavaScript中设置样式和初始化拖动功能
  setTimeout(function() {
    var detailModal = document.getElementById('detailModal');
    var modalContent = detailModal ? detailModal.querySelector('.modal') : null;
    
    if (detailModal && modalContent) {
      // 设置overlay样式
      detailModal.style.background = 'transparent !important';
      detailModal.style.pointerEvents = 'none !important';
      detailModal.style.zIndex = '99998';
      
      // 设置modal内容样式
      modalContent.style.position = 'fixed';
      modalContent.style.top = '50px';
      modalContent.style.left = '50px';
      modalContent.style.right = 'auto';
      modalContent.style.bottom = 'auto';
      modalContent.style.margin = '0';
      modalContent.style.transform = 'none';
      modalContent.style.pointerEvents = 'auto';
      
      // 查找或创建拖动标题栏
      var draggableHeader = modalContent.querySelector('.detail-draggable-header');
      if (!draggableHeader) {
        // 创建拖动标题栏
        draggableHeader = document.createElement('div');
        draggableHeader.className = 'detail-draggable-header';
        draggableHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;cursor:move;padding-bottom:8px;border-bottom:2px solid #f3f4f6;user-select:none';
        
        // 创建标题容器
        var titleContainer = document.createElement('div');
        titleContainer.style.cssText = 'display:flex;align-items:center;gap:8px';
        
        var title = modalContent.querySelector('h2');
        if (title) {
          title.style.margin = '0';
          title.style.fontSize = '18px';
          titleContainer.appendChild(title);
        }
        
        var hint = document.createElement('span');
        hint.style.cssText = 'font-size:12px;color:#9ca3af;font-weight:normal';
        hint.textContent = '（拖动标题移动）';
        titleContainer.appendChild(hint);
        
        draggableHeader.appendChild(titleContainer);
        
        // 把关闭按钮移到拖动标题栏
        var closeBtn = modalContent.querySelector('.modal-close');
        if (closeBtn) {
          closeBtn.style.position = 'static';
          closeBtn.style.transform = 'none';
          draggableHeader.appendChild(closeBtn);
        }
        
        // 把拖动标题栏插入到modal内容的最前面
        modalContent.insertBefore(draggableHeader, modalContent.firstChild);
      }
      
      // 初始化拖动功能
      var isDragging = false;
      var startX, startY, initialLeft, initialTop;
      
      draggableHeader.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        var rect = modalContent.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        modalContent.style.position = 'fixed';
        modalContent.style.left = initialLeft + 'px';
        modalContent.style.top = initialTop + 'px';
        modalContent.style.right = 'auto';
        modalContent.style.bottom = 'auto';
        modalContent.style.margin = '0';
        modalContent.style.transform = 'none';
        
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        
        modalContent.style.left = (initialLeft + dx) + 'px';
        modalContent.style.top = (initialTop + dy) + 'px';
      });
      
      document.addEventListener('mouseup', function() {
        isDragging = false;
      });
      
      console.log('款式详情窗口拖动功能已初始化');
    }
  }, 100);



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

  document.getElementById('imgLightbox').style.display = 'flex';

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

  document.getElementById('imgLightbox').style.display = 'none';

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

  const typeOrder = ['pingche', 'zache', 'kanche'];

  const rows = [['工序名称*', '工序单价', '工序数量(样版可不填)', '备注(样版可不填)']];

  

  // 按类型分组导出

  typeOrder.forEach(function(type) {

    var typeItems = style.selections.filter(function(s) { return s.type === type; });

    if (typeItems.length === 0) return;

    

    var typeTotal = 0;

    typeItems.forEach(function(s) {

      var subtotal = s.price * s.qty;

      typeTotal += subtotal;

      rows.push([

        s.name + ' (' + (typeNames[s.type] || s.type) + ')',

        s.price,

        s.qty,

        ''

      ]);

    });

    

    // 添加类型合计行

    rows.push([

      (typeNames[type] || type) + '合计',

      '',

      '',

      typeTotal.toFixed(2)

    ]);

    // 添加空行分隔

    rows.push(['', '', '', '']);

  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, '工序单价表');

  const filename = (style.name || '款式') + '_工序单价表_' + style.date + '.xlsx';

  XLSX.writeFile(wb, filename);

  toast('已导出：' + filename);

  // 添加导出记录

  addExportRecord(style.name, style.id, 'Excel', style.selections.length);

  clientLog('export_style', '导出款式「' + style.name + '」Excel（' + style.selections.length + '项）');

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

        // 验证是否保存成功

        var saved = verifyDataSaved();

        renderManageList(); renderProcessSelect(); renderHistory();

        if (saved) {

          toast('✅ 已合并同事数据（' + DB.styles.length + '款，已保存到本地）');

        } else {

          toast('⚠️ 数据合并成功，但保存到本地失败，请检查浏览器存储空间');

        }

        clientLog('merge', '合并同事数据（源文件：' + file.name + '）');

      } else {

        DB = data;

        saveDB();

        // 验证是否保存成功

        var saved2 = verifyDataSaved();

        renderManageList(); renderProcessSelect(); renderHistory();

        if (saved2) {

          toast('✅ 备份已恢复（' + DB.styles.length + '款，已保存到本地，刷新不会丢失）');

        } else {

          toast('⚠️ 数据恢复成功，但保存到本地失败，请检查浏览器存储空间');

        }

        clientLog('import', '导入备份恢复（文件：' + file.name + '）');

      }

    } catch(err) { toast('⚠️ 文件解析失败'); }

    e.target.value = '';

  };

  reader.readAsText(file);

}



// 验证数据是否保存到 localStorage

function verifyDataSaved() {

  try {

    var raw = localStorage.getItem('gf_cost_db');

    if (!raw) return false;

    var parsed = JSON.parse(raw);

    if (!parsed.styles || !parsed.processes) return false;

    // 验证款式数量是否一致

    return parsed.styles.length === DB.styles.length;

  } catch(e) {

    return false;

  }

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



// ===== 款式库功能 =====

const LIBRARY_KEY = 'style_library';



function getLibrary() {

  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]'); } catch(e) { return []; }

}



function saveLibrary(library) {

  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));

}



function renderLibrary() {

  var library = getLibrary();

  var search = (document.getElementById('librarySearch') || {}).value || '';

  var category = (document.getElementById('libraryCategory') || {}).value || '';

  var filtered = library.filter(function(item) {

    if (category && item.category !== category) return false;

    if (search) {

      var keyword = search.toLowerCase();

      var searchText = (item.name || '') + ' ' + (item.category || '') + ' ' + (item.tags || []).join(' ') + ' ' + (item.processes || []).map(function(p){return p.name;}).join(' ');

      if (searchText.toLowerCase().indexOf(keyword) < 0) return false;

    }

    return true;

  });

  var countEl = document.getElementById('libraryCount');

  if (countEl) countEl.textContent = '（' + filtered.length + '款）';

  var listEl = document.getElementById('libraryList');

  if (!listEl) return;

  if (filtered.length === 0) {

    listEl.innerHTML = '<div class="no-data">📚 没有找到匹配的款式<br><span style="font-size:12px;color:#999">试试其他关键词或分类</span></div>';

    return;

  }

  var html = '<div style="display:flex;flex-direction:column;gap:20px">';

  filtered.forEach(function(item, idx) {

    var total = 0;
    var pingcheTotal = 0;
    var zacheTotal = 0;
    var kancheTotal = 0;

    (item.processes || []).forEach(function(p) { 
      var subtotal = (p.price || 0) * (p.qty || 1);
      total += subtotal;
      if (p.type === 'pingche') pingcheTotal += subtotal;
      else if (p.type === 'zache') zacheTotal += subtotal;
      else if (p.type === 'kanche') kancheTotal += subtotal;
    });

    var imgHtml = item.image 
      ? '<img src="' + item.image + '" style="width:120px;height:160px;object-fit:cover;border:1px solid #ddd;cursor:pointer" onclick="viewLibraryImage(' + idx + ')">'
      : '<div style="width:120px;height:160px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;border:1px solid #ddd">👔</div>';

    // 表格形式，像Excel一样
    html += '<div style="background:#fff;border:2px solid #333;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">';
    
    // 款号标题行
    html += '<div style="background:#fbbf24;padding:8px 12px;font-weight:700;font-size:16px;color:#1a1a2e;border-bottom:2px solid #333;display:flex;justify-content:space-between;align-items:center">';
    html += '<span>款号' + escHtml(item.name || '未命名') + '</span>';
    html += '<span style="font-size:13px;font-weight:400;color:#666">分类：' + escHtml(item.category || '未分类') + ' | 工序：' + (item.processes || []).length + '道</span>';
    html += '</div>';
    
    // 内容区域：图片在左，工序表格在右
    html += '<div style="display:flex;padding:10px;gap:10px">';
    
    // 图片区域
    html += '<div style="flex-shrink:0">' + imgHtml + '</div>';
    
    // 工序表格区域
    html += '<div style="flex:1;min-width:0">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    
    // 表头
    html += '<thead>';
    html += '<tr style="background:#f3f4f6">';
    html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:left;width:50%">步骤</th>';
    html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:20%">单价</th>';
    html += '<th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:30%">小计</th>';
    html += '</tr>';
    html += '</thead>';
    
    // 表体
    html += '<tbody>';
    
    // 先计算每个类型的小计
    var typeTotals = {};
    (item.processes || []).forEach(function(p) {
      var subtotal = (p.price || 0) * (p.qty || 1);
      if (!typeTotals[p.type]) typeTotals[p.type] = 0;
      typeTotals[p.type] += subtotal;
    });
    
    // 记录每个类型是否已经显示过小计
    var typeShown = {};
    
    (item.processes || []).forEach(function(p, pIdx) {
      var typeName = {pingche:'平车', zache:'扎车', kanche:'坎车'}[p.type] || p.type;
      var subtotal = (p.price || 0) * (p.qty || 1);
      
      // 判断是否是该类型的第一道工序
      var isFirstOfType = !typeShown[p.type];
      if (isFirstOfType) typeShown[p.type] = true;
      
      html += '<tr>';
      html += '<td style="border:1px solid #ccc;padding:5px 8px">' + escHtml(p.name || '未命名') + '</td>';
      html += '<td style="border:1px solid #ccc;padding:5px 8px;text-align:center">¥' + (p.price || 0).toFixed(2) + '</td>';
      
      // 如果是该类型的第一道工序，显示类型小计；否则显示工序小计
      if (isFirstOfType && typeTotals[p.type] > 0) {
        html += '<td style="border:1px solid #ccc;padding:5px 8px;text-align:center;color:#333;font-weight:600;background:#fef3c7">' + typeName + ' ¥' + typeTotals[p.type].toFixed(2) + '</td>';
      } else {
        html += '<td style="border:1px solid #ccc;padding:5px 8px;text-align:center;color:#333">¥' + subtotal.toFixed(2) + '</td>';
      }
      
      html += '</tr>';
    });
    
    // 合计行
    html += '<tr style="background:#fecaca;font-weight:700">';
    html += '<td colspan="2" style="border:1px solid #ccc;padding:8px;text-align:right;color:#333;font-size:14px">合计</td>';
    html += '<td style="border:1px solid #ccc;padding:8px;text-align:center;color:#333;font-size:16px">¥' + total.toFixed(2) + '</td>';
    html += '</tr>';
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    html += '</div>';
    
    // 操作按钮行
    html += '<div style="padding:8px 12px;background:#f9fafb;border-top:1px solid #ddd;display:flex;gap:6px;justify-content:flex-end">';
    html += '<button onclick="loadLibraryStyle(' + idx + ')" style="padding:6px 14px;background:#4361ee;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">📋 加载使用</button>';
    html += '<button onclick="viewLibraryDetail(' + idx + ')" style="padding:6px 10px;background:#8b5cf6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">👁️ 详情</button>';
    html += '<button onclick="editLibraryStyle(' + idx + ')" style="padding:6px 10px;background:#f59e0b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">✏️ 编辑</button>';
    html += '<button onclick="deleteLibraryStyle(' + idx + ')" style="padding:6px 10px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">🗑️ 删除</button>';
    html += '</div>';
    
    html += '</div>';

  });

  html += '</div>';

  listEl.innerHTML = html;

}



function viewLibraryImage(idx) {

  var library = getLibrary();

  var item = library[idx];

  if (!item || !item.image) return;

  var lightbox = document.getElementById('imgLightbox');

  var img = document.getElementById('lightboxImg');

  if (lightbox && img) { img.src = item.image; lightbox.style.display = 'flex'; }

}



function addLibraryStyle() {

  var name = prompt('请输入款式名称：');

  if (!name) return;

  var category = prompt('请输入分类（如：针织、婴童装、连衣裙等）：', '针织') || '未分类';

  var tags = prompt('请输入标签（用逗号分隔，如：短袖,圆领,婴童）：') || '';

  var library = getLibrary();

  library.unshift({

    id: Date.now(), name: name, category: category,

    tags: tags.split(/[,，]/).map(function(t){return t.trim();}).filter(Boolean),

    image: '', processes: [], createdAt: Date.now()

  });

  saveLibrary(library); renderLibrary();

  toast('✅ 已添加款式「' + name + '」');

}



function editLibraryStyle(idx) {

  var library = getLibrary();

  var item = library[idx];

  if (!item) return;

  var name = prompt('款式名称：', item.name || '');

  if (name === null) return;

  var category = prompt('分类：', item.category || '');

  if (category === null) return;

  var tags = prompt('标签（逗号分隔）：', (item.tags || []).join(','));

  if (tags === null) return;

  item.name = name; item.category = category;

  item.tags = tags.split(/[,，]/).map(function(t){return t.trim();}).filter(Boolean);

  library[idx] = item; saveLibrary(library); renderLibrary();

  toast('✅ 已更新款式信息');

}



function deleteLibraryStyle(idx) {

  var library = getLibrary();

  var item = library[idx];

  if (!item) return;

  if (!confirm('确定删除款式「' + item.name + '」？')) return;

  library.splice(idx, 1); saveLibrary(library); renderLibrary();

  toast('✅ 已删除');

}




// 查看款式库详情
function viewLibraryDetail(idx) {
  var library = getLibrary();
  var item = library[idx];
  if (!item) return;

  var typeNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };
  var total = 0;
  (item.processes || []).forEach(function(p) { total += (p.price || 0) * (p.qty || 1); });

  var procsHtml = '';
  if (item.processes && item.processes.length > 0) {
    procsHtml = '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">';
    procsHtml += '<thead><tr style="background:#f3f4f6"><th style="padding:8px;text-align:left;border:1px solid #e5e7eb">工序名称</th><th style="padding:8px;text-align:center;border:1px solid #e5e7eb">类型</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb">单价</th><th style="padding:8px;text-align:center;border:1px solid #e5e7eb">数量</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb">小计</th></tr></thead><tbody>';
    item.processes.forEach(function(p) {
      var subtotal = (p.price || 0) * (p.qty || 1);
      procsHtml += '<tr><td style="padding:8px;border:1px solid #e5e7eb">' + escHtml(p.name || '未命名') + '</td><td style="padding:8px;text-align:center;border:1px solid #e5e7eb">' + (typeNames[p.type] || p.type) + '</td><td style="padding:8px;text-align:right;border:1px solid #e5e7eb">¥' + (p.price || 0).toFixed(2) + '</td><td style="padding:8px;text-align:center;border:1px solid #e5e7eb">' + (p.qty || 1) + '</td><td style="padding:8px;text-align:right;border:1px solid #e5e7eb;color:#e94560;font-weight:600">¥' + subtotal.toFixed(2) + '</td></tr>';
    });
    procsHtml += '<tr style="background:#fef2f2;font-weight:700"><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e5e7eb">合计：</td><td style="padding:8px;text-align:right;border:1px solid #e5e7eb;color:#e94560">¥' + total.toFixed(2) + '</td></tr>';
    procsHtml += '</tbody></table>';
  } else {
    procsHtml = '<div style="text-align:center;padding:20px;color:#9ca3af">暂无工序数据</div>';
  }

  var tagsHtml = (item.tags || []).map(function(t) { return '<span style="display:inline-block;background:#e0e7ff;color:#4338ca;padding:3px 10px;border-radius:12px;font-size:12px;margin:2px">' + escHtml(t) + '</span>'; }).join('');

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">' +
      '<div><h3 style="margin:0 0 8px 0;font-size:20px;color:#1a1a2e">' + escHtml(item.name || '未命名') + '</h3>' +
      '<div style="font-size:13px;color:#6b7280">分类：' + escHtml(item.category || '未分类') + ' | 工序：' + (item.processes || []).length + '道</div></div>' +
      '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#999;padding:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%">✕</button>' +
    '</div>' +
    (item.image ? '<img src="' + item.image + '" style="width:100%;max-height:200px;object-fit:contain;border-radius:10px;background:#f5f5f5;margin-bottom:16px">' : '') +
    (tagsHtml ? '<div style="margin-bottom:12px">' + tagsHtml + '</div>' : '') +
    (item.note ? '<div style="background:#fef3c7;padding:10px 14px;border-radius:8px;font-size:13px;color:#92400e;margin-bottom:12px">📝 ' + escHtml(item.note) + '</div>' : '') +
    '<div style="font-size:24px;font-weight:700;color:#e94560;margin-bottom:8px">💰 总成本：¥' + total.toFixed(2) + '</div>' +
    procsHtml +
    '<div style="display:flex;gap:10px;margin-top:20px">' +
      '<button onclick="loadLibraryStyle(' + idx + ');this.parentElement.parentElement.parentElement.remove()" style="flex:1;padding:12px;background:linear-gradient(135deg,#4361ee,#3730a3);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer">📋 加载使用</button>' +
      '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding:12px 24px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer">关闭</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(modal);
}

function loadLibraryStyle(idx) {

  var library = getLibrary();

  var item = library[idx];

  if (!item) return;

  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});

  var devBtn = document.querySelector('[data-tab="dev"]');

  if (devBtn) devBtn.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(function(c){c.style.display='none';});

  var devTab = document.getElementById('tab-dev');

  if (devTab) devTab.style.display = 'block';

  if (typeof loadStyle === 'function' && item.processes) {

    var styleData = {

      name: item.name, category: item.category,

      date: new Date().toISOString().slice(0,10),

      selections: item.processes.map(function(p) {

        return { name: p.name, type: p.type, price: p.price, qty: p.qty || 1 };

      })

    };

    loadStyle(styleData);

  }

  toast('✅ 已加载款式「' + item.name + '」');

}



function exportLibrary() {

  var library = getLibrary();

  if (library.length === 0) { toast('⚠️ 款式库为空，无法导出'); return; }

  var typeNames = { pingche: '平车', zache: '扎车', kanche: '坎车' };

  var rows = [['款式名称', '分类', '标签', '工序名称', '工序类型', '单价', '数量', '小计']];

  library.forEach(function(item) {

    var total = 0;

    (item.processes || []).forEach(function(p) {

      var subtotal = (p.price || 0) * (p.qty || 1);

      total += subtotal;

      rows.push([item.name || '', item.category || '', (item.tags || []).join(','), p.name || '', typeNames[p.type] || p.type || '', p.price || 0, p.qty || 1, subtotal.toFixed(2)]);

    });

    rows.push([item.name || '', '', '', '合计', '', '', '', total.toFixed(2)]);

    rows.push(['', '', '', '', '', '', '', '']);

  });

  var ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [{wch:20},{wch:10},{wch:20},{wch:30},{wch:10},{wch:8},{wch:8},{wch:10}];

  var wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, '款式库');

  var filename = '多绮爱服饰款式库_' + new Date().toISOString().slice(0,10) + '.xlsx';

  XLSX.writeFile(wb, filename);

  toast('✅ 已导出款式库：' + filename);

}



function importLibrary(event) {

  var file = event.target.files[0];

  if (!file) return;

  var reader = new FileReader();

  reader.onload = function(e) {

    try {

      var data = new Uint8Array(e.target.result);

      var workbook = XLSX.read(data, {type: 'array'});

      var sheetName = workbook.SheetNames[0];

      var worksheet = workbook.Sheets[sheetName];

      var jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

      var library = getLibrary();

      var importCount = 0;

      var currentStyle = null;

      var typeMap = { '平车': 'pingche', '扎车': 'zache', '坎车': 'kanche' };

      for (var i = 1; i < jsonData.length; i++) {

        var row = jsonData[i];

        if (!row || row.length === 0) continue;

        var name = row[0] ? String(row[0]).trim() : '';

        var category = row[1] ? String(row[1]).trim() : '';

        var tags = row[2] ? String(row[2]).trim() : '';

        var procName = row[3] ? String(row[3]).trim() : '';

        var procType = row[4] ? String(row[4]).trim() : '';

        var price = parseFloat(row[5]) || 0;

        var qty = parseInt(row[6]) || 1;

        if (name && name !== '合计' && procName !== '合计') {

          if (currentStyle) { library.push(currentStyle); importCount++; }

          currentStyle = {

            id: Date.now() + Math.random(), name: name, category: category || '未分类',

            tags: tags ? tags.split(/[,，]/).map(function(t){return t.trim();}).filter(Boolean) : [],

            image: '', processes: [], createdAt: Date.now()

          };

          if (procName) { currentStyle.processes.push({ name: procName, type: typeMap[procType] || 'pingche', price: price, qty: qty }); }

        } else if (currentStyle && procName && procName !== '合计') {

          currentStyle.processes.push({ name: procName, type: typeMap[procType] || 'pingche', price: price, qty: qty });

        }

      }

      if (currentStyle) { library.push(currentStyle); importCount++; }

      saveLibrary(library); renderLibrary();

      toast('✅ 成功导入 ' + importCount + ' 个款式');

    } catch(err) {

      console.error(err);

      toast('❌ 导入失败：' + err.message);

    }

  };

  reader.readAsArrayBuffer(file);

  event.target.value = '';

}



// 使模态框可拖动
function makeDraggable(modal, handle) {
  var isDragging = false;
  var startX, startY, initialLeft, initialTop;
  
  handle = handle || modal.querySelector('.draggable-header') || modal.querySelector('h3') || modal.firstElementChild;
  
  if (!handle) return;
  
  handle.style.cursor = 'move';
  handle.style.userSelect = 'none';
  
  handle.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    var rect = modal.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // 确保使用fixed定位，相对于视口
    modal.style.position = 'fixed';
    modal.style.margin = '0';
    modal.style.left = initialLeft + 'px';
    modal.style.top = initialTop + 'px';
    modal.style.right = 'auto';
    modal.style.bottom = 'auto';
    modal.style.transform = 'none';
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    
    modal.style.left = (initialLeft + dx) + 'px';
    modal.style.top = (initialTop + dy) + 'px';
  });
  
  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
  
  // 触摸设备支持
  handle.addEventListener('touchstart', function(e) {
    isDragging = true;
    var touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    
    var rect = modal.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    modal.style.position = 'fixed';
    modal.style.margin = '0';
    modal.style.left = initialLeft + 'px';
    modal.style.top = initialTop + 'px';
    modal.style.transform = 'none';
    
    e.preventDefault();
  });
  
  document.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    
    var touch = e.touches[0];
    var dx = touch.clientX - startX;
    var dy = touch.clientY - startY;
    
    modal.style.left = (initialLeft + dx) + 'px';
    modal.style.top = (initialTop + dy) + 'px';
  });
  
  document.addEventListener('touchend', function() {
    isDragging = false;
  });
}

function searchByImage(event) {
  var file = event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    var imageData = e.target.result;
    
    // 创建图片预览和搜索弹窗
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:transparent;pointer-events:none';
    modal.innerHTML = '<div class="search-modal-content" style="position:absolute;top:20px;right:20px;background:#fff;border-radius:16px;padding:20px;max-width:420px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);pointer-events:auto">' +
      '<div class="draggable-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;cursor:move;padding-bottom:8px;border-bottom:2px solid #f3f4f6">' +
        '<h3 style="margin:0;font-size:16px;color:#1a1a2e">🖼️ 以图搜款 <span style="font-size:11px;color:#9ca3af;font-weight:normal">（拖动标题）</span></h3>' +
        '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%">✕</button>' +
      '</div>' +
      '<img src="' + imageData + '" style="width:100%;max-height:250px;object-fit:contain;border-radius:12px;background:#f5f5f5;margin-bottom:16px">' +
      '<div style="margin-bottom:12px"><label style="font-size:14px;color:#555;font-weight:600;display:block;margin-bottom:8px">输入关键词搜索：</label>' +
        '<input type="text" id="imageSearchKeyword" placeholder="如：短袖、圆领、连衣裙、针织..." style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none" onfocus="this.style.borderColor=\'#8b5cf6\'" onblur="this.style.borderColor=\'#e5e7eb\'">' +
      '</div>' +
      '<div style="margin-bottom:16px"><label style="font-size:14px;color:#555;font-weight:600;display:block;margin-bottom:8px">快速选择：</label>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
          '<button onclick="document.getElementById(\'imageSearchKeyword\').value=\'短袖\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">短袖</button>' +
          '<button onclick="document.getElementById(\'imageSearchKeyword\').value=\'长袖\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">长袖</button>' +
          '<button onclick="document.getElementById(\'imageSearchKeyword\').value=\'连衣裙\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">连衣裙</button>' +
          '<button onclick="document.getElementById(\'imageSearchKeyword\').value=\'套装\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">套装</button>' +
          '<button onclick="document.getElementById(\'imageSearchKeyword\').value=\'针织\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">针织</button>' +
          '<button onclick="document.getElementById(\'imageSearchKeyword\').value=\'牛仔\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">牛仔</button>' +
          '<button onclick="document.getElementById(\'imageSearchKeyword\').value=\'外套\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">外套</button>' +
          '<button onclick="document.getElementById(\'imageSearchKeyword\').value=\'哈衣\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">哈衣</button>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:10px">' +
        '<button onclick="doAIColorSearch(this)" style="flex:1;padding:12px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">🤖 AI图像识别搜款</button>' +
      '</div>' +
      '<div style="display:flex;gap:10px">' +
        '<button onclick="var kw=document.getElementById(\'imageSearchKeyword\').value;if(kw){var si=document.getElementById(\'librarySearch\');if(si){si.value=kw;renderLibrary();}this.closest(\'div[style*=fixed]\').remove();toast(\'🔍 已搜索：\'+kw);}else{toast(\'⚠️ 请输入关键词\');}" style="flex:1;padding:12px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer">🔍 关键词搜索</button>' +
        '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="padding:12px 20px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer">取消</button>' +
      '</div>' +
      '<div style="margin-top:16px;padding:12px;background:#dbeafe;border-radius:10px;font-size:12px;color:#1e40af;line-height:1.6">🤖 <b>AI图像识别</b>：使用MobileNet深度学习模型提取图片特征，自动搜索款式库中视觉相似的款式。首次使用需下载AI模型（约10MB），请耐心等待。</div>' +
    '</div>';
    document.body.appendChild(modal);
    
    // 使模态框可拖动
    var modalContent = modal.querySelector('.search-modal-content');
    var draggableHeader = modal.querySelector('.draggable-header');
    if (modalContent && draggableHeader) {
      makeDraggable(modalContent, draggableHeader);
    }
    
    // 聚焦输入框
    setTimeout(function() {
      var input = document.getElementById('imageSearchKeyword');
      if (input) input.focus();
    }, 100);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// 历史款式以图搜款
function searchHistoryByImage(event) {
  var file = event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    var imageData = e.target.result;
    
    // 创建图片预览和搜索弹窗
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:transparent;pointer-events:none';
    modal.innerHTML = '<div class="search-modal-content" style="position:absolute;top:20px;right:20px;background:#fff;border-radius:16px;padding:20px;max-width:420px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);pointer-events:auto">' +
      '<div class="draggable-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;cursor:move;padding-bottom:8px;border-bottom:2px solid #f3f4f6">' +
        '<h3 style="margin:0;font-size:16px;color:#1a1a2e">🖼️ 历史款式以图搜款 <span style="font-size:11px;color:#9ca3af;font-weight:normal">（拖动标题）</span></h3>' +
        '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%">✕</button>' +
      '</div>' +
      '<img src="' + imageData + '" style="width:100%;max-height:250px;object-fit:contain;border-radius:12px;background:#f5f5f5;margin-bottom:16px">' +
      '<div style="margin-bottom:12px"><label style="font-size:14px;color:#555;font-weight:600;display:block;margin-bottom:8px">输入关键词搜索：</label>' +
        '<input type="text" id="historyImageSearchKeyword" placeholder="如：短袖、圆领、连衣裙、针织..." style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none" onfocus="this.style.borderColor=\'#8b5cf6\'" onblur="this.style.borderColor=\'#e5e7eb\'">' +
      '</div>' +
      '<div style="margin-bottom:16px"><label style="font-size:14px;color:#555;font-weight:600;display:block;margin-bottom:8px">快速选择：</label>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
          '<button onclick="document.getElementById(\'historyImageSearchKeyword\').value=\'短袖\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">短袖</button>' +
          '<button onclick="document.getElementById(\'historyImageSearchKeyword\').value=\'长袖\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">长袖</button>' +
          '<button onclick="document.getElementById(\'historyImageSearchKeyword\').value=\'连衣裙\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">连衣裙</button>' +
          '<button onclick="document.getElementById(\'historyImageSearchKeyword\').value=\'套装\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">套装</button>' +
          '<button onclick="document.getElementById(\'historyImageSearchKeyword\').value=\'针织\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">针织</button>' +
          '<button onclick="document.getElementById(\'historyImageSearchKeyword\').value=\'牛仔\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">牛仔</button>' +
          '<button onclick="document.getElementById(\'historyImageSearchKeyword\').value=\'外套\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">外套</button>' +
          '<button onclick="document.getElementById(\'historyImageSearchKeyword\').value=\'哈衣\'" style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;cursor:pointer;color:#374151">哈衣</button>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:10px">' +
        '<button onclick="doAIColorSearch(this)" style="flex:1;padding:12px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">🤖 AI图像识别搜款</button>' +
      '</div>' +
      '<div style="display:flex;gap:10px">' +
        '<button onclick="var kw=document.getElementById(\'historyImageSearchKeyword\').value;if(kw){var si=document.getElementById(\'searchInput\');if(si){si.value=kw;renderHistory();}this.closest(\'div[style*=fixed]\').remove();toast(\'🔍 已搜索：\'+kw);}else{toast(\'⚠️ 请输入关键词\');}" style="flex:1;padding:12px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer">🔍 关键词搜索</button>' +
        '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="padding:12px 20px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer">取消</button>' +
      '</div>' +
      '<div style="margin-top:16px;padding:12px;background:#dbeafe;border-radius:10px;font-size:12px;color:#1e40af;line-height:1.6">🤖 <b>AI图像识别</b>：使用颜色直方图算法提取图片特征，自动搜索历史款式中视觉相似的款式。分析速度快，无需下载模型。</div>' +
    '</div>';
    document.body.appendChild(modal);
    
    // 使模态框可拖动
    var modalContent = modal.querySelector('.search-modal-content');
    var draggableHeader = modal.querySelector('.draggable-header');
    if (modalContent && draggableHeader) {
      makeDraggable(modalContent, draggableHeader);
    }
    
    // 聚焦输入框
    setTimeout(function() {
      var input = document.getElementById('historyImageSearchKeyword');
      if (input) input.focus();
    }, 100);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}



// 动态创建款式库按钮（确保文字显示）
function initLibraryButtons() {
  var btnContainer = document.getElementById('libraryButtons');
  if (btnContainer) {
    btnContainer.innerHTML = '';
    var buttons = [
      { text: '📥 导入Excel', bg: '#dbeafe', color: '#1e40af', border: '#3b82f6', action: "document.getElementById('libraryImportFile').click()" },
      { text: '📤 导出Excel', bg: '#d1fae5', color: '#065f46', border: '#10b981', action: 'exportLibrary()' },
      { text: '➕ 添加款式', bg: '#fef3c7', color: '#92400e', border: '#f59e0b', action: 'addLibraryStyle()' }
    ];
    buttons.forEach(function(btn) {
      var div = document.createElement('div');
      div.textContent = btn.text;
      div.setAttribute('onclick', btn.action);
      div.className = 'library-action-btn';
      div.style.cssText = 'min-width:100px;padding:10px 14px;background:' + btn.bg + ' !important;color:' + btn.color + ' !important;font-size:13px;font-weight:600;text-align:center;border:2px solid ' + btn.border + ';border-radius:8px;cursor:pointer;user-select:none;display:inline-block;line-height:1.4;white-space:nowrap;';
      btnContainer.appendChild(div);
    });
  }
  var imgBtnContainer = document.getElementById('libraryImageSearchBtn');
  if (imgBtnContainer) {
    imgBtnContainer.innerHTML = '';
    var div = document.createElement('div');
    div.textContent = '🖼️ 以图搜款';
    div.setAttribute('onclick', "document.getElementById('libraryImageSearch').click()");
    div.className = 'library-action-btn';
    div.style.cssText = 'padding:10px 14px;background:#ede9fe !important;color:#5b21b6 !important;font-size:13px;font-weight:600;text-align:center;border:2px solid #8b5cf6;border-radius:8px;cursor:pointer;user-select:none;display:inline-block;line-height:1.4;white-space:nowrap;';
    imgBtnContainer.appendChild(div);
  }
}

// 加载默认款式库数据（如果localStorage中没有数据）
function loadDefaultLibrary() {
  var library = JSON.parse(localStorage.getItem('style_library') || '[]');
  if (library.length === 0) {
    console.log('款式库为空，开始加载默认数据...');
    fetch('styles_with_images_v3.json?t=' + Date.now())
      .then(function(response) { return response.json(); })
      .then(function(data) {
        localStorage.setItem('style_library', JSON.stringify(data));
        console.log('默认数据加载完成，共 ' + data.length + ' 个款式');
        if (typeof renderLibrary === 'function') {
          renderLibrary();
        }
      })
      .catch(function(error) {
        console.error('加载默认数据失败:', error);
      });
  }
}

// 页面加载完成后初始化按钮
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initLibraryButtons();
    loadDefaultLibrary();
    // 给款式详情窗口添加拖动功能
    setTimeout(function() {
      var detailModal = document.querySelector('.detail-modal-content');
      var detailHeader = document.querySelector('.detail-draggable-header');
      if (detailModal && detailHeader) {
        makeDraggable(detailModal, detailHeader);
      }
    }, 500);
  });
} else {
  initLibraryButtons();
  loadDefaultLibrary();
  // 给款式详情窗口添加拖动功能
  setTimeout(function() {
    var detailModal = document.querySelector('.detail-modal-content');
    var detailHeader = document.querySelector('.detail-draggable-header');
    if (detailModal && detailHeader) {
      makeDraggable(detailModal, detailHeader);
    }
  }, 500);
}


// 同步已审批款式到款式库
function syncToLibrary(styleId) {
  var style = DB.styles.find(function(s) { return s.id === styleId; });
  if (!style) {
    toast('❌ 款式不存在');
    return;
  }
  
  if (style.status !== 'approved') {
    toast('⚠️ 只有已审批的款式才能同步到款式库');
    return;
  }
  
  var library = getLibrary();
  
  // 检查是否已存在同名款式
  var existingIdx = library.findIndex(function(item) { return item.name === style.name; });
  
  // 转换工序数据
  var processes = (style.selections || style.processes || []).map(function(p) {
    return {
      type: p.type || 'pingche',
      name: p.name || '',
      price: p.price || 0,
      qty: p.qty || 1
    };
  });
  
  // 构建款式库数据
  var libraryItem = {
    id: 'lib_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: style.name || '',
    category: style.category || '',
    tags: style.tags || [],
    processes: processes,
    image: (style.imgs && style.imgs[0]) || '',
    note: style.note || '',
    totalPrice: 0,
    createdAt: new Date().toISOString(),
    syncedFrom: styleId,
    syncedAt: new Date().toISOString()
  };
  
  // 计算总价
  libraryItem.processes.forEach(function(p) {
    libraryItem.totalPrice += (p.price || 0) * (p.qty || 1);
  });
  
  if (existingIdx >= 0) {
    // 更新已存在的款式
    if (confirm('款式库中已存在同名款式"' + style.name + '"，是否更新？')) {
      libraryItem.id = library[existingIdx].id;
      libraryItem.createdAt = library[existingIdx].createdAt;
      library[existingIdx] = libraryItem;
      saveLibrary(library);
      toast('✅ 款式已更新到款式库');
    }
  } else {
    // 添加新款式
    library.push(libraryItem);
    saveLibrary(library);
    toast('✅ 款式已同步到款式库');
  }
  
  renderLibrary();
}

// 批量同步所有已审批款式到款式库
function syncAllApprovedToLibrary() {
  var approvedStyles = DB.styles.filter(function(s) { return s.status === 'approved'; });
  if (approvedStyles.length === 0) {
    toast('⚠️ 没有已审批的款式');
    return;
  }
  
  if (!confirm('确定要把 ' + approvedStyles.length + ' 个已审批款式同步到款式库吗？')) {
    return;
  }
  
  var library = getLibrary();
  var added = 0;
  var updated = 0;
  
  approvedStyles.forEach(function(style) {
    var existingIdx = library.findIndex(function(item) { return item.name === style.name; });
    
    var processes = (style.selections || style.processes || []).map(function(p) {
      return {
        type: p.type || 'pingche',
        name: p.name || '',
        price: p.price || 0,
        qty: p.qty || 1
      };
    });
    
    var totalPrice = 0;
    processes.forEach(function(p) { totalPrice += (p.price || 0) * (p.qty || 1); });
    
    var libraryItem = {
      id: existingIdx >= 0 ? library[existingIdx].id : 'lib_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: style.name || '',
      category: style.category || '',
      tags: style.tags || [],
      processes: processes,
      image: (style.imgs && style.imgs[0]) || '',
      note: style.note || '',
      totalPrice: totalPrice,
      createdAt: existingIdx >= 0 ? library[existingIdx].createdAt : new Date().toISOString(),
      syncedFrom: style.id,
      syncedAt: new Date().toISOString()
    };
    
    if (existingIdx >= 0) {
      library[existingIdx] = libraryItem;
      updated++;
    } else {
      library.push(libraryItem);
      added++;
    }
  });
  
  saveLibrary(library);
  renderLibrary();
  toast('✅ 同步完成：新增 ' + added + ' 款，更新 ' + updated + ' 款');
}


// ===== AI图像识别搜款（TensorFlow.js + MobileNet）=====
// 颜色直方图图像相似度搜索（不依赖外部模型，快速稳定）
let historyImageFeatures = {}; // 缓存历史款式图片的特征向量

// 提取图像颜色直方图特征（优化版：32x32，更快速度）
function extractColorHistogram(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // 缩放到32x32，更准确的特征
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(img, 0, 0, 32, 32);
        
        const imageData = ctx.getImageData(0, 0, 32, 32);
        const data = imageData.data;
        
        // 改进的颜色直方图：每个通道8个区间，共512个bin，更准确
        const bins = 512;
        const histogram = new Array(bins).fill(0);
        
        // 颜色布局特征：把图片分成4x4的网格，每个网格计算平均颜色
        const gridSize = 4;
        const gridColors = [];
        for (let gy = 0; gy < gridSize; gy++) {
          for (let gx = 0; gx < gridSize; gx++) {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            const xStart = Math.floor(gx * 32 / gridSize);
            const xEnd = Math.floor((gx + 1) * 32 / gridSize);
            const yStart = Math.floor(gy * 32 / gridSize);
            const yEnd = Math.floor((gy + 1) * 32 / gridSize);
            for (let y = yStart; y < yEnd; y++) {
              for (let x = xStart; x < xEnd; x++) {
                const idx = (y * 32 + x) * 4;
                rSum += data[idx];
                gSum += data[idx + 1];
                bSum += data[idx + 2];
                count++;
              }
            }
            gridColors.push({
              r: Math.round(rSum / count),
              g: Math.round(gSum / count),
              b: Math.round(bSum / count)
            });
          }
        }
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] >> 5;     // 0-7 (除以32)
          const g = data[i + 1] >> 5; // 0-7
          const b = data[i + 2] >> 5; // 0-7
          const idx = (r << 6) | (g << 3) | b;
          histogram[idx]++;
        }
        
        // 归一化颜色直方图
        const total = 32 * 32;
        for (let i = 0; i < bins; i++) {
          histogram[i] /= total;
        }
        
        // 组合特征：颜色直方图 + 颜色布局特征
        const features = {
          histogram: histogram,
          gridColors: gridColors
        };
        
        resolve(features);
      } catch (e) {
        console.error('特征提取失败:', e);
        resolve(null);
      }
    };
    img.onerror = function() {
      resolve(null);
    };
    img.src = imageSrc;
  });
}

// 计算两个特征的相似度（颜色直方图 + 颜色布局）
function histogramSimilarity(feat1, feat2) {
  if (!feat1 || !feat2) return 0;
  
  // 兼容旧格式（纯数组）
  if (Array.isArray(feat1) && Array.isArray(feat2)) {
    if (feat1.length !== feat2.length) return 0;
    let intersection = 0;
    for (let i = 0; i < feat1.length; i++) {
      intersection += Math.min(feat1[i], feat2[i]);
    }
    return intersection;
  }
  
  // 新格式（包含histogram和gridColors）
  const hist1 = feat1.histogram || feat1;
  const hist2 = feat2.histogram || feat2;
  const grid1 = feat1.gridColors;
  const grid2 = feat2.gridColors;
  
  // 颜色直方图相似度（直方图交集）
  let histSim = 0;
  if (Array.isArray(hist1) && Array.isArray(hist2) && hist1.length === hist2.length) {
    for (let i = 0; i < hist1.length; i++) {
      histSim += Math.min(hist1[i], hist2[i]);
    }
  }
  
  // 颜色布局相似度（4x4网格的平均颜色差异）
  let layoutSim = 0;
  if (grid1 && grid2 && grid1.length === grid2.length) {
    let totalDiff = 0;
    for (let i = 0; i < grid1.length; i++) {
      const dr = Math.abs(grid1[i].r - grid2[i].r) / 255;
      const dg = Math.abs(grid1[i].g - grid2[i].g) / 255;
      const db = Math.abs(grid1[i].b - grid2[i].b) / 255;
      totalDiff += (dr + dg + db) / 3;
    }
    layoutSim = 1 - (totalDiff / grid1.length);
  }
  
  // 加权组合：颜色直方图占60%，颜色布局占40%
  const finalSim = histSim * 0.6 + layoutSim * 0.4;
  
  return finalSim;
}

// AI图像搜款（使用颜色直方图，搜索历史款式）
async function aiImageSearch(imageDataUrl, callback) {
  const resultDiv = document.getElementById('aiSearchResult');
  if (resultDiv) {
    resultDiv.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280"><div style="font-size:32px;margin-bottom:10px">🤖</div>正在分析图片...</div>';
  }
  
  // 提取上传图片的特征
  const targetFeatures = await extractColorHistogram(imageDataUrl);
  if (!targetFeatures) {
    if (resultDiv) {
      resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">❌ 图片分析失败，请尝试其他图片</div>';
    }
    callback([]);
    return;
  }
  
  // 搜索历史款式
  const styles = DB.styles || [];
  const itemsWithImage = styles.filter(item => item.imgs && item.imgs[0]);
  const total = itemsWithImage.length;
  
  if (total === 0) {
    if (resultDiv) {
      resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af">📭 历史款式中没有带图片的款式</div>';
    }
    callback([]);
    return;
  }
  
  const results = [];
  let processed = 0;
  let isCancelled = false;
  
  // 添加取消搜索按钮
  if (resultDiv) {
    resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">' +
      '<div style="font-size:24px;margin-bottom:8px">🔍</div>' +
      '<div style="margin-bottom:8px">正在分析图片... (0/' + total + ')</div>' +
      '<div style="width:100%;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-bottom:12px">' +
      '<div id="aiSearchProgress" style="width:0%;height:100%;background:linear-gradient(90deg,#10b981,#059669);transition:width 0.3s"></div></div>' +
      '<button onclick="window.aiSearchCancelled=true" style="padding:8px 20px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer">取消搜索</button></div>';
  }
  
  // 并行处理（同时处理20个图片，大幅提高速度）
  const batchSize = 20;
  for (let batchStart = 0; batchStart < itemsWithImage.length; batchStart += batchSize) {
    // 检查是否取消
    if (window.aiSearchCancelled) {
      if (resultDiv) {
        resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">⏹️ 搜索已取消</div>';
      }
      window.aiSearchCancelled = false;
      callback([]);
      return;
    }
    
    const batch = itemsWithImage.slice(batchStart, batchStart + batchSize);
    
    // 并行提取当前批次的特征
    const batchPromises = batch.map(async (item) => {
      const idx = styles.indexOf(item);
      let features = historyImageFeatures[item.id];
      if (!features) {
        features = await extractColorHistogram(item.imgs[0]);
        if (features) {
          historyImageFeatures[item.id] = features;
        }
      }
      return { idx, item, features };
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(({ idx, item, features }) => {
      processed++;
      if (features) {
        const similarity = histogramSimilarity(targetFeatures, features);
        results.push({ idx, item, similarity });
      }
    });
    
    // 更新进度
    if (resultDiv) {
      const percent = Math.round((processed / total) * 100);
      const progressBar = document.getElementById('aiSearchProgress');
      if (progressBar) {
        progressBar.style.width = percent + '%';
      }
      const progressText = resultDiv.querySelector('div');
      if (progressText && progressText.textContent.indexOf('正在分析图片') >= 0) {
        progressText.innerHTML = '正在分析图片... (' + processed + '/' + total + ')';
      }
    }
    
    // 让浏览器有时间响应，避免页面卡住
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  // 按相似度排序
  results.sort((a, b) => b.similarity - a.similarity);
  
  // 显示结果
  if (resultDiv) {
    if (results.length === 0) {
      resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af">未找到相似款式</div>';
    } else {
      let html = '<div style="font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:10px">🎯 找到 ' + results.length + ' 个相似款式（按相似度排序）</div>';
      html += '<div style="max-height:350px;overflow-y:auto">';
      
      results.slice(0, 10).forEach((r, idx) => {
        const simPercent = (r.similarity * 100).toFixed(1);
        const simColor = simPercent >= 70 ? '#10b981' : simPercent >= 50 ? '#f59e0b' : '#ef4444';
        
        html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid #e5e7eb;cursor:pointer;border-radius:8px" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'transparent\'" onclick="showDetail(\'' + r.item.id + '\')">';
        
        if (r.item.imgs && r.item.imgs[0]) {
          html += '<img src="' + r.item.imgs[0] + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px">';
        } else {
          html += '<div style="width:60px;height:60px;background:#e5e7eb;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px">👔</div>';
        }
        
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-weight:600;font-size:14px;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(r.item.name || '未命名') + '</div>';
        html += '<div style="font-size:12px;color:#6b7280;margin-top:2px">日期：' + (r.item.date || '未知') + ' | 工序：' + ((r.item.selections || r.item.processes || []).length) + '道</div>';
        html += '</div>';
        
        html += '<div style="text-align:right;flex-shrink:0">';
        html += '<div style="font-size:20px;font-weight:700;color:' + simColor + '">' + simPercent + '%</div>';
        html += '<div style="font-size:10px;color:#9ca3af">相似度</div>';
        html += '</div>';
        
        html += '</div>';
      });
      
      html += '</div>';
      resultDiv.innerHTML = html;
    }
  }
  
  callback(results);
}

// 执行AI颜色搜款（改进版，使用AI图像识别）
function doAIColorSearch(btn) {
  var modal = btn.closest('div[style*=fixed]');
  if (!modal) return;
  
  var img = modal.querySelector('img');
  if (!img || !img.src) {
    toast('⚠️ 没有找到图片');
    return;
  }
  
  var imgData = img.src;
  
  // 创建结果容器
  var resultDiv = document.createElement('div');
  resultDiv.id = 'aiSearchResult';
  resultDiv.style.cssText = 'margin-top:16px;padding:16px;background:#f9fafb;border-radius:10px;min-height:100px';
  
  // 移除之前的结果
  var oldResult = modal.querySelector('#aiSearchResult');
  if (oldResult) oldResult.remove();
  
  // 插入到按钮区域前面
  var btnArea = btn.parentElement;
  btnArea.parentElement.insertBefore(resultDiv, btnArea);
  
  // 执行AI图像搜索
  aiImageSearch(imgData, function(results) {
    console.log('AI搜索完成，找到', results.length, '个相似款式');
  });
}
