// app.js — FULL Featured frontend for Cosmic Farm
// Features:
// - adaptive farm grid (expands with level)
// - 3 seed types (fast/normal/premium) with different growth times and prices
// - drones: small quadcopter visual on canvas that flies to collect grown tiles
// - quests tracking and claiming
// - seasons (demo: short duration) with seasonal reward
// - localStorage persistence
// - panels: shop/drones/quests/profile
// - house skins by level

// --------------------------- CONFIG ---------------------------
const STORAGE_KEY = "cosmic_farm_state_v2";
// For demo you can set SEASON_DURATION_MS shorter. Real prod: 7*24*3600*1000
const SEASON_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day for demo; change to 7*24*3600*1000 for week
const MAX_FARM_SIZE = 7;
const BASE_GROW_MS = 7000; // baseline for 'normal' seed, scaled by level

// seed definitions
const SEEDS = {
  basic: { id: "basic", label: "Basic Seed", price: 0, timeMul: 1, yield: 1 },
  fast:  { id: "fast",  label: "Fast Seed",  price: 5, timeMul: 0.6, yield: 1 },
  premium:{ id:"premium",label:"Premium Seed",price:15,timeMul:1.4,yield:2 }
};

// drone visual config
const DRONE_SPEED = 0.9; // px/ms (adjust)
const DRONE_INTERVAL_MS = 2500; // how often drone seeks a tile

// --------------------------- STATE ---------------------------
let state = loadState();

// ensure farm array matches farmSize
while (state.farm.length < state.farmSize * state.farmSize) {
  state.farm.push(makeEmptyTile());
}

// --------------------------- DOM refs ---------------------------
const farmEl = document.getElementById("farm");
const statsEl = document.getElementById("playerStats");
const houseEl = document.getElementById("house");
const tabModal = document.getElementById("tabModal");

const panelShop = document.getElementById("panelShop");
const panelDrones = document.getElementById("panelDrones");
const panelQuests = document.getElementById("panelQuests");
const panelProfile = document.getElementById("panelProfile");

const panelQuestHarvest = document.getElementById("questHarvest");
const droneCanvas = document.getElementById("droneCanvas");

// canvas setup
const canvas = droneCanvas;
const ctx = canvas.getContext?.("2d");
let canvasEnabled = !!ctx;

// resize canvas to farm area each render
function resizeCanvasToMatchFarm(){
  if(!canvasEnabled) return;
  const rect = farmEl.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  canvas.style.position = "absolute";
  canvas.style.left = rect.left + "px";
  canvas.style.top = rect.top + "px";
  canvas.style.pointerEvents = "none";
}

// --------------------------- HELPERS ---------------------------
function now(){ return Date.now(); }
function makeEmptyTile(){ return { status:"empty", seed:"basic", plantedAt:0 }; }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) {
      const parsed = JSON.parse(raw);
      // migration safety (fill fields)
      parsed.farm = parsed.farm || [];
      parsed.farmSize = parsed.farmSize || 3;
      parsed.level = parsed.level || 1;
      parsed.frags = parsed.frags || 0;
      parsed.drones = parsed.drones || 0;
      parsed.quests = parsed.quests || { harvested:0, dronesBought:0 };
      parsed.season = parsed.season || { start: now() };
      parsed.selectedSeed = parsed.selectedSeed || "basic";
      return parsed;
    }
  }catch(e){ console.warn("loadState failed", e); }
  // default state
  return {
    frags: 0,
    level: 1,
    farmSize: 3,
    farm: Array(9).fill().map(()=>makeEmptyTile()),
    drones: 0,
    quests: { harvested:0, dronesBought:0 },
    season: { start: now() },
    selectedSeed: "basic",
    harvestedThisSeason: 0
  };
}

// compute growth time in ms for a given seed & level
function growthMs(seedId){
  const seed = SEEDS[seedId] || SEEDS.basic;
  // level reduces time somewhat, but not too much
  const levelFactor = Math.max(0.7, 1 - (state.level-1)*0.03);
  const base = BASE_GROW_MS * seed.timeMul * levelFactor;
  return Math.max(1200, Math.floor(base));
}

// xp/level formula (frags used as XP)
function xpNeeded(lvl){
  return Math.floor(10 * Math.pow(lvl, 1.6));
}

// --------------------------- RENDER ---------------------------
function render(){
  // grid columns adaptive
  farmEl.style.gridTemplateColumns = `repeat(${state.farmSize}, 1fr)`;
  farmEl.innerHTML = "";

  // ensure length
  while(state.farm.length < state.farmSize * state.farmSize) state.farm.push(makeEmptyTile());

  state.farm.forEach((tile, i) => {
    const el = document.createElement("div");
    el.className = "tile";
    const status = tile.status;

    if(status === "empty"){
      el.innerHTML = `<div class="empty-dot"></div>`;
    } else if(status === "growing"){
      el.classList.add("planted");
      el.innerHTML = `<div>🌱</div>`;
      const left = Math.ceil((tile.plantedAt + growthMs(tile.seed) - now())/1000);
      if(left > 0){
        const t = document.createElement("div");
        t.className = "timer";
        t.innerText = `${left}s`;
        el.appendChild(t);
      } else {
        tile.status = "grown";
      }
    } else if(status === "grown"){
      el.innerHTML = `<div>✅</div>`;
    }

    el.addEventListener("click", ()=> onTileClick(i));
    farmEl.appendChild(el);
  });

  // stats
  statsEl.textContent = `Frags: ${state.frags}  •  Level: ${state.level}  •  Drones: ${state.drones}`;

  // update quests panel
  updateQuestsPanel();

  // render house skin
  renderHouse();

  // resize canvas overlay
  resizeCanvasToMatchFarm();

  saveState();
}

