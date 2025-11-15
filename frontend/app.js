// app.js - Cosmic Farm frontend (uses assets in frontend/*)
// NOTE: paths assume your structure exactly as uploaded (jpg files)

const STORAGE_KEY = 'cosmic_farm_state_v3';
const BASE_GROW_MS = 8000; // baseline normal
const MAX_FARM_SIZE = 7;
const DRONE_INTERVAL_MS = 2200;
const DRONE_SPEED = 0.5; // px/ms

// assets getters (jpg)
const ASSETS = {
  bg: 'backgrounds/bg_alien_ground.jpg',
  house: (lvl) => {
    if(lvl >= 10) return 'houses/house_lvl10.jpg';
    if(lvl >= 6) return 'houses/house_lvl6.jpg';
    if(lvl >= 3) return 'houses/house_lvl3.jpg';
    return 'houses/house_lvl1.jpg';
  },
  droneImg: (i) => `drones/drone_mk${Math.min(5, Math.max(1, i))}.jpg`,
  plantImg: (seed,stage) => `plants/plant_${seed}_stage${stage}.jpg`,
  vfxBurst: 'vfx/vfx_energy_burst.jpg',
  vfxFlash: 'vfx/vfx_flash_small.jpg',
  starIcon: 'currency/currency_star.jpg',
  coinIcon: 'currency/crystal_coin.jpg'
};

// seeds definitions (economy)
const SEEDS = {
  basic: {id:'basic',label:'Basic', price:0.5, timeMul:1, yield:1},
  fast:  {id:'fast', label:'Fast',  price:5,   timeMul:0.6, yield:1.2},
  premium:{id:'premium',label:'Premium',price:15,timeMul:1.4,yield:2.5},
  cosmic:{id:'cosmic',label:'Cosmic',price:50,timeMul:2.2,yield:6},
  alien: {id:'alien', label:'Alien', price:100,timeMul:3.0,yield:12}
};

function now(){return Date.now();}

function defaultState(){
  return {
    playerName: 'Guest',
    avatar: '',
    frags: 0,
    stars: 0,
    level: 1,
    farmSize: 3,
    farm: Array(9).fill().map(()=>({status:'empty', seed:'basic', plantedAt:0})),
    drones: 0,
    dronePrices: [15,30,60,120,240,480,960,1920,3840,7680], // doubling
    quests: {harvested:0, droneBought:0, lastQuestDay:0},
    selectedSeed: 'basic',
    harvestedThisSeason: 0,
    seasonStart: now()
  };
}

let state = (function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){console.warn(e)}
  const s = defaultState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
})();

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// DOM refs
const farmEl = document.getElementById('farm');
const houseEl = document.getElementById('house');
const statsEl = document.getElementById('playerStats');
const nameEl = document.getElementById('playerName');
const starsCountEl = document.getElementById('starsCount');
const vfxLayer = document.getElementById('vfxLayer');
const droneCanvas = document.getElementById('droneCanvas');
const ctx = droneCanvas.getContext ? droneCanvas.getContext('2d') : null;
let canvasEnabled = !!ctx;

function ensureFarmLength(){
  while(state.farm.length < state.farmSize*state.farmSize) state.farm.push({status:'empty',seed:'basic',plantedAt:0});
  while(state.farm.length > state.farmSize*state.farmSize) state.farm.pop();
}

function growthMs(seed){
  const s = SEEDS[seed] || SEEDS.basic;
  const levelMul = Math.max(0.7, 1 - (state.level-1)*0.03);
  return Math.max(1000, Math.floor(BASE_GROW_MS * s.timeMul * levelMul));
}

function xpNeeded(lvl){ return Math.floor(10 * Math.pow(lvl, 1.6)); }

