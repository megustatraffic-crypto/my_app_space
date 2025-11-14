// app.js - Cosmic Farm frontend (ready to drop into /frontend/)
// Uses assets names as in repo (jpg suffixes included).
// Save state in localStorage. Splash screen + adaptive farm + simple shop/quests/drones

const STORAGE_KEY = "cosmic_farm_state_v3";
const BASE_GROW_MS = 7000; // baseline (adjustable)
const MAX_FARM_SIZE = 7;

// helper seed defs (economy tuned for slower progression)
const SEEDS = {
  basic:   { id:"basic", label:"Basic", price: 0.5, timeMul:1.0, yield: 1 },
  fast:    { id:"fast",  label:"Fast",  price: 5,   timeMul:0.6, yield: 1 },
  premium: { id:"premium",label:"Premium",price:15, timeMul:1.4, yield: 3 },
  cosmic:  { id:"cosmic", label:"Cosmic", price:50, timeMul:2.5, yield: 10 },
  alien:   { id:"alien", label:"Alien",  price:100,timeMul:3.0, yield: 25 }
};

// load state
function now(){ return Date.now(); }
function defaultState(){
  return {
    frags: 0,
    stars: 0,
    level: 1,
    farmSize: 3,
    farm: Array(9).fill().map(()=>({status:"empty",seed:"basic",plantedAt:0})),
    drones: 0,
    quests: { harvested:0, dronesBought:0 },
    harvestedThisSeason: 0,
    season: { start: now() },
    playerName: "Guest",
    avatar: "",
    selectedSeed: "basic"
  };
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn(e) }
  return defaultState();
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();

// ensure farm length matches farmSize
while(state.farm.length < state.farmSize*state.farmSize) state.farm.push({status:"empty",seed:"basic",plantedAt:0});

// DOM refs
const splash = document.getElementById("splash");
const app = document.getElementById("app");
const farmEl = document.getElementById("farm");
const statsEl = document.getElementById("playerStats");
const houseEl = document.getElementById("house");
const droneCanvas = document.getElementById("droneCanvas");
const panelShop = document.getElementById("panelShop");
const panelDrones = document.getElementById("panelDrones");
const panelQuests = document.getElementById("panelQuests");
const panelProfile = document.getElementById("panelProfile");
const panelCase = document.getElementById("panelCase");
const questHarvestEl = document.getElementById("questHarvest");

// splash -> app
function hideSplash(){
  splash.classList.remove("active");
  splash.classList.add("hidden");
  setTimeout(()=>{ app.classList.remove("hidden"); }, 200);
}
setTimeout(()=>{ hideSplash(); render(); }, 1200); // short splash

// render house background by level
function renderHouse(){
  let img = "houses/house_lvl1.png.jpg";
  if(state.level >= 3) img = "houses/house_lvl3.png.jpg";
  if(state.level >= 6) img = "houses/house_lvl6.png.jpg";
  if(state.level >= 10) img = "houses/house_lvl10.png.jpg";
  houseEl.style.backgroundImage = `url('${img}')`;
}

// growth ms
function growthMs(seedId){
  const s = SEEDS[seedId] || SEEDS.basic;
  const levelFactor = Math.max(0.6, 1 - (state.level-1)*0.02);
  return Math.max(1500, Math.floor(BASE_GROW_MS * s.timeMul * levelFactor));
}

// xp needed (frags used as xp)
function xpNeeded(lvl){
  return Math.floor(15 * Math.pow(lvl, 1.5));
}

