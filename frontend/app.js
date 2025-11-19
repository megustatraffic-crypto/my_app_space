// app.js
// CONFIG
const BACKEND = "https://my-app-space.onrender.com"; // <-- твой бекенд
const ASSET_BASE = "assets"; // где лежат ассеты (путь относительно index.html)

// helpers
const $ = (sel)=> document.querySelector(sel);
const log = (text)=>{
  const b = $('#logBox');
  const line = document.createElement('div');
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  b.prepend(line);
  while(b.childElementCount>200) b.removeChild(b.lastChild);
};

// init user id: try Telegram WebApp, else localStorage
let TELEGRAM_ID = null;
let PLAYER_NAME = "Player";

function initFromTelegram() {
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (!tg) return false;
    tg.ready();
    const ui = tg.initDataUnsafe || {};
    if (ui.user && ui.user.id) {
      TELEGRAM_ID = String(ui.user.id);
      PLAYER_NAME = ui.user.username || ui.user.first_name || PLAYER_NAME;
      log("Init from Telegram user: " + PLAYER_NAME + " ("+TELEGRAM_ID+")");
      return true;
    }
  } catch(e){ console.warn(e); }
  return false;
}

function initFromLocal() {
  let id = localStorage.getItem('tg_demo_id');
  if (!id) {
    id = String(Math.floor(Math.random()*900000)+100000);
    localStorage.setItem('tg_demo_id', id);
    log("Created local demo id: " + id);
  } else log("Using local id: " + id);
  TELEGRAM_ID = id;
  PLAYER_NAME = "Demo_"+TELEGRAM_ID;
}

// call init
if (!initFromTelegram()) initFromLocal();
$('#playerName').innerText = PLAYER_NAME;
$('#backendUrl').innerText = BACKEND;

// API helpers
async function apiGET(path){ 
  try {
    const res = await fetch(BACKEND + path);
    return await res.json();
  } catch(e){ log("Network error: "+e.message); return { error: 'network' }; }
}
async function apiPOST(path, body){
  try {
    const res = await fetch(BACKEND + path, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch(e){ log("Network error: "+e.message); return { error: 'network' }; }
}

// refresh UI
let lastState = null;
async function refreshState(){
  $('#status').innerText = 'syncing...';
  const res = await apiGET(`/game/${TELEGRAM_ID}`);
  if (res.error) {
    log("Error loading state: " + JSON.stringify(res));
    $('#status').innerText = 'error';
    return;
  }
  const u = res.user;
  lastState = u;
  // resources
  $('#R1_1').innerText = u.resources.R1_1 || 0;
  $('#R1_2').innerText = u.resources.R1_2 || 0;
  $('#R1_3').innerText = u.resources.R1_3 || 0;
  $('#P1').innerText = u.resources.P1 || 0;
  // modules levels
  $('#lvl_extractor').innerText = u.modules.extractor.level;
  $('#lvl_smelter').innerText = u.modules.smelter.level;
  $('#lvl_pump').innerText = u.modules.pump.level;
  $('#status').innerText = 'ok';
}

// tap handler
$('#tapBtn').addEventListener('click', async ()=>{
  // default: tap on the resource currently lowest -> help the bottleneck
  // choose lowest resource among R1_1..R1_3
  if (!lastState) { await refreshState(); }
  const r = lastState.resources;
  const keys = ['R1_1','R1_2','R1_3'];
  keys.sort((a,b)=> (r[a]||0)-(r[b]||0));
  const target = keys[0];
  const res = await apiPOST('/game/tap', { telegramId: TELEGRAM_ID, resource: target });
  if (res.error) { log("Tap error: " + res.error); } else {
    log(`Tapped ${target}`);
    await refreshState();
  }
});

// module toggles
document.querySelectorAll('.toggle').forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    const module = e.currentTarget.dataset.module;
    const res = await apiPOST('/game/module/toggle', { telegramId: TELEGRAM_ID, module });
    if (res.error) { log("Toggle err: "+res.error) } else {
      log(`${module} toggled`);
      await refreshState();
    }
  });
});

// upgrades
document.querySelectorAll('.upgrade').forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    const module = e.currentTarget.dataset.module;
    const res = await apiPOST('/game/module/upgrade', { telegramId: TELEGRAM_ID, module });
    if (res.error) {
      log("Upgrade failed: " + (res.error || JSON.stringify(res)));
      if (res.need) log("Need: " + res.need + " C1");
      alert("Upgrade failed: " + (res.error || "unknown"));
    } else {
      log(`Upgraded ${module} to lvl ${res.module.level}`);
      await refreshState();
    }
  });
});

// craft P1
$('#craftP1').addEventListener('click', async ()=>{
  const res = await apiPOST('/game/craft/p1', { telegramId: TELEGRAM_ID });
  if (res.error) {
    log("Craft failed: " + (res.error || JSON.stringify(res)));
    alert("Craft failed: " + (res.error || "not enough resources"));
  } else {
    log("Crafted P1");
    await refreshState();
  }
});

// periodic refresh
setInterval(refreshState, 3000);
refreshState();