function render(){
  // house
  houseEl.style.backgroundImage = `url(${ASSETS.house(state.level)})`;

  // stats
  nameEl.innerText = state.playerName || 'Guest';
  statsEl.innerText = `Frags: ${Math.floor(state.frags)} · Lvl ${state.level} · Drones ${state.drones}`;
  starsCountEl.innerText = state.stars;

  // farm grid
  ensureFarmLength();
  farmEl.style.gridTemplateColumns = `repeat(${state.farmSize}, 1fr)`;
  farmEl.innerHTML = '';
  state.farm.forEach((tile,i)=>{
    const el = document.createElement('div');
    el.className = 'tile';
    if(tile.status === 'empty'){
      el.innerHTML = `<div class="empty-dot"></div>`;
    } else if(tile.status === 'growing'){
      el.classList.add('planted');
      const elapsed = now() - tile.plantedAt;
      const total = growthMs(tile.seed);
      const left = Math.max(0, Math.ceil((total - elapsed)/1000));
      el.innerHTML = `<img class="plantImg" src="${ASSETS.plantImg(tile.seed,1)}" alt="plant"/><div class="timer">${left}s</div>`;
      if(elapsed >= total) tile.status = 'grown';
    } else if(tile.status === 'grown'){
      el.innerHTML = `<img class="plantImg" src="${ASSETS.plantImg(tile.seed,2)}" alt="grown"/>`;
    }
    el.addEventListener('click', ()=>onTileClick(i));
    farmEl.appendChild(el);
  });

  resizeCanvas();
  save();
}

function onTileClick(i){
  const tile = state.farm[i];
  if(tile.status === 'empty'){
    // plant selected seed
    tile.status = 'growing';
    tile.seed = state.selectedSeed || 'basic';
    tile.plantedAt = now();
    save(); render();
  } else if(tile.status === 'grown'){
    // harvest
    const seed = SEEDS[tile.seed] || SEEDS.basic;
    state.frags += seed.yield;
    state.quests.harvested = (state.quests.harvested||0) + seed.yield;
    state.harvestedThisSeason = (state.harvestedThisSeason||0) + seed.yield;
    tile.status = 'empty'; tile.plantedAt = 0;
    popVfxAtTile(i, ASSETS.vfxBurst);
    checkLevel();
    save(); render();
  }
}

// level up & expand
function checkLevel(){
  const need = xpNeeded(state.level);
  if(state.frags >= need){
    state.frags -= need;
    state.level++;
    if(state.level === 2) state.farmSize = 3;
    // expand every 2 levels or at thresholds:
    if(state.level === 4 && state.farmSize < 4) state.farmSize = 4;
    if(state.level === 6 && state.farmSize < 5) state.farmSize = 5;
    if(state.level === 9 && state.farmSize < 6) state.farmSize = 6;
    if(state.level === 12 && state.farmSize < 7) state.farmSize = 7;
    // refill farm to new size
    ensureFarmLength();
  }
}

// VFX helper
function popVfxAtTile(index, imgPath){
  const tileNodes = Array.from(document.querySelectorAll('.tile'));
  const target = tileNodes[index];
  if(!target) return;
  const rect = target.getBoundingClientRect();
  const parentRect = document.getElementById('farmWrap').getBoundingClientRect();
  const img = document.createElement('img');
  img.src = imgPath;
  img.className = 'vfx';
  img.style.position = 'absolute';
  img.style.left = (rect.left - parentRect.left + rect.width/4) + 'px';
  img.style.top = (rect.top - parentRect.top + rect.height/6) + 'px';
  img.style.width = (rect.width*0.9)+'px';
  img.style.opacity = '0.95';
  img.style.pointerEvents = 'none';
  vfxLayer.appendChild(img);
  setTimeout(()=>{ img.style.transition = 'opacity .6s transform .6s'; img.style.opacity = 0; img.style.transform = 'scale(1.25)'; },50);
  setTimeout(()=>img.remove(),900);
}

// panels
function openPanel(id){
  closePanels();
  const el = document.getElementById(id);
  if(el) el.hidden = false;
  if(id === 'panelDrones') renderDronePanel();
  if(id === 'panelQuests') renderQuests();
}
function closePanels(){
  Array.from(document.querySelectorAll('.panel')).forEach(p=>p.hidden = true);
}
function openFarm(){ closePanels(); }