// render farm grid
function render(){
  // set grid class by size
  farmEl.className = "farm grid-" + state.farmSize;
  farmEl.innerHTML = "";
  while(state.farm.length < state.farmSize*state.farmSize) state.farm.push({status:"empty",seed:"basic",plantedAt:0});

  state.farm.forEach((tile, idx)=>{
    const el = document.createElement("div");
    el.className = "tile";
    if(tile.status === "empty"){
      el.innerHTML = `<div class="empty-dot"></div>`;
    } else if(tile.status === "growing"){
      el.classList.add("planted");
      const left = Math.ceil((tile.plantedAt + growthMs(tile.seed) - now())/1000);
      el.innerHTML = `🌱`;
      if(left > 0){
        const t = document.createElement("div");
        t.className = "timer";
        t.innerText = left + "s";
        el.appendChild(t);
      } else {
        tile.status = "grown";
        el.innerHTML = "✅";
      }
    } else if(tile.status === "grown"){
      el.innerHTML = `✅`;
    }
    el.onclick = ()=>onTileClick(idx);
    farmEl.appendChild(el);
  });

  // stats
  statsEl.textContent = `Frags: ${state.frags} • Lvl ${state.level} • Drones: ${state.drones}`;
  document.getElementById("crystalCount").innerText = state.frags;
  document.getElementById("starCount").innerText = state.stars;
  document.getElementById("playerName").innerText = state.playerName || "Guest";
  renderHouse();
  updateQuests();
  saveState();
}

// tile interaction
function onTileClick(i){
  const tile = state.farm[i];
  if(tile.status === "empty"){
    // plant
    tile.status = "growing";
    tile.seed = state.selectedSeed || "basic";
    tile.plantedAt = now();
    saveState(); render();
  } else if(tile.status === "grown"){
    // harvest
    const s = SEEDS[tile.seed] || SEEDS.basic;
    state.frags += s.yield;
    state.quests.harvested = (state.quests.harvested||0) + s.yield;
    state.harvestedThisSeason = (state.harvestedThisSeason||0) + s.yield;
    tile.status = "empty";
    tile.plantedAt = 0;
    checkLevel();
    saveState(); render();
  }
}

// check level up
function checkLevel(){
  const need = xpNeeded(state.level);
  if(state.frags >= need){
    state.frags -= need;
    state.level++;
    // expand farm at certain levels
    if(state.level === 2) state.farmSize = 3;
    if(state.level === 4) state.farmSize = Math.min(MAX_FARM_SIZE,4);
    if(state.level === 6) state.farmSize = Math.min(MAX_FARM_SIZE,5);
    if(state.level === 9) state.farmSize = Math.min(MAX_FARM_SIZE,6);
    if(state.level === 12) state.farmSize = Math.min(MAX_FARM_SIZE,7);
    while(state.farm.length < state.farmSize*state.farmSize) state.farm.push({status:"empty",seed:"basic",plantedAt:0});
    saveState();
  }
}

// shop actions (UI wrappers)
function buyDroneUI(){
  // drone price grows: first is 10, next double, limit 10
  const count = state.drones || 0;
  if(count >= 10) return alert("Max drones purchased (10).");
  const price = 10 * Math.pow(2, count);
  if(state.frags < price) return alert("Not enough CRYSTAL");
  state.frags -= price;
  state.drones++;
  state.quests.dronesBought = (state.quests.dronesBought||0) + 1;
  saveState(); render();
  alert("Drone purchased!");
}
function buyFarmUI(){
  if(state.frags < 50) return alert("Not enough CRYSTAL");
  if(state.farmSize >= MAX_FARM_SIZE) return alert("Farm max size reached");
  state.frags -= 50;
  state.farmSize++;
  while(state.farm.length < state.farmSize*state.farmSize) state.farm.push({status:"empty",seed:"basic",plantedAt:0});
  saveState(); render();
  alert("Farm expanded!");
}
function selectSeedUI(id){
  if(!SEEDS[id]) return;
  const s = SEEDS[id];
  if(s.price > 0 && state.frags < s.price) return alert("Not enough CRYSTAL");
  if(s.price > 0) state.frags -= s.price;
  state.selectedSeed = id;
  saveState(); render();
  alert("Selected: " + s.label);
}

