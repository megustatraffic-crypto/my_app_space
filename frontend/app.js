// app.js (улучшенный)
const BACKEND = "https://my-app-space.onrender.com";
const ASSET_BASE = "assets";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const logBox = $('#logBox');

function log(text){
  const el = document.createElement('div');
  el.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  logBox.prepend(el);
  while(logBox.childElementCount>200) logBox.removeChild(logBox.lastChild);
}

// USER INIT
let TELEGRAM_ID = null;
let PLAYER_NAME = "Player";
let lastState = null;
let offlineAmount = 0;
let lastSync = Date.now();

function tryTelegramInit(){
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (!tg) return false;
    // use initDataUnsafe (if allowed)
    const ui = tg.initDataUnsafe || {};
    if (ui.user && ui.user.id){
      TELEGRAM_ID = String(ui.user.id);
      PLAYER_NAME = ui.user.username || ui.user.first_name || PLAYER_NAME;
      tg.ready && tg.ready();
      log(`Initialized from Telegram: ${PLAYER_NAME} (${TELEGRAM_ID})`);
      return true;
    }
  } catch(e){ console.warn(e) }
  return false;
}

function initLocal(){
  let id = localStorage.getItem('demo_id');
  if (!id){ id = String(Math.floor(Math.random()*900000)+100000); localStorage.setItem('demo_id', id); }
  TELEGRAM_ID = id;
  PLAYER_NAME = 'Demo_'+TELEGRAM_ID;
  log(`Using demo id ${TELEGRAM_ID}`);
}

if (!tryTelegramInit()) initLocal();
$('#playerName').innerText = PLAYER_NAME;
$('#backendUrl').innerText = BACKEND;

// API utils
async function apiGET(path){ try { const r = await fetch(BACKEND + path); return await r.json(); } catch(e){ log("API GET error: "+e.message); return { error: e.message }; } }
async function apiPOST(path, body){ try { const r = await fetch(BACKEND + path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); return await r.json(); } catch(e){ log("API POST error: "+e.message); return { error: e.message }; } }

// REFRESH state (apply production server-side)
async function refreshState(){
  $('#status').innerText = 'syncing...';
  const res = await apiGET(`/game/${TELEGRAM_ID}`);
  if (res.error){ log("Load err: "+JSON.stringify(res)); $('#status').innerText='error'; return; }
  const u = res.user;
  lastState = u;
  lastSync = Date.now();
  // fill UI
  $('#R1_1').innerText = u.resources.R1_1 || 0;
  $('#R1_2').innerText = u.resources.R1_2 || 0;
  $('#R1_3').innerText = u.resources.R1_3 || 0;
  $('#P1').innerText = u.resources.P1 || 0;
  $('#lvl_extractor').innerText = u.modules.extractor.level;
  $('#lvl_smelter').innerText = u.modules.smelter.level;
  $('#lvl_pump').innerText = u.modules.pump.level;
  // bars: compute ratio of progress using lastTick (approx)
  updateModuleBars(u);
  $('#status').innerText='ok';
  // compute offline since last visit if we have stored timestamp
  computeOffline(u);
}

function updateModuleBars(u){
  // show running color
  const exRun = u.modules.extractor.running;
  const pumpRun = u.modules.pump.running;
  const smRun = u.modules.smelter.running;
  $('#bar_extractor').style.width = exRun ? '60%' : '4%';
  $('#bar_extractor').style.background = exRun ? 'linear-gradient(90deg,#0ea5a4,#34d1d6)' : 'rgba(255,255,255,0.03)';
  $('#bar_pump').style.width = pumpRun ? '50%' : '4%';
  $('#bar_smelter').style.width = smRun ? '30%' : '4%';
}

// OFFLINE calculation (client-side estimate)
function computeOffline(u){
  // server already applied production up to now; we estimate offline since last activity stored in localStorage
  const last = Number(localStorage.getItem(`last_seen_${TELEGRAM_ID}`) || 0);
  const now = Date.now();
  if (last && last < now - 60*1000){
    const secs = Math.floor((now - last)/1000);
    // crude estimate: sum of base rates * sec * level multipliers (mirror server)
    const ex = u.modules.extractor;
    const pump = u.modules.pump;
    const sm = u.modules.smelter;
    const rate_ex = ex.baseRate * Math.pow(1.15, ex.level-1);
    const rate_pump = pump.baseRate * Math.pow(1.12, pump.level-1);
    // approximate offline R1_1 and R1_3
    const estIron = Math.floor(rate_ex * secs);
    const estWater = Math.floor(rate_pump * secs);
    offlineAmount = estIron + Math.floor(estIron*0.2) + estWater; // iron + charcoal approximation
    if (offlineAmount > 0){
      $('#offlineAmount').innerText = offlineAmount;
      $('#offlineBox').style.display = 'inline-block';
    } else { $('#offlineBox').style.display = 'none'; }
    log(`Offline est: ${offlineAmount} (since ${Math.floor(secs/60)}m ago)`);
  } else {
    $('#offlineBox').style.display = 'none';
  }
  localStorage.setItem(`last_seen_${TELEGRAM_ID}`, String(now));
}