// shop actions
document.getElementById('buy-drone').addEventListener('click', ()=>{
  const count = state.drones;
  if(count >= 10){ alert('Max 10 freeable drones'); return; }
  const price = state.dronePrices[count] || (15 * Math.pow(2,count));
  if(state.frags < price){ alert('Not enough FRAG'); return; }
  state.frags -= price;
  state.drones++;
  state.quests.droneBought = (state.quests.droneBought||0)+1;
  save(); render();
  alert('Drone purchased!');
});
document.getElementById('buy-farm').addEventListener('click', ()=>{
  if(state.farmSize >= MAX_FARM_SIZE){ alert('Max farm size'); return; }
  if(state.frags < 50){ alert('Expand costs 50 FRAG'); return; }
  state.frags -= 50;
  state.farmSize++;
  ensureFarmLength(); save(); render();
});
document.getElementById('add-stars').addEventListener('click', ()=>{
  state.stars += 5; save(); render(); alert('+5 Stars (test)');
});
document.getElementById('saveName').addEventListener('click', ()=>{
  const val = document.getElementById('nameInput').value.trim();
  if(val) state.playerName = val;
  save(); render(); closePanels(); alert('Name saved');
});
document.getElementById('saveAvatar').addEventListener('click', ()=>{
  const val = document.getElementById('avatarUrl').value.trim();
  if(val) state.avatar = val;
  save(); render(); closePanels(); alert('Avatar saved');
});

// drone system
let dronesSim = [];
function ensureDrones(){
  while(dronesSim.length < state.drones) {
    dronesSim.push({x:20 + dronesSim.length*30, y:20, target:null, status:'idle'});
  }
  while(dronesSim.length > state.drones) dronesSim.pop();
}
ensureDrones();

function findGrownTile(){ for(let i=0;i<state.farm.length;i++) if(state.farm[i].status==='grown') return i; return null; }

function droneTick(){
  ensureDrones();
  dronesSim.forEach(d=>{
    if(d.status === 'idle'){
      const idx = findGrownTile();
      if(idx !== null){
        d.target = idx; d.status = 'to';
      }
    }
  });
}
setInterval(droneTick, DRONE_INTERVAL_MS);