// panels open/close
function openPanel(id){
  closePanels();
  const el = document.getElementById(id);
  if(el) el.hidden = false;
  if(id === "panelShop") initShop();
  if(id === "panelDrones") document.getElementById("droneCount").innerText = state.drones;
  if(id === "panelQuests") updateQuests();
}
function closePanels(){
  [panelShop, panelDrones, panelQuests, panelProfile, panelCase].forEach(p=>{ if(p) p.hidden = true; });
}
function openFarm(){ closePanels(); }

// seeds in shop
function initShop(){
  const sel = document.getElementById("seedSelector");
  if(!sel) return;
  sel.innerHTML = "<b>Seeds</b><br>";
  Object.values(SEEDS).forEach(s=>{
    const btn = document.createElement("button");
    btn.className = "buyBtn";
    btn.style.marginTop = "8px";
    btn.innerText = `${s.label} — ${s.price} CRYSTAL`;
    btn.onclick = ()=> selectSeedUI(s.id);
    sel.appendChild(btn);
  });
}

// quests
function updateQuests(){
  if(!questHarvestEl) return;
  questHarvestEl.innerHTML = `
    <b>Harvest 5</b><br>
    Progress: ${state.quests.harvested||0}/5<br>
    Reward: 5 CRYSTAL
    ${(state.quests.harvested||0) >= 5 ? '<button class="buyBtn" onclick="claimHarvestQuest()">Claim</button>':''}
    <hr>
    <b>Buy 1 drone</b><br>
    Progress: ${state.quests.dronesBought||0}/1<br>
    Reward: 10 CRYSTAL
    ${(state.quests.dronesBought||0) >= 1 ? '<button class="buyBtn" onclick="claimDroneQuest()">Claim</button>':''}
  `;
}
function claimHarvestQuest(){
  if((state.quests.harvested||0) < 5) return alert("Not ready");
  state.quests.harvested -= 5;
  state.frags += 5;
  saveState(); render(); alert("Reward 5 CRYSTAL");
}
function claimDroneQuest(){
  if((state.quests.dronesBought||0) < 1) return alert("Not ready");
  state.quests.dronesBought -= 1;
  state.frags += 10;
  saveState(); render(); alert("Reward 10 CRYSTAL");
}

// cases (simple)
function openCase(type){
  // demo: random reward
  const roll = Math.random();
  let reward = 1;
  if(roll > 0.97){ reward = 50; }
  else if(roll > 0.9){ reward = 10; }
  else if(roll > 0.6){ reward = 3; }
  state.frags += reward;
  saveState(); render();
  alert(`Open ${type} → +${reward} CRYSTAL`);
}

// season check (basic)
setInterval(()=>{
  const SEASON_MS = 24*60*60*1000;
  if(now() - (state.season.start||0) >= SEASON_MS){
    // season reward
    const bonus = Math.max(1, Math.floor((state.harvestedThisSeason||0)/5));
    state.frags += bonus;
    state.harvestedThisSeason = 0;
    state.season.start = now();
    saveState();
    alert(`New season started! Reward: ${bonus} CRYSTAL`);
    render();
  }
}, 60000);

// drones + animation (canvas)
const canvas = droneCanvas;
let ctx = null;
try { ctx = canvas.getContext('2d'); } catch(e){ ctx = null; }
function resizeCanvas(){
  if(!ctx) return;
  const rect = farmEl.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.left = rect.left + 'px';
  canvas.style.top = rect.top + 'px';
}
window.addEventListener('resize', ()=>{ resizeCanvas(); render(); });

