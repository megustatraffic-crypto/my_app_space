// app.js
const BACKEND = "__REPLACE_WITH_BACKEND__"; // e.g. https://my-app-space.onrender.com

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const logBox = $('#logBox');

function log(text){
  if(!logBox) return;
  const el = document.createElement('div');
  el.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  logBox.prepend(el);
  while(logBox.childElementCount>200) logBox.removeChild(logBox.lastChild);
}

// user init
let TELEGRAM_ID = null;
let PLAYER_NAME = "Player";
let lastState = null;
let selectedResource = 'R1_1';
let lastTap = 0;
const TAP_COOLDOWN = 120;

// try Telegram WebApp init
function tryTelegramInit(){
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready && tg.ready();
      const ui = tg.initDataUnsafe || {};
      if (ui && ui.user && ui.user.id) {
        TELEGRAM_ID = String(ui.user.id);
        PLAYER_NAME = ui.user.username || ui.user.first_name || PLAYER_NAME;
        log(`Telegram user ${PLAYER_NAME} (${TELEGRAM_ID})`);
        return true;
      }
    }
  } catch(e){ console.warn(e) }
  return false;
}
function initLocal(){
  let id = localStorage.getItem('demo_id');
  if (!id) { id = String(Math.floor(Math.random()*900000)+100000); localStorage.setItem('demo_id', id); }
  TELEGRAM_ID = id;
  PLAYER_NAME = 'Demo_'+TELEGRAM_ID;
  log('Using demo id ' + TELEGRAM_ID);
}
if (!tryTelegramInit()) initLocal();
$('#playerName').innerText = PLAYER_NAME;
$('#backendUrl').innerText = BACKEND;

// API helpers
async function apiGET(path){
  try {
    const r = await fetch(BACKEND + path);
    return await r.json();
  } catch(e){ log('GET error '+e.message); return { error: e.message }; }
}
async function apiPOST(path, body){
  try {
    const r = await fetch(BACKEND + path, {
      method:'POST',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch(e){ log('POST error '+e.message); return { error: e.message }; }
}

// refresh state
async function refreshState(){
  $('#status').innerText = 'syncing...';
  const res = await apiGET('/game/' + TELEGRAM_ID);
  if (res.error) { log('load err ' + JSON.stringify(res)); $('#status').innerText='error'; return; }
  const u = res.user;
  lastState = u;
  $('#R1_1').innerText = u.resources.R1_1 || 0;
  $('#R1_2').innerText = u.resources.R1_2 || 0;
  $('#R1_3').innerText = u.resources.R1_3 || 0;
  $('#P1').innerText = u.resources.P1 || 0;
  $('#lvl_extractor').innerText = u.modules.extractor.level;
  $('#lvl_smelter').innerText = u.modules.smelter.level;
  $('#lvl_pump').innerText = u.modules.pump.level;
  updateModuleBars(u);
  $('#status').innerText = 'ok';
}

// module bars
function updateModuleBars(u){
  const exRun = u.modules.extractor.running;
  const pumpRun = u.modules.pump.running;
  const smRun = u.modules.smelter.running;
  $('#bar_extractor').style.width = exRun ? '60%' : '4%';
  $('#bar_pump').style.width = pumpRun ? '50%' : '4%';
  $('#bar_smelter').style.width = smRun ? '30%' : '4%';
}

// selector
function setupSelector(){
  $$('.res-select').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      const r = e.currentTarget.dataset.resource;
      selectedResource = r;
      $$('.res-select').forEach(x=>x.classList.remove('active'));
      e.currentTarget.classList.add('active');
      log('Selected: '+selectedResource);
    });
  });
  const initial = $('#sel_R1_1');
  if (initial) initial.classList.add('active');
}

// tap
async function doTap(){
  if (!lastState) await refreshState();
  const now = Date.now();
  if (now - lastTap < TAP_COOLDOWN) return;
  lastTap = now;
  // combo
  const bonus = 1; // can extend with combo logic
  const res = await apiPOST('/game/tap', { telegramId: TELEGRAM_ID, resource: selectedResource, gain: 1 });
  if (res.error) { log('Tap error: '+res.error); return; }
  await refreshState();
  showTapAnim();
}

function showTapAnim(){
  const el = document.createElement('div');
  el.className = 'tap-float';
  el.innerText = '+1';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 700);
}

// binds
$('#tapBtn').addEventListener('click', async ()=> await doTap());

$$('.toggle').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const module = e.currentTarget.dataset.module;
    const res = await apiPOST('/game/module/toggle', { telegramId: TELEGRAM_ID, module });
    if (res.error) log('Toggle err '+res.error); else { log(module+' toggled'); await refreshState(); }
  });
});
$$('.upgrade').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const module = e.currentTarget.dataset.module;
    const res = await apiPOST('/game/module/upgrade', { telegramId: TELEGRAM_ID, module });
    if (res.error){ alert('Upgrade failed: ' + (res.error || 'unknown')); log('upgrade fail '+JSON.stringify(res)); }
    else { log('upgraded '+module); await refreshState(); }
  });
});

$('#craftP1').addEventListener('click', async ()=>{
  const res = await apiPOST('/game/craft/p1', { telegramId: TELEGRAM_ID });
  if (res.error){ $('#craftStatus').innerText = 'Failed: ' + (res.error); log('craft fail '+res.error); }
  else { $('#craftStatus').innerText = 'Crafted!'; log('crafted P1'); await refreshState(); setTimeout(()=>$('#craftStatus').innerText='',2000); }
});

$('#startAll').addEventListener('click', async ()=>{
  const res = await apiPOST('/game_extra/start_all', { telegramId: TELEGRAM_ID });
  if (res.error) log('start all err: '+res.error); else { log('started all'); await refreshState(); }
});

$('#claimOffline').addEventListener('click', async ()=>{
  const res = await apiPOST('/game_extra/claim_offline', { telegramId: TELEGRAM_ID });
  if (res.error) log('claim err: '+JSON.stringify(res));
  else { log('claimed offline: ' + JSON.stringify(res.gained)); await refreshState(); }
});

// shop modal
$('#btnShop').addEventListener('click', ()=> $('#shopModal').classList.remove('hidden'));
$('#closeShop').addEventListener('click', ()=> $('#shopModal').classList.add('hidden'));
$$('.buy').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const item = e.currentTarget.dataset.buy;
    const res = await apiPOST('/shop/buy', { telegramId: TELEGRAM_ID, item });
    if (res.error) { alert('Buy failed: '+res.error); log('shop err '+JSON.stringify(res)); }
    else { log('bought '+item); $('#shopModal').classList.add('hidden'); await refreshState(); }
  });
});

setupSelector();
setInterval(refreshState, 3000);
refreshState();
