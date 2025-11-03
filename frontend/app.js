// app.js — Cosmic Farm (fixed & cleaned)
// Paste this whole file replacing the old app.js

// --------------------------- CONFIG ---------------------------
const STORAGE_KEY = "cosmic_farm_state_v2";
const SEASON_DURATION_MS = 24 * 60 * 60 * 1000; // demo: 1 day
const MAX_FARM_SIZE = 7;
const BASE_GROW_MS = 7000;

const SEEDS = {
  basic: { id: "basic", label: "Basic Seed", price: 0, timeMul: 1, yield: 1 },
  fast:  { id: "fast",  label: "Fast Seed",  price: 5, timeMul: 0.6, yield: 1 },
  premium:{ id:"premium",label:"Premium Seed",price:15,timeMul:1.4,yield:2 }
};

const DRONE_SPEED = 0.9; // px/ms
const DRONE_INTERVAL_MS = 2500;

// --------------------------- STATE ---------------------------
let state = loadState();

// make sure farm length matches size
while (state.farm.length < state.farmSize * state.farmSize) {
  state.farm.push(makeEmptyTile());
}

// --------------------------- DOM refs ---------------------------
const farmEl = document.getElementById("farm");
const statsEl = document.getElementById("playerStats");
const houseEl = document.getElementById("house");

const panelShop = document.getElementById("panelShop");
const panelDrones = document.getElementById("panelDrones");
const panelQuests = document.getElementById("panelQuests");
const panelProfile = document.getElementById("panelProfile");

const droneCanvas = document.getElementById("droneCanvas");
const canvas = droneCanvas;
const ctx = (canvas && canvas.getContext) ? canvas.getContext("2d") : null;
const canvasEnabled = !!ctx;

// --------------------------- HELPERS ---------------------------
function now(){ return Date.now(); }
function makeEmptyTile(){ return { status:"empty", seed:"basic", plantedAt:0 }; }
function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){console.warn("saveState failed",e);} }
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) {
      const parsed = JSON.parse(raw);
      parsed.farm = parsed.farm || [];
      parsed.farmSize = parsed.farmSize || 3;
      parsed.level = parsed.level || 1;
      parsed.frags = parsed.frags || 0;
      parsed.drones = parsed.drones || 0;
      parsed.quests = parsed.quests || { harvested:0, dronesBought:0 };
      parsed.season = parsed.season || { start: now() };
      parsed.selectedSeed = parsed.selectedSeed || "basic";
      parsed.harvestedThisSeason = parsed.harvestedThisSeason || 0;
      return parsed;
    }
  }catch(e){ console.warn("loadState failed", e); }
  return {
    frags: 0,
    level: 1,
    farmSize: 3,
    farm: Array(9).fill().map(()=>makeEmptyTile()),
    drones: 0,
    quests: { harvested:0, dronesBought:0 },
    season: { start: now() },
    selectedSeed: "basic",
    harvestedThisSeason: 0,
    playerName: "Guest"
  };
}

function growthMs(seedId){
  const seed = SEEDS[seedId] || SEEDS.basic;
  const levelFactor = Math.max(0.7, 1 - (state.level-1)*0.03);
  const base = BASE_GROW_MS * seed.timeMul * levelFactor;
  return Math.max(1200, Math.floor(base));
}
function xpNeeded(lvl){ return Math.floor(10 * Math.pow(lvl, 1.6)); }

// --------------------------- RENDER ---------------------------
function render(){
  if(!farmEl) return;
  farmEl.style.gridTemplateColumns = `repeat(${state.farmSize}, 1fr)`;
  farmEl.innerHTML = "";

  while(state.farm.length < state.farmSize * state.farmSize) state.farm.push(makeEmptyTile());

  state.farm.forEach((tile, i) => {
    const el = document.createElement("div");
    el.className = "tile";

    if(tile.status === "empty"){
      el.innerHTML = `<div class="empty-dot"></div>`;
    } else if(tile.status === "growing"){
      el.classList.add("planted");
      el.innerHTML = `<div class="plant-emoji">🌱</div>`;
      const left = Math.ceil((tile.plantedAt + growthMs(tile.seed) - now())/1000);
      if(left > 0){
        const t = document.createElement("div");
        t.className = "timer";
        t.innerText = `${left}s`;
        el.appendChild(t);
      } else {
        tile.status = "grown";
        el.innerHTML = `<div class="grown-emoji">✅</div>`;
      }
    } else if(tile.status === "grown"){
      el.innerHTML = `<div class="grown-emoji">✅</div>`;
    }

    el.addEventListener("click", ()=> onTileClick(i));
    farmEl.appendChild(el);
  });

  if(statsEl) statsEl.textContent = `Frags: ${state.frags}  •  Level: ${state.level}  •  Drones: ${state.drones}`;
  updateQuestsPanel();
  renderHouse();
  resizeCanvasToMatchFarm();
  saveState();
}

