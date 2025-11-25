// app.js
const BACKEND = (location.hostname === 'localhost') ? 'http://localhost:3000' : 'https://my-app-space.onrender.com';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function log(t){ const lb = $('#logBox'); if(lb){ const el = document.createElement('div'); el.textContent = `[${new Date().toLocaleTimeString()}] ${t}`; lb.prepend(el); while(lb.childElementCount>200) lb.removeChild(lb.lastChild); } else console.log(t); }

let TELEGRAM_ID = null;
let PLAYER_NAME = 'Player';
let state = null;
let selectedResource = 'R1_1';
let lastTap = 0;
const TAP_COOLDOWN = 120;

const bgCache = {};
async function preloadBg(url){ if(!url) return; if(bgCache[url]) return; const img = new Image(); img.src = url; await new Promise(r=>{ img.onload = ()=>{ bgCache[url]=true; r(); }; img.onerror = ()=>r(); }); }

function initDemo(){
  let id = localStorage.getItem('demo_id');
  if (!id){ id = String(Math.floor(Math.random()*900000)+100000); localStorage.setItem('demo_id', id); }
  TELEGRAM_ID = id; PLAYER_NAME = 'Demo_'+id; log('Demo id '+TELEGRAM_ID);
}
initDemo();
$('#playerName') && ($('#playerName').innerText = PLAYER_NAME);
$('#backendUrl') && ($('#backendUrl').innerText = BACKEND);

async function safeGET(path){
  try {
    const r = await fetch(BACKEND + path);
    const text = await r.text();
    if (!r.ok) { try { return { error: JSON.parse(text) }; } catch(e){ return { error: text || `HTTP ${r.status}` }; } }
    if (!text) return {};
    try { return JSON.parse(text); } catch(e){ return { result: text }; }
  } catch(e){ return { error: 'Failed to fetch' }; }
}
async function safePOST(path, body){
  try {
    const r = await fetch(BACKEND + path, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
    const text = await r.text();
    if (!r.ok) { try { return { error: JSON.parse(text) }; } catch(e){ return { error: text || `HTTP ${r.status}` }; } }
    if (!text) return {};
    try { return JSON.parse(text); } catch(e){ return { result: text }; }
  } catch(e){ return { error: 'Failed to fetch' }; }
}

function spawnPop(text="+1"){
  const el = document.createElement('div');
  el.className = 'pop-float';
  el.innerText = text;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 700);
}

let bgNode = null;
function ensureBgLayer(){
  if (bgNode) return bgNode;
  const node = document.createElement('div');
  node.className = 'bg-layer';
  document.body.insertBefore(node, document.body.firstChild);
  const overlay = document.createElement('div');
  overlay.className = 'bg-overlay';
  document.body.insertBefore(overlay, document.body.firstChild.nextSibling);
  bgNode = node;
  return bgNode;
}
async function swapBackground(url){
  if (!url) return;
  const node = ensureBgLayer();
  await preloadBg(url);
  node.style.transition = 'opacity 360ms ease';
  node.style.opacity = '0';
  setTimeout(()=> {
    node.style.backgroundImage = `url('${url}')`;
    node.style.transform = 'scale(1.02)';
    node.style.opacity = '1';
    setTimeout(()=> node.style.transform = 'scale(1)', 380);
  }, 180);
}

async function refreshState(){
  if (!TELEGRAM_ID) return;
  $('#status') && ($('#status').innerText = 'syncing...');
  const res = await safeGET('/game/' + TELEGRAM_ID);
  if (res.error) { log('load err '+JSON.stringify(res)); $('#status') && ($('#status').innerText='error'); return; }
  const user = res.user || res;
  state = user;
  $('#R1_1') && ($('#R1_1').innerText = user.resources?.R1_1 || 0);
  $('#R1_2') && ($('#R1_2').innerText = user.resources?.R1_2 || 0);
  $('#R1_3') && ($('#R1_3').innerText = user.resources?.R1_3 || 0);
  $('#P1') && ($('#P1').innerText = user.planetCores?.P1 || 0);
  $('#lvl_extractor') && ($('#lvl_extractor').innerText = user.modules?.extractor?.level || 1);
  $('#lvl_smelter') && ($('#lvl_smelter').innerText = user.modules?.smelter?.level || 1);
  $('#lvl_pump') && ($('#lvl_pump').innerText = user.modules?.pump?.level || 1);
  updateModuleBars(user);
  $('#energyVal') && ($('#energyVal').innerText = user.energy || 0);
  $('#energyMax') && ($('#energyMax').innerText = user.energyMax || 0);
  if ((user.energy || 0) <= 0) $('#lowEnergy') && $('#lowEnergy').classList.remove('hidden'); else $('#lowEnergy') && $('#lowEnergy').classList.add('hidden');
  renderUpgrades(user.upgradesInProgress || []);
  $('#status') && ($('#status').innerText='ok');
}

function renderUpgrades(upgrades){
  const container = document.getElementById('logBox');
  if (!container) return;
  // just show 3 latest upgrade lines
  const headerNote = document.createElement('div');
  headerNote.textContent = 'Active Upgrades:';
  // remove old upgrade-only lines (we keep all logs but append upgrades on top)
  upgrades.slice(0,3).forEach(u=>{
    const now = Date.now();
    const rem = Math.max(0, Math.ceil((u.endsAt - now)/1000));
    const el = document.createElement('div');
    el.textContent = `Upgrade ${u.module} -> lvl ${u.toLevel} in ${rem}s`;
    container.prepend(el);
  });
}

function updateModuleBars(u){
  if (!u) return;
  $('#bar_extractor') && ($('#bar_extractor').style.width = u.modules?.extractor?.running ? '60%' : '4%');
  $('#bar_pump') && ($('#bar_pump').style.width = u.modules?.pump?.running ? '50%' : '4%');
  $('#bar_smelter') && ($('#bar_smelter').style.width = u.modules?.smelter?.running ? '30%' : '4%');
}