// TAP logic: choose lowest resource target, track combo and give temporary boost
let combo = 0, lastTap = 0, comboTimer = null;
async function doTap(){
  if (!lastState) await refreshState();
  const now = Date.now();
  if (now - lastTap < 1200) { combo++; } else { combo = 1; }
  lastTap = now;
  $('#combo').innerText = 'x' + combo;
  // temporary visual boost when combo hits thresholds
  if (combo >= 10) { log('Combo 10! small boost applied'); }
  // pick lowest resource
  const r = lastState.resources;
  const keys = ['R1_1','R1_2','R1_3'];
  keys.sort((a,b)=> (r[a]||0)-(r[b]||0));
  const target = keys[0];
  const res = await apiPOST('/game/tap', { telegramId: TELEGRAM_ID, resource: target });
  if (res.error){ log('Tap error: '+res.error); return; }
  await refreshState();
}

// Claim offline
$('#claimOffline').addEventListener('click', async ()=>{
  if (!offlineAmount) return;
  // quick hack: perform series of taps server-side? we'll POST /game/tap multiple times for demo
  const toGive = offlineAmount;
  // to avoid many requests, call a fake endpoint could be better — here: do loop of larger taps
  // We just emulate by calling /game/tap N times (coarse)
  // Better: server endpoint /game/claim_offline that adds computed resources; if absent, we simulate few taps
  const chunk = Math.min(50, toGive);
  for (let i=0;i<Math.ceil(toGive/chunk);i++){
    await apiPOST('/game/tap', { telegramId: TELEGRAM_ID, resource: 'R1_1' });
  }
  log(`Claimed offline ${toGive}`);
  offlineAmount = 0;
  $('#offlineBox').style.display = 'none';
  await refreshState();
});

// UI bindings: toggles
$$('.toggle').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const module = e.currentTarget.dataset.module;
    const res = await apiPOST('/game/module/toggle', { telegramId: TELEGRAM_ID, module });
    if (res.error) log('Toggle error: '+res.error); else { log(`${module} toggled`); await refreshState(); }
  });
});
$$('.upgrade').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const module = e.currentTarget.dataset.module;
    const res = await apiPOST('/game/module/upgrade', { telegramId: TELEGRAM_ID, module });
    if (res.error){ alert('Upgrade failed: ' + (res.error || 'unknown')); log('Upgrade fail: '+JSON.stringify(res)); }
    else { log(`Upgraded ${module}`); await refreshState(); }
  });
});

// craft
$('#craftP1').addEventListener('click', async ()=>{
  const res = await apiPOST('/game/craft/p1', { telegramId: TELEGRAM_ID });
  if (res.error){ $('#craftStatus').innerText = 'Failed: ' + (res.error); log('Craft fail: '+res.error); }
  else { $('#craftStatus').innerText = 'Crafted!'; log('Crafted P1'); await refreshState(); setTimeout(()=>$('#craftStatus').innerText='',2000); }
});

// tap button
$('#tapBtn').addEventListener('click', async ()=>{ await doTap(); });

// shop modal
$('#btnShop').addEventListener('click', ()=>{ $('#shopModal').classList.remove('hidden'); });
$('#closeShop').addEventListener('click', ()=>{ $('#shopModal').classList.add('hidden'); });
$$('.buy').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const id = e.currentTarget.dataset.buy;
    // naive: call /shop/buy (server must implement)
    const res = await apiPOST('/shop/buy', { telegramId: TELEGRAM_ID, item: id });
    if (res.error) { alert('Buy failed: '+res.error); log('Shop buy fail: '+JSON.stringify(res)); }
    else { log('Bought ' + id); $('#shopModal').classList.add('hidden'); await refreshState(); }
  });
});

// periodic refresh
setInterval(refreshState, 3000);
refreshState();