function renderHouse(){
  if(!houseEl) return;
  let img = "img/house1.svg";
  if(state.level >= 3) img = "img/house2.svg";
  if(state.level >= 6) img = "img/house3.svg";
  if(state.level >= 10) img = "img/house4.svg";
  houseEl.style.backgroundImage = `url(${img})`;
  houseEl.style.backgroundSize = "contain";
  houseEl.style.backgroundRepeat = "no-repeat";
  houseEl.style.backgroundPosition = "center";
}

// --------------------------- GAME LOGIC ---------------------------
function onTileClick(i){
  const tile = state.farm[i];
  if(!tile) return;
  if(tile.status === "empty"){
    tile.status = "growing";
    tile.seed = state.selectedSeed || "basic";
    tile.plantedAt = now();
    saveState();
    render();
  } else if(tile.status === "grown"){
    const seed = SEEDS[tile.seed] || SEEDS.basic;
    state.frags += seed.yield;
    state.quests.harvested = (state.quests.harvested || 0) + seed.yield;
    state.harvestedThisSeason = (state.harvestedThisSeason || 0) + seed.yield;
    tile.status = "empty";
    tile.plantedAt = 0;
    checkLevel();
    saveState();
    render();
  }
}

function checkLevel(){
  const need = xpNeeded(state.level);
  if(state.frags >= need){
    state.frags -= need;
    state.level++;
    if(state.farmSize < MAX_FARM_SIZE && state.level % 2 === 0){
      state.farmSize++;
      while(state.farm.length < state.farmSize * state.farmSize) state.farm.push(makeEmptyTile());
    }
  }
}

// --------------------------- SHOP / UI ACTIONS ---------------------------
function buyDrone(){
  if(state.frags < 10) return alert("Not enough FRAG!");
  state.frags -= 10;
  state.drones++;
  state.quests.dronesBought = (state.quests.dronesBought || 0) + 1;
  saveState();
  render();
  alert("Drone purchased!");
}
function buyFarm(){
  if(state.frags < 50) return alert("Not enough FRAG!");
  if(state.farmSize >= MAX_FARM_SIZE) return alert("Max farm size reached");
  state.frags -= 50;
  state.farmSize++;
  while(state.farm.length < state.farmSize * state.farmSize) state.farm.push(makeEmptyTile());
  saveState();
  render();
  alert("Farm extended!");
}
function selectSeed(seedId){
  if(!SEEDS[seedId]) return;
  state.selectedSeed = seedId;
  saveState();
  alert(`Selected seed: ${SEEDS[seedId].label}`);
}

// --------------------------- QUESTS / SEASON ---------------------------
function updateQuestsPanel(){
  if(!panelQuests) return;
  let qElem = panelQuests.querySelector("#questHarvest");
  if(!qElem){
    qElem = document.createElement("div");
    qElem.id = "questHarvest";
    const closeBtn = panelQuests.querySelector(".close");
    if(closeBtn) panelQuests.insertBefore(qElem, closeBtn);
    else panelQuests.appendChild(qElem);
  }
  qElem.innerHTML = `
    <b>Harvest 5</b><br>
    Progress: ${state.quests.harvested || 0}/5<br>
    Reward: 5 FRAG
    ${ (state.quests.harvested || 0) >= 5 ? '<button id="claimHarvestBtn">Claim</button>' : '' }
    <hr>
    <b>Buy 1 drone</b><br>
    Progress: ${state.quests.dronesBought || 0}/1<br>
    Reward: 10 FRAG
    ${ (state.quests.dronesBought || 0) >= 1 ? '<button id="claimDroneBtn">Claim</button>' : '' }
  `;
  // attach handlers if buttons exist
  const ch = document.getElementById("claimHarvestBtn");
  if(ch) ch.onclick = claimHarvestQuest;
  const cd = document.getElementById("claimDroneBtn");
  if(cd) cd.onclick = claimDroneQuest;
}

function claimHarvestQuest(){
  if((state.quests.harvested || 0) < 5) return alert("Not ready");
  state.quests.harvested -= 5;
  state.frags += 5;
  saveState();
  render();
  alert("Quest reward: 5 FRAG");
}
function claimDroneQuest(){
  if((state.quests.dronesBought || 0) < 1) return alert("Not ready");
  state.quests.dronesBought -= 1;
  state.frags += 10;
  saveState();
  render();
  alert("Quest reward: 10 FRAG");
}