// canvas animation
let last = performance.now();
function resizeCanvas(){
  const rect = document.getElementById('farmWrap').getBoundingClientRect();
  droneCanvas.width = rect.width; droneCanvas.height = rect.height;
  droneCanvas.style.left = '0px'; droneCanvas.style.top = '0px';
}
function animate(now){
  const dt = now - last; last = now;
  if(ctx){
    ctx.clearRect(0,0,droneCanvas.width, droneCanvas.height);
    ensureDrones();
    const cols = state.farmSize;
    const rect = farmEl.getBoundingClientRect();
    const farmRect = document.getElementById('farmWrap').getBoundingClientRect();
    const cellW = farmRect.width / cols;
    const rows = Math.ceil(state.farm.length/cols);
    const cellH = (farmRect.width / cols) * (1); // square approx
    dronesSim.forEach((d, id)=>{
      if(!d.x) d.x = 20 + id*30; if(!d.y) d.y = 20;
      if(d.status === 'to' && d.target !== null){
        const r = Math.floor(d.target / cols);
        const c = d.target % cols;
        const targetX = c*cellW + cellW/2;
        const targetY = r*cellW + cellW/2 + 30; // adjust for house offset
        const dx = targetX - d.x; const dy = targetY - d.y;
        const dist = Math.hypot(dx,dy);
        const step = DRONE_SPEED * dt * 1.2;
        if(dist <= step){
          d.x = targetX; d.y = targetY;
          // harvest if grown
          if(state.farm[d.target] && state.farm[d.target].status === 'grown'){
            const seed = SEEDS[state.farm[d.target].seed]||SEEDS.basic;
            state.frags += seed.yield;
            state.quests.harvested = (state.quests.harvested||0) + seed.yield;
            state.harvestedThisSeason = (state.harvestedThisSeason||0) + seed.yield;
            state.farm[d.target].status = 'empty'; state.farm[d.target].plantedAt = 0;
            popVfxAtTile(d.target, ASSETS.vfxFlash);
            checkLevel(); save(); render();
          }
          d.status = 'return';
        } else {
          d.x += dx/dist * step; d.y += dy/dist * step;
        }
      } else if(d.status === 'return'){
        const homeX = 20 + id*30, homeY = 20;
        const dx = homeX - d.x, dy = homeY - d.y; const dist = Math.hypot(dx,dy);
        const step = DRONE_SPEED * dt * 1.2;
        if(dist <= step){ d.x = homeX; d.y = homeY; d.status = 'idle'; d.target = null; }
        else { d.x += dx/dist * step; d.y += dy/dist * step; }
      }
      // draw drone image
      const img = new Image();
      img.src = ASSETS.droneImg(id+1);
      const w = 36, h = 36;
      ctx.drawImage(img, d.x - w/2, d.y - h/2, w, h);
    });
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// auto grow check
setInterval(()=>{
  let ch=false;
  for(const tile of state.farm){
    if(tile.status==='growing'){
      if(now() - tile.plantedAt >= growthMs(tile.seed)){
        tile.status='grown'; ch=true;
      }
    }
  }
  if(ch) render();
}, 800);

// quests
function renderQuests(){
  const el = document.getElementById('questsList');
  el.innerHTML = '';
  const q1 = document.createElement('div');
  q1.className='card';
  q1.innerHTML = `<b>Harvest 5</b><p>Progress ${Math.floor(state.quests.harvested||0)}/5</p>${(state.quests.harvested||0)>=5 ? '<button onclick="claimHarvest()">Claim">Claim</button>' : ''}`;
  el.appendChild(q1);
  const q2 = document.createElement('div');
  q2.className='card';
  q2.innerHTML = `<b>Buy 1 Drone</b><p>${(state.quests.droneBought||0)}/1</p>${(state.quests.droneBought||0)>=1 ? '<button onclick="claimDrone()">Claim">Claim</button>' : ''}`;
  el.appendChild(q2);
}
window.openPanel = openPanel;
window.closePanels = closePanels;
window.openFarm = openFarm;
window.claimHarvest = function(){
  if((state.quests.harvested||0) < 5) return alert('Not ready');
  state.quests.harvested -= 5; state.frags += 5; save(); render(); alert('Claimed 5 FRAG');
};
window.claimDrone = function(){
  if((state.quests.droneBought||0) < 1) return alert('Not ready');
  state.quests.droneBought -= 1; state.frags += 10; save(); render(); alert('Claimed 10 FRAG');
};

// drone panel
function renderDronePanel(){
  const el = document.getElementById('droneList'); el.innerHTML='';
  const p = document.createElement('div'); p.className='card';
  p.innerHTML = `<b>Your drones</b><p>Count: ${state.drones}</p>`;
  el.appendChild(p);
}

// initial UI wiring for seed selection (small)
function buildSeedSelector(){
  const container = document.createElement('div'); container.className='card';
  container.innerHTML = `<b>Seeds</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;"></div>`;
  const inner = container.querySelector('div');
  for(const s of Object.values(SEEDS)){
    const btn = document.createElement('button');
    btn.className='buyBtn';
    btn.style.width='48%';
    btn.style.padding='8px';
    btn.innerText = `${s.label} — ${s.price} FRAG`;
    btn.addEventListener('click', ()=>{
      if(s.price && state.frags < s.price) return alert('Not enough FRAG');
      if(s.price) state.frags -= s.price;
      state.selectedSeed = s.id; save(); render(); alert(`Selected ${s.label}`);
    });
    inner.appendChild(btn);
  }
  const shopPanel = document.getElementById('panelShop');
  shopPanel.insertBefore(container, shopPanel.querySelector('.close'));
}

buildSeedSelector();
render();
resizeCanvas();
window.addEventListener('resize', ()=>{ resizeCanvas(); render(); });

// initial ensure drones
ensureDrones();