let droneObjs = [];
function ensureDrones(){
  while(droneObjs.length < state.drones) droneObjs.push({x:20 + droneObjs.length*30, y:20, target:null, status:"idle"});
  while(droneObjs.length > state.drones) droneObjs.pop();
}
function findGrown(){
  for(let i=0;i<state.farm.length;i++){
    if(state.farm[i].status === "grown") return i;
  }
  return null;
}
function computeCenters(){
  const rect = farmEl.getBoundingClientRect();
  const cols = state.farmSize;
  const cellW = rect.width / cols;
  const cellH = rect.height / Math.ceil(state.farm.length/cols);
  const centers = [];
  for(let i=0;i<state.farm.length;i++){
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cx = c * cellW + cellW/2;
    const cy = r * cellH + cellH/2;
    centers.push({x:cx,y:cy});
  }
  return {rect, centers, cellW, cellH};
}
function droneTick(){
  ensureDrones();
  droneObjs.forEach(d=>{
    if(d.status === "idle"){
      const idx = findGrown();
      if(idx !== null){ d.target = idx; d.status = "to"; }
    }
  });
}
setInterval(()=>{ droneTick(); }, 2200);

let last = performance.now();
function animate(t){
  const dt = t - last; last = t;
  if(ctx){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const info = computeCenters();
    droneObjs.forEach((d, id)=>{
      if(!('x' in d)){ d.x = 20 + id*30; d.y = 20; d.status = "idle"; }
      if(d.status === "to" && d.target !== null){
        const c = info.centers[d.target];
        if(!c) { d.status = "idle"; d.target = null; return; }
        const dx = c.x - d.x, dy = c.y - d.y; const dist = Math.hypot(dx,dy);
        const speed = 0.4 * dt;
        if(dist <= speed){ d.x = c.x; d.y = c.y;
          // harvest
          if(state.farm[d.target] && state.farm[d.target].status === "grown"){
            const seed = SEEDS[state.farm[d.target].seed] || SEEDS.basic;
            state.frags += seed.yield;
            state.quests.harvested = (state.quests.harvested||0) + seed.yield;
            state.harvestedThisSeason = (state.harvestedThisSeason||0) + seed.yield;
            state.farm[d.target].status = "empty";
            state.farm[d.target].plantedAt = 0;
            checkLevel();
            saveState();
          }
          d.status = "return";
        } else { d.x += dx/dist * speed; d.y += dy/dist * speed; }
      } else if(d.status === "return"){
        const gx = 20 + id*30, gy = 20;
        const dx = gx - d.x, dy = gy - d.y; const dist = Math.hypot(dx,dy);
        const speed = 0.4 * dt;
        if(dist <= speed){ d.x = gx; d.y = gy; d.status = "idle"; d.target = null; } else { d.x += dx/dist * speed; d.y += dy/dist * speed; }
      }
      // draw drone simple
      if(ctx){
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.fillStyle = "#cfe6ff";
        roundRect(ctx, -8, -6, 16, 12, 3); ctx.fill();
        ctx.fillStyle="#20407a"; ctx.beginPath(); ctx.arc(2,0,2,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    });
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }

// auto-grow check
setInterval(()=>{
  let changed=false;
  state.farm.forEach(t=>{
    if(t.status === "growing" && (now()-t.plantedAt >= growthMs(t.seed))) { t.status = "grown"; changed=true; }
  });
  if(changed) render();
}, 800);

// Helpers
window.openPanel = openPanel;
window.closePanels = closePanels;
window.openFarm = openFarm;
window.buyDroneUI = buyDroneUI;
window.buyFarmUI = buyFarmUI;
window.openCase = openCase;
window.saveName = saveName;
window.saveAvatar = saveAvatar;
window.claimHarvestQuest = claimHarvestQuest;
window.claimDroneQuest = claimDroneQuest;

function saveName(){
  const v = document.getElementById("nameInput").value.trim();
  if(v) state.playerName = v;
  saveState(); render(); closePanels();
}
function saveAvatar(){
  const v = document.getElementById("avatarInput").value.trim();
  if(!v) return alert("Paste image URL");
  state.avatar = v; saveState(); render(); closePanels();
}

// initial shop setup
function bootstrap(){
  initShop();
  resizeCanvas();
  render();
}
bootstrap();