// --------------------------- SEASONAL SYSTEM ---------------------------
function checkSeason(){
  const s = state.season;
  if(!s || !s.start){ state.season = { start: now() }; saveState(); return; }
  const elapsed = now() - s.start;
  if(elapsed >= SEASON_DURATION_MS){
    const bonus = Math.max(1, Math.floor((state.harvestedThisSeason || 0)/5));
    state.frags += bonus;
    state.season = { start: now() };
    state.harvestedThisSeason = 0;
    saveState();
    alert(`New season started! Seasonal reward: ${bonus} FRAG`);
    render();
  }
}

// --------------------------- PANELS ---------------------------
function openPanel(id){
  closePanels();
  const el = document.getElementById(id);
  if(!el) return;
  // show via class for reliability (some platforms ignore .hidden)
  el.classList.add("open");
  if(id === "panelDrones") {
    const c = document.getElementById("droneCount");
    if(c) c.innerText = state.drones;
  }
  if(id === "panelQuests") updateQuestsPanel();
  if(id === "panelProfile"){
    const input = el.querySelector("#nameInput");
    if(input) input.value = state.playerName || "Guest";
  }
}
function closePanels(){
  [panelShop, panelDrones, panelQuests, panelProfile].forEach(p=>{
    if(p) p.classList.remove("open");
  });
}
function saveName(){
  const input = panelProfile ? panelProfile.querySelector("#nameInput") : document.getElementById("nameInput");
  if(!input) return;
  state.playerName = input.value || "Guest";
  saveState();
  render();
  closePanels();
  alert("Name saved");
}

// expose for HTML buttons
window.buyDrone = buyDrone;
window.buyFarm = buyFarm;
window.buySeed = selectSeed;
window.openPanel = openPanel;
window.closePanels = closePanels;
window.saveName = saveName;
window.claimHarvestQuest = claimHarvestQuest;
window.claimDroneQuest = claimDroneQuest;
window.openFarm = ()=>{ closePanels(); };

// --------------------------- DRONE SYSTEM & ANIMATION ---------------------------
let dronesState = { drones: [] };

function ensureDronesObjects(){
  while(dronesState.drones.length < state.drones) {
    dronesState.drones.push({ x:10 + dronesState.drones.length*24, y:10, targetIdx:null, status:"idle" });
  }
  while(dronesState.drones.length > state.drones) dronesState.drones.pop();
}

function findNearestGrownTile(){
  for(let i=0;i<state.farm.length;i++){
    if(state.farm[i].status === "grown") return i;
  }
  return null;
}

function computeTileCenters(){
  const rect = farmEl.getBoundingClientRect();
  const cols = state.farmSize;
  const total = state.farm.length;
  const rows = Math.ceil(total / cols);
  const cellW = rect.width / cols;
  const cellH = rect.height / rows;
  const centers = [];
  for(let i=0;i<total;i++){
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cx = Math.round(c * cellW + cellW/2);
    const cy = Math.round(r * cellH + cellH/2);
    centers.push({x: cx, y: cy});
  }
  return {rect, centers, cellW, cellH};
}

function droneTick(){
  ensureDronesObjects();
  dronesState.drones.forEach(d=>{
    if(d.status === "idle"){
      const idx = findNearestGrownTile();
      if(idx !== null){
        d.targetIdx = idx;
        d.status = "toTarget";
      }
    }
  });
}

function resizeCanvasToMatchFarm(){
  if(!canvasEnabled || !farmEl) return;
  const rect = farmEl.getBoundingClientRect();
  canvas.width = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  // place canvas over farm: position relative to page
  canvas.style.position = "absolute";
  const pageX = rect.left + window.scrollX;
  const pageY = rect.top + window.scrollY;
  canvas.style.left = pageX + "px";
  canvas.style.top = pageY + "px";
  canvas.style.pointerEvents = "none";
}

