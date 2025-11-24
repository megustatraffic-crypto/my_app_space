// app.js - frontend main
const BACKEND = "https://my-app-space.onrender.com";

const $ = s=>document.querySelector(s);
const $$ = s=>document.querySelectorAll(s);
const logBox = $('#logBox');

function log(t){
  if(!logBox) console.log(t);
  else {
    const el = document.createElement('div'); el.textContent = `[${new Date().toLocaleTimeString()}] ${t}`;
    logBox.prepend(el);
    while(logBox.childElementCount>200) logBox.removeChild(logBox.lastChild);
  }
}

// state
let TELEGRAM_ID = null;
let PLAYER_NAME = "Player";
let lastState = null;
let selectedResource = 'R1_1';
let lastTap = 0;
const TAP_COOLDOWN = 120; // ms

// init demo id or telegram
function tryTelegram(){
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready && tg.ready();
      const ui = tg.initDataUnsafe || {};
      if (ui && ui.user && ui.user.id) {
        TELEGRAM_ID = String(ui.user.id);
        PLAYER_NAME = ui.user.username || ui.user.first_name || PLAYER_NAME;
        log(`Telegram ${PLAYER_NAME} (${TELEGRAM_ID})`);
        return true;
      }
    }
  } catch(e){ console.warn(e); }
  return false;
}
function initDemo(){
  let id = localStorage.getItem('demo_id');
  if (!id){ id = String(Math.floor(Math.random()*900000)+100000); localStorage.setItem('demo_id', id); }
  TELEGRAM_ID = id; PLAYER_NAME = 'Demo_'+id; log('Using demo id '+TELEGRAM_ID);
}
if(!tryTelegram()) initDemo();
if($('#playerName')) $('#playerName').innerText = PLAYER_NAME;
if($('#backendUrl')) $('#backendUrl').innerText = BACKEND;