// house swap by level
function renderHouse(){
  let img = "img/house1.png";
  if(state.level >= 3) img = "img/house2.png";
  if(state.level >= 6) img = "img/house3.png";
  if(state.level >= 10) img = "img/house4.png";
  houseEl.style.backgroundImage = `url(${img})`;
}

// --------------------------- GAME LOGIC ---------------------------
function onTileClick(i){
  const tile = state.farm[i];
  if(tile.status === "empty"){
    // plant selected seed
    tile.status = "growing";
    tile.seed = state.selectedSeed || "basic";
    tile.plantedAt = now();
    saveState();
    render();
  } else if(tile.status === "grown"){
    // harvest
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

// check level up & expand farm
function checkLevel(){
  const need = xpNeeded(state.level);
  if(state.frags >= need){
    state.frags -= need;
    state.level++;
    if(state.farmSize < MAX_FARM_SIZE && state.level % 2 === 0){
      state.farmSize++;
      // extend farm array
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
  const h = panelQuestHarvest;
  if(!h) return;
  h.innerHTML = `
    <b>Harvest 5</b><br>
    Progress: ${state.quests.harvested || 0}/5<br>
    Reward: 5 FRAG
    ${ (state.quests.harvested || 0) >= 5 ? '<button onclick="claimHarvestQuest()">Claim</button>' : '' }
    <hr>
    <b>Buy 1 drone</b><br>
    Progress: ${state.quests.dronesBought || 0}/1<br>
    Reward: 10 FRAG
    ${ (state.quests.dronesBought || 0) >= 1 ? '<button onclick="claimDroneQuest()">Claim</button>' : '' }
  `;
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
    // new season: grant simple reward and reset seasonal counters
    const bonus = Math.max(1, Math.floor(state.harvestedThisSeason/5));
    // give bonus frags
    state.frags += bonus;
    // reset season
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
  el.hidden = false;
  // special init
  if(id === "panelDrones"){
    document.getElementById("droneCount").innerText = state.drones;
  }
  if(id === "panelQuests"){ updateQuestsPanel(); }
  if(id === "panelProfile"){
    const input = document.querySelector("#panelProfile input#nameInput") || document.getElementById("nameInput");
    if(input) input.value = state.playerName || "Guest";
  }
}
function closePanels(){
  [panelShop, panelDrones, panelQuests, panelProfile].forEach(p=>{ if(p) p.hidden = true; });
}
function saveName(){
  const input = document.querySelector("#panelProfile input#nameInput") || document.getElementById("nameInput");
  if(!input) return;
  state.playerName = input.value || "Guest";
  saveState();
  render();
  closePanels();
  alert("Name saved");
}

// convenience wrappers used by HTML buttons
window.buyDrone = buyDrone;
window.buyFarm = buyFarm;
window.buySeed = function(seedId){ selectSeed(seedId); };
window.openPanel = openPanel;
window.closePanels = closePanels;
window.saveName = saveName;
window.claimHarvestQuest = claimHarvestQuest;
window.claimDroneQuest = claimDroneQuest;

// --------------------------- DRONE SYSTEM & ANIMATION ---------------------------
let dronesState = {
  // list of drone objects with position and target
  drones: []
};

function ensureDronesObjects(){
  // ensure dronesState.drones length equals state.drones
  while(dronesState.drones.length < state.drones){
    dronesState.drones.push({
      x:0, y:0, targetIdx: null, status: "idle", progress:0
    });
  }
  while(dronesState.drones.length > state.drones){
    dronesState.drones.pop();
  }
}
ensureDronesObjects();
resizeCanvasToMatchFarm();

function findNearestGrownTile(){
  for(let i=0;i<state.farm.length;i++){
    if(state.farm[i].status === "grown") return i;
  }
  return null;
}

// compute tile center positions relative to farmEl
function computeTileCenters(){
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
    centers.push({x: cx, y: cy});
  }
  return {rect, centers, cellW, cellH};
}

function droneTick(){
  ensureDronesObjects();
  // assign targets
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

// animation loop draws drones moving to tiles and back
let lastFrame = performance.now();
function animate(nowTime){
  const dt = nowTime - lastFrame;
  lastFrame = nowTime;
  if(canvasEnabled){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const gridInfo = computeTileCenters();
    // position drones: if just created, place at top-left of canvas
    dronesState.drones.forEach((d, id)=>{
      if(!("x" in d) || !("y" in d)){ d.x = 10 + id*20; d.y = 10; d.status="idle"; }
      if(d.status === "idle"){
        // float a bit
        d.y = d.y + (Math.sin(nowTime/400 + id) * 0.2);
      } else if(d.status === "toTarget" && d.targetIdx !== null){
        const c = gridInfo.centers[d.targetIdx];
        const sx = d.x, sy = d.y;
        const dx = c.x - sx, dy = c.y - sy;
        const dist = Math.hypot(dx,dy);
        const step = DRONE_SPEED * dt;
        if(dist <= step){
          d.x = c.x; d.y = c.y;
          // harvest the tile instantly and mark returning
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
        // return to corner (10 + id*20, 10)
        const goalX = 10 + id*20, goalY = 10;
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
      // draw drone
      drawDrone(d.x, d.y, id);
    });
  }

  requestAnimationFrame(animate);
}

function drawDrone(x, y, id){
  if(!canvasEnabled) return;
  // simple quadcopter shape: body + 4 rotors
  ctx.save();
  ctx.translate(x, y);
  // body
  ctx.fillStyle = "#cfe6ff";
  ctx.beginPath();
  ctx.roundRect(-8, -6, 16, 12, 3);
  ctx.fill();
  // rotors
  ctx.fillStyle = "#dbeeff";
  ctx.beginPath();
  ctx.ellipse(-12, -12, 6, 2.5, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, -12, 6, 2.5, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-12, 12, 6, 2.5, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, 12, 6, 2.5, 0, 0, Math.PI*2);
  ctx.fill();
  // tiny eye
  ctx.fillStyle="#20407a"; ctx.beginPath(); ctx.arc(2,0,2,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// polyfill for roundRect
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
    if(typeof r === "number") r = {tl:r,tr:r,br:r,bl:r};
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
  };
}

// start animation loop
if(canvasEnabled){
  requestAnimationFrame(animate);
}

// periodic drone assignment
setInterval(()=>{
  ensureDronesObjects();
  // trigger drone to seek targets if any grown tiles
  // we let droneTick assign targets if there are grown tiles
  droneTick();
}, DRONE_INTERVAL_MS);

// --------------------------- AUTO GROW CHECK (finalize grown) ---------------------------
setInterval(()=>{
  let changed = false;
  state.farm.forEach(tile=>{
    if(tile.status === "growing"){
      const ms = growthMs(tile.seed);
      if(now() - tile.plantedAt >= ms){
        tile.status = "grown";
        changed = true;
      }
    }
  });
  if(changed) render();
}, 800);

// --------------------------- SEASON CHECK ---------------------------
setInterval(()=>{
  checkSeason();
}, 5000);

// --------------------------- UTIL / INIT ---------------------------
function ensureDronesObjects(){
  while(dronesState.drones.length < state.drones) dronesState.drones.push({ x:10 + dronesState.drones.length*20, y:10, targetIdx:null, status:"idle" });
  while(dronesState.drones.length > state.drones) dronesState.drones.pop();
}
let dronesState = { drones: [] }; // we use dronesState.drones in ensureDronesObjects and animate uses dronesState.drones

// initial housekeeping
function bootstrap(){
  // update selected seed UI in shop panel: add buttons dynamically
  if(panelShop){
    // add seed selector in shop if not exists
    if(!document.getElementById("seedSelector")){
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
          // charge price if >0 (buy & select)
          if(s.price > 0){ state.frags -= s.price; }
          state.selectedSeed = s.id;
          saveState();
          render();
          alert(`Selected ${s.label}`);
        };
        container.appendChild(btn);
      });
      panelShop.insertBefore(container, panelShop.querySelector(".close"));
    }
  }

  // ensure profile input exists
  if(panelProfile && !panelProfile.querySelector("#nameInput")){
    const input = document.createElement("input");
    input.id = "nameInput";
    input.placeholder = "Player";
    input.style.width = "70%";
    panelProfile.insertBefore(input, panelProfile.querySelector(".close"));
    // Save button already wired to saveName
  }

  // ensure quest element exists
  if(panelQuests && !panelQuestHarvest){
    const q = document.createElement("div");
    q.id = "questHarvest";
    panelQuests.insertBefore(q, panelQuests.querySelector(".close"));
  }

  // show selected seed in UI via info text
  render();
}
bootstrap();

// expose a few functions globally for inline HTML
window.openPanel = openPanel;
window.closePanels = closePanels;
window.buyDrone = buyDrone;
window.buyFarm = buyFarm;
window.buySeed = selectSeed;
window.saveName = saveName;
window.claimHarvestQuest = claimHarvestQuest;
window.claimDroneQuest = claimDroneQuest;
window.openFarm = ()=>{ closePanels(); };

// initial render and resize watcher
render();
window.addEventListener("resize", ()=>{
  resizeCanvasToMatchFarm();
  render();
});

// --------------------------- END ---------------------------