// drawing
function drawDrone(x, y, id){
  if(!ctx) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#cfe6ff";
  roundRect(ctx, -8, -6, 16, 12, 3);
  ctx.fill();
  ctx.fillStyle = "#dbeeff";
  ctx.beginPath(); ctx.ellipse(-12, -12, 6, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, -12, 6, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-12, 12, 6, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 12, 6, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle="#20407a"; ctx.beginPath(); ctx.arc(2,0,2,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

let lastFrame = performance.now();
function animate(nowTime){
  const dt = nowTime - lastFrame;
  lastFrame = nowTime;
  if(canvasEnabled && ctx){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const gridInfo = computeTileCenters();
    // ensure drones objects set
    ensureDronesObjects();
    dronesState.drones.forEach((d, id)=>{
      if(typeof d.x !== "number" || typeof d.y !== "number"){ d.x = 10 + id*24; d.y = 10; d.status = "idle"; }
      if(d.status === "idle"){
        d.y += Math.sin((nowTime + id*100)/400) * 0.2;
      } else if(d.status === "toTarget" && d.targetIdx !== null){
        const c = gridInfo.centers[d.targetIdx];
        if(!c) { d.status="idle"; d.targetIdx=null; return; }
        const sx = d.x, sy = d.y;
        const dx = c.x - sx, dy = c.y - sy;
        const dist = Math.hypot(dx,dy);
        const step = DRONE_SPEED * dt;
        if(dist <= step){
          d.x = c.x; d.y = c.y;
          // harvest if grown
          if(state.farm[d.targetIdx] && state.farm[d.targetIdx].status === "grown"){
            const seed = SEEDS[state.farm[d.targetIdx].seed] || SEEDS.basic;
            state.frags += seed.yield;
            state.quests.harvested = (state.quests.harvested||0) + seed.yield;
            state.harvestedThisSeason = (state.harvestedThisSeason||0) + seed.yield;
            state.farm[d.targetIdx].status = "empty";
            state.farm[d.targetIdx].plantedAt = 0;
            checkLevel();
            saveState();
          }
          d.status = "return";
          d.targetIdx = null;
        } else {
          d.x += dx/dist * step;
          d.y += dy/dist * step;
        }
      } else if(d.status === "return"){
        const goalX = 10 + id*24, goalY = 10;
        const dx = goalX - d.x, dy = goalY - d.y;
        const dist = Math.hypot(dx,dy);
        const step = DRONE_SPEED * dt;
        if(dist <= step){
          d.x = goalX; d.y = goalY; d.status = "idle";
        } else {
          d.x += dx/dist * step;
          d.y += dy/dist * step;
        }
      }
      drawDrone(d.x, d.y, id);
    });
  }
  requestAnimationFrame(animate);
}

if(canvasEnabled) requestAnimationFrame(animate);

// periodic drone assignment
setInterval(()=>{ droneTick(); }, DRONE_INTERVAL_MS);

// --------------------------- AUTO GROW CHECK ---------------------------
setInterval(()=>{
  let changed = false;
  state.farm.forEach(tile=>{
    if(tile.status === "growing"){
      if(now() - tile.plantedAt >= growthMs(tile.seed)){
        tile.status = "grown";
        changed = true;
      }
    }
  });
  if(changed) render();
}, 800);

// --------------------------- SEASON CHECK ---------------------------
setInterval(()=>{ checkSeason(); }, 5000);

// --------------------------- INIT UI / BOOTSTRAP ---------------------------
function bootstrap(){
  // seed selector in shop
  if(panelShop && !panelShop.querySelector("#seedSelector")){
    const container = document.createElement("div");
    container.className = "card";
    container.id = "seedSelector";
    container.innerHTML = `<b>Seeds</b><br>`;
    Object.values(SEEDS).forEach(s=>{
      const btn = document.createElement("button");
      btn.textContent = `${s.label} — ${s.price} FRAG`;
      btn.style.marginTop = "6px";
      btn.onclick = ()=> {
        if(s.price > 0 && state.frags < s.price) return alert("Not enough FRAG to purchase seed");
        if(s.price > 0) state.frags -= s.price;
        state.selectedSeed = s.id;
        saveState();
        render();
        alert(`Selected ${s.label}`);
      };
      container.appendChild(btn);
    });
    const closeBtn = panelShop.querySelector(".close");
    if(closeBtn) panelShop.insertBefore(container, closeBtn);
    else panelShop.appendChild(container);
  }

  // profile input
  if(panelProfile && !panelProfile.querySelector("#nameInput")){
    const input = document.createElement("input");
    input.id = "nameInput";
    input.placeholder = "Player";
    input.style.width = "70%";
    const closeBtn = panelProfile.querySelector(".close");
    if(closeBtn) panelProfile.insertBefore(input, closeBtn);
    else panelProfile.appendChild(input);
  }

  render();
}
bootstrap();

window.addEventListener("resize", ()=>{
  resizeCanvasToMatchFarm();
  render();
});