// robust fetch
async function safeGET(path){
  try {
    const r = await fetch(BACKEND + path);
    const text = await r.text();
    if (!r.ok) {
      log(`GET ${path} -> ${r.status}`);
      try { return { error: JSON.parse(text) }; } catch(e){ return { error: text || `HTTP ${r.status}` }; }
    }
    if (!text) return {};
    try { return JSON.parse(text); } catch(e){ return { result: text }; }
  } catch(e){ return { error: 'Failed to fetch' }; }
}
async function safePOST(path, body){
  try {
    const r = await fetch(BACKEND + path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const text = await r.text();
    if (!r.ok) {
      log(`POST ${path} -> ${r.status}`);
      try { return { error: JSON.parse(text) }; } catch(e){ return { error: text || `HTTP ${r.status}` }; }
    }
    if (!text) return {};
    try { return JSON.parse(text); } catch(e){ return { result: text }; }
  } catch(e){ return { error: 'Failed to fetch' }; }
}

// UI update
async function refreshState(){
  if (!TELEGRAM_ID) return;
  $('#status') && ($('#status').innerText = 'syncing...');
  const res = await safeGET('/game/' + TELEGRAM_ID);
  if (res.error) { log('load err '+JSON.stringify(res)); $('#status') && ($('#status').innerText='error'); return; }
  const u = res.user || res;
  lastState = u;
  // resources
  $('#R1_1') && ($('#R1_1').innerText = u.resources?.R1_1 ?? 0);
  $('#R1_2') && ($('#R1_2').innerText = u.resources?.R1_2 ?? 0);
  $('#R1_3') && ($('#R1_3').innerText = u.resources?.R1_3 ?? 0);
  $('#P1') && ($('#P1').innerText = u.resources?.P1 ?? 0);
  // modules
  $('#lvl_extractor') && ($('#lvl_extractor').innerText = u.modules?.extractor?.level ?? 1);
  $('#lvl_smelter') && ($('#lvl_smelter').innerText = u.modules?.smelter?.level ?? 1);
  $('#lvl_pump') && ($('#lvl_pump').innerText = u.modules?.pump?.level ?? 1);
  updateModuleBars(u);
  // energy
  const energy = u.energy || 0;
  const energyMax = u.energyMax || 0;
  $('#energyVal') && ($('#energyVal').innerText = energy);
  $('#energyMax') && ($('#energyMax').innerText = energyMax);
  // low energy prompt
  if (energy <= 0) $('#lowEnergy').classList.remove('hidden'); else $('#lowEnergy').classList.add('hidden');
  $('#status') && ($('#status').innerText='ok');
}

// module bars
function updateModuleBars(u){
  if (!u || !u.modules) return;
  $('#bar_extractor') && ($('#bar_extractor').style.width = u.modules.extractor.running ? '60%' : '4%');
  $('#bar_pump') && ($('#bar_pump').style.width = u.modules.pump.running ? '50%' : '4%');
  $('#bar_smelter') && ($('#bar_smelter').style.width = u.modules.smelter.running ? '30%' : '4%');
}

// selector setup
$$('.res-select').forEach(btn=>{
  btn.addEventListener('click', e=>{
    $$('.res-select').forEach(x=>x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    selectedResource = e.currentTarget.dataset.resource;
    log('Selected: ' + selectedResource);
  });
});
$('#sel_R1_1') && $('#sel_R1_1').classList.add('active');

// tap
async function tapAction(){
  if (!lastState){ await refreshState(); if (!lastState) { log('no state'); return; } }
  const now = Date.now();
  if (now - lastTap < TAP_COOLDOWN) return;
  lastTap = now;

  // check energy
  if ((lastState.energy || 0) <= 0) {
    log('Not enough energy');
    $('#lowEnergy').classList.remove('hidden');
    return;
  }

  // local visual feedback
  showTapAnim();

  const payload = { telegramId: TELEGRAM_ID, resource: selectedResource, gain: 1 };
  const res = await safePOST('/game/tap', payload);
  if (res.error) { log('Tap error: '+JSON.stringify(res.error)); return; }
  // apply quick update if server returned resources
  if (res.resources) {
    $('#R1_1') && ($('#R1_1').innerText = res.resources.R1_1 ?? lastState.resources.R1_1);
    $('#R1_2') && ($('#R1_2').innerText = res.resources.R1_2 ?? lastState.resources.R1_2);
    $('#R1_3') && ($('#R1_3').innerText = res.resources.R1_3 ?? lastState.resources.R1_3);
    // update energy if returned
    if (res.energy !== undefined) {
      $('#energyVal') && ($('#energyVal').innerText = res.energy);
    }
    // refresh full state a bit later
    setTimeout(()=>refreshState(), 800);
  } else {
    await refreshState();
  }
}

function showTapAnim(){
  const el = document.createElement('div'); el.className='tap-float'; el.innerText = '+1';
  document.body.appendChild(el); setTimeout(()=>el.remove(),700);
}

// safe binds
function safeBind(){
  const tapBtn = $('#tapBtn') || document.querySelector('.big-tap');
  if (!tapBtn) return log('Tap button missing');
  tapBtn.addEventListener('click', async ()=> await tapAction());

  $$('.toggle').forEach(b=>{
    b.addEventListener('click', async e=>{
      const module = e.currentTarget.dataset.module;
      const res = await safePOST('/game/module/toggle', { telegramId: TELEGRAM_ID, module });
      if (res.error) log('Toggle err: '+JSON.stringify(res.error)); else { log('toggled '+module); await refreshState(); }
    });
  });

  $$('.upgrade').forEach(b=>{
    b.addEventListener('click', async e=>{
      const module = e.currentTarget.dataset.module;
      const res = await safePOST('/game/module/upgrade', { telegramId: TELEGRAM_ID, module });
      if (res.error) { alert('Upgrade failed: '+JSON.stringify(res.error)); log('upgrade fail '+JSON.stringify(res.error)); }
      else { log('upgraded '+module); await refreshState(); }
    });
  });

  $('#craftP1') && $('#craftP1').addEventListener('click', async ()=>{
    const res = await safePOST('/game/craft/p1', { telegramId: TELEGRAM_ID });
    if (res.error) { $('#craftStatus').innerText = 'Failed: ' + (typeof res.error==='string'?res.error:JSON.stringify(res.error)); log('craft fail '+JSON.stringify(res.error)); }
    else { $('#craftStatus').innerText='Crafted!'; log('crafted P1'); await refreshState(); setTimeout(()=>$('#craftStatus').innerText='',2000); }
  });

  $('#startAll') && $('#startAll').addEventListener('click', async ()=>{
    const res = await safePOST('/game_extra/start_all', { telegramId: TELEGRAM_ID });
    if (res.error) log('start all err: '+JSON.stringify(res.error)); else { log('started all'); await refreshState(); }
  });

  $('#overdriveShort') && $('#overdriveShort').addEventListener('click', async ()=>{
    const res = await safePOST('/shop/buy', { telegramId: TELEGRAM_ID, item: 'overdrive_10' });
    if (res.error) log('buy overdrive err: '+JSON.stringify(res.error)); else { log('bought overdrive'); await refreshState(); }
  });

  $('#buyEnergySmall') && $('#buyEnergySmall').addEventListener('click', async ()=>{
    const res = await safePOST('/shop/buy', { telegramId: TELEGRAM_ID, item: 'energy_50' });
    if (res.error) log('buy energy err: '+JSON.stringify(res.error)); else { log('bought energy 50'); await refreshState(); }
  });
  $('#buyEnergyLarge') && $('#buyEnergyLarge').addEventListener('click', async ()=>{
    const res = await safePOST('/shop/buy', { telegramId: TELEGRAM_ID, item: 'energy_200' });
    if (res.error) log('buy energy err: '+JSON.stringify(res.error)); else { log('bought energy 200'); await refreshState(); }
  });

  $('#btnShop') && $('#btnShop').addEventListener('click', ()=> $('#shopModal').classList.remove('hidden'));
  $('#closeShop') && $('#closeShop').addEventListener('click', ()=> $('#shopModal').classList.add('hidden'));
  $$('.buy').forEach(b=>{
    b.addEventListener('click', async e=>{
      const item = e.currentTarget.dataset.buy;
      const res = await safePOST('/shop/buy', { telegramId: TELEGRAM_ID, item });
      if (res.error) { alert('Buy failed: '+JSON.stringify(res.error)); log('shop err '+JSON.stringify(res.error)); }
      else { log('bought '+item); $('#shopModal').classList.add('hidden'); await refreshState(); }
    });
  });
}

// init
safeBind();
setInterval(refreshState, 3000);
refreshState();