$$('.res-select').forEach(btn => {
  btn.addEventListener('click', async (e)=>{
    $$('.res-select').forEach(x=>x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    selectedResource = e.currentTarget.dataset.resource;
    const cfg = await safeGET('/planet_config');
    if (!cfg.error) {
      const p1 = cfg.planets.find(p => p.id === 'P1');
      if (p1) {
        const resObj = p1.resources.find(r => r.id === selectedResource);
        if (resObj && resObj.mine_bg) swapBackground(resObj.mine_bg);
      }
    }
    log('Selected: ' + selectedResource);
  });
});
$('#sel_R1_1') && $('#sel_R1_1').classList.add('active');

async function tapAction(){
  if (!state) await refreshState();
  const nowTs = Date.now();
  if (nowTs - lastTap < TAP_COOLDOWN) return;
  lastTap = nowTs;
  if ((state.energy || 0) <= 0) { log('no energy'); $('#lowEnergy') && $('#lowEnergy').classList.remove('hidden'); return; }
  spawnPop('+1');
  const res = await safePOST('/game/tap', { telegramId: TELEGRAM_ID, resource: selectedResource, gain: 1 });
  if (res.error) { log('Tap error: '+JSON.stringify(res.error)); return; }
  if (res.resources) {
    $('#R1_1') && ($('#R1_1').innerText = res.resources.R1_1 ?? state.resources.R1_1);
    $('#R1_2') && ($('#R1_2').innerText = res.resources.R1_2 ?? state.resources.R1_2);
    $('#R1_3') && ($('#R1_3').innerText = res.resources.R1_3 ?? state.resources.R1_3);
    if (res.energy !== undefined) $('#energyVal') && ($('#energyVal').innerText = res.energy);
    setTimeout(()=>refreshState(), 700);
  } else await refreshState();
}

$$('.toggle').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const module = e.currentTarget.dataset.module;
    const res = await safePOST('/game/module/toggle', { telegramId: TELEGRAM_ID, module });
    if (res.error) log('Toggle err: '+JSON.stringify(res.error)); else { log('toggled '+module); await refreshState(); }
  });
});

$$('.upgrade').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const module = e.currentTarget.dataset.module;
    const res = await safePOST('/game/module/upgrade', { telegramId: TELEGRAM_ID, module });
    if (res.error) { alert('Upgrade start failed: ' + JSON.stringify(res.error)); log('upgrade fail '+JSON.stringify(res.error)); }
    else { log('Upgrade started '+module); await refreshState(); }
  });
});

$('#craftP1') && $('#craftP1').addEventListener('click', async ()=>{
  const res = await safePOST('/game/craft/p1', { telegramId: TELEGRAM_ID });
  if (res.error) { $('#craftStatus').innerText = 'Failed: ' + (typeof res.error === 'string' ? res.error : JSON.stringify(res.error)); log('craft fail ' + JSON.stringify(res.error)); }
  else { $('#craftStatus').innerText = 'Crafted!'; log('crafted P1'); await refreshState(); setTimeout(()=>$('#craftStatus').innerText='',2000); }
});

$('#startAll') && $('#startAll').addEventListener('click', async ()=>{
  const res = await safePOST('/game_extra/start_all', { telegramId: TELEGRAM_ID });
  if (res.error) log('start all err: '+JSON.stringify(res.error)); else { log('started all'); await refreshState(); }
});

$('#claimOffline') && $('#claimOffline').addEventListener('click', async ()=>{
  const res = await safePOST('/game_extra/claim_offline', { telegramId: TELEGRAM_ID });
  if (res.error) log('claim err: '+JSON.stringify(res.error)); else { log('claimed offline'); await refreshState(); }
});

$('#buyEnergySmall') && $('#buyEnergySmall').addEventListener('click', async ()=>{
  const r = await safePOST('/shop/buy', { telegramId: TELEGRAM_ID, item: 'energy_25' });
  if (r.error) log('buy energy err '+JSON.stringify(r));
  else { log('bought energy'); await refreshState(); }
});
$('#buyEnergyLarge') && $('#buyEnergyLarge').addEventListener('click', async ()=>{
  const r = await safePOST('/shop/buy', { telegramId: TELEGRAM_ID, item: 'energy_100' });
  if (r.error) log('buy energy err '+JSON.stringify(r));
  else { log('bought energy'); await refreshState(); }
});

$$('.buy').forEach(b=>{
  b.addEventListener('click', async (e)=>{
    const item = e.currentTarget.dataset.buy;
    const res = await safePOST('/shop/buy', { telegramId: TELEGRAM_ID, item });
    if (res.error) { alert('Buy failed: '+JSON.stringify(res.error)); log('shop err '+JSON.stringify(res.error)); }
    else { log('Bought ' + item); $('#shopModal') && $('#shopModal').classList.add('hidden'); await refreshState(); }
  });
});

$('#tapBtn') && $('#tapBtn').addEventListener('click', async ()=> await tapAction());
$('#btnShop') && $('#btnShop').addEventListener('click', ()=> $('#shopModal').classList.remove('hidden'));
$('#closeShop') && $('#closeShop').addEventListener('click', ()=> $('#shopModal').classList.add('hidden'));

document.addEventListener('DOMContentLoaded', async ()=>{
  const cfg = await safeGET('/planet_config');
  if (!cfg.error) {
    const p1 = cfg.planets.find(p=>p.id==='P1');
    if (p1) {
      const firstBg = p1.resources[0].mine_bg;
      swapBackground(firstBg);
    }
  }
  setInterval(refreshState, 3000);
  refreshState();
});
