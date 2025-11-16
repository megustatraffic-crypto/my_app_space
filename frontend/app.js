// app.js - frontend V2 (clean MVP)
// mobile-first, metal sci-fi, grid 3x3, house centered
const STORAGE_KEY = "cosmic_farm_v2_state";

// --- default assets (paths as in your repo)
const ASSETS = {
  bg: "backgrounds/bg_alien_ground.jpg",
  house: "houses/house_lvl1.jpg",
  drone: "drones/drone_mk1.jpg",
  caseClosed: "cases/case_common_closed.jpg",
  btns: {
    farm: "ui/btn_farm.jpg",
    shop: "ui/btn_shop.jpg",
    cases: "ui/btn_cases.jpg",
    drones: "ui/btn_drones.jpg",
    profile: "ui/btn_profile.jpg"
  },
  vfxFlash: "vfx/vfx_flash_small.jpg",
  avatarFrame: "vfx/avatar_frame_neon.jpg",
  logo: "ui/logo_cosmic_farm.jpg"
};

// --- initial state
let state = loadState();

// ensure farm size 3x3 minimal
if(!state.farm || state.farm.length < 9){
  state.farmSize = 3;
  state.farm = Array(state.farmSize*state.farmSize).fill().map(()=>makeEmptyTile());
  saveState();
}

// DOM refs
const farmGrid = document.getElementById("farmGrid");
const fragsEl = document.getElementById("frags");
const lvlEl = document.getElementById("lvl");
const playerNameEl = document.getElementById("playerName");
const houseImg = document.getElementById("houseImg");
const bgLayer = document.getElementById("bgLayer");
const panel = document.getElementById("panel");
const panelContent = document.getElementById("panelContent");
const panelClose = document.getElementById("panelClose");
const droneCanvas = document.getElementById("droneCanvas");

// set assets
document.getElementById("logo").src = ASSETS.logo;
document.getElementById("avatarFrame").src = ASSETS.avatarFrame;
bgLayer.style.backgroundImage = `url("${ASSETS.bg}")`;
houseImg.src = ASSETS.house;

// bottom buttons
document.getElementById("btnFarm").addEventListener("click", ()=>{ closePanel(); render(); });
document.getElementById("btnShop").addEventListener("click", ()=> openPanel("shop"));
document.getElementById("btnCases").addEventListener("click", ()=> openPanel("cases"));
document.getElementById("btnDrones").addEventListener("click", ()=> openPanel("drones"));
document.getElementById("btnProfile").addEventListener("click", ()=> openPanel("profile"));
panelClose.addEventListener("click", closePanel);

// canvas for drone visual
let ctx = null;
let droneImg = new Image();
droneImg.src = ASSETS.drone;
if(droneCanvas && droneCanvas.getContext){
  ctx = droneCanvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", ()=>{ resizeCanvas(); drawLoop(); });
}

// --- helper functions
function makeEmptyTile(){ return {status:"empty", seed:"basic", plantedAt:0}; }
function now(){ return Date.now(); }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn("loadState error", e); }
  return { frags: 5, level:1, farmSize:3, farm:[], drones:0, quests:{harvested:0,dronesBought:0}, selectedSeed:"basic", playerName:"Guest" };
}

// xp/level (simple)
function xpNeeded(lvl){ return Math.floor(10 * Math.pow(lvl, 1.6)); }

// --- render farm
function render(){
  fragsEl.innerText = state.frags;
  lvlEl.innerText = state.level;
  playerNameEl.innerText = state.playerName || "Guest";

  // ensure farm array length
  while(state.farm.length < state.farmSize * state.farmSize) state.farm.push(makeEmptyTile());

  // center house: we will keep house visual separate; farm is grid only
  farmGrid.style.gridTemplateColumns = `repeat(${state.farmSize}, 1fr)`;
  farmGrid.innerHTML = "";
  state.farm.forEach((tile, i)=>{
    const el = document.createElement("div");
    el.className = "tile";
    if(tile.status === "empty"){
      el.innerHTML = `<div class="dot-empty" aria-hidden="true"></div>`;
    } else if(tile.status === "growing"){
      el.classList.add("planted");
      const left = Math.max(0, Math.ceil((tile.plantedAt + growthMs(tile.seed) - now())/1000));
      el.innerHTML = `<div class="seed-emoji">🌱</div><div class="timer">${left}s</div>`;
      if(left <= 0){ tile.status = "grown"; saveState(); render(); return; }
    } else if(tile.status === "grown"){
      el.innerHTML = `<div style="font-size:26px">✅</div>`;
    }
    el.addEventListener("click", ()=> onTileClick(i));
    farmGrid.appendChild(el);
  });
  saveState();
}
function growthMs(seedId){
  const base = 6000; // baseline 6s for demo
  const seedMul = seedId === "basic"?1 : (seedId==="fast"?0.6:1.4);
  const levelFactor = Math.max(0.6, 1 - (state.level-1)*0.03);
  return Math.max(1200, Math.floor(base * seedMul * levelFactor * Math.pow(1.3, state.level-1)));
}

// tile click
function onTileClick(i){
  const t = state.farm[i];
  if(t.status === "empty"){
    t.status = "growing";
    t.seed = state.selectedSeed || "basic";
    t.plantedAt = now();
    saveState(); render();
  } else if(t.status === "grown"){
    // harvest
    const yieldAmt = seedYield(t.seed);
    state.frags += yieldAmt;
    state.quests.harvested = (state.quests.harvested||0) + yieldAmt;
    t.status = "empty"; t.plantedAt = 0;
    checkLevel();
    saveState(); render();
    // flash effect
    flashEffect();
  }
}

// seed yields
function seedYield(seedId){
  if(seedId === "basic") return 1;
  if(seedId === "fast") return 1;
  if(seedId === "premium") return 2;
  return 1;
}

// level check
function checkLevel(){
  const need = xpNeeded(state.level);
  if(state.frags >= need){
    state.frags -= need;
    state.level++;
    // expand farm every 2 levels until 7
    if(state.farmSize < 7 && state.level % 2 === 0) state.farmSize++;
  }
}

// panels
function openPanel(name){
  panelContent.innerHTML = "";
  panel.classList.remove("hidden");
  if(name === "shop"){
    panelContent.innerHTML = `
      <h3>Shop</h3>
      <div class="card"><b>Buy Drone (starter)</b><p>Cost: 10 FRAG (max 10 drones)</p><button id="buyDroneBtn">Buy</button></div>
      <div class="card"><b>Upgrade Farm +1</b><p>Cost: 50 FRAG</p><button id="buyFarmBtn">Buy</button></div>
    `;
    document.getElementById("buyDroneBtn").onclick = buyDrone;
    document.getElementById("buyFarmBtn").onclick = buyFarm;
  } else if(name === "cases"){
    panelContent.innerHTML = `
      <h3>Cases</h3>
      <div class="card center"><img src="${ASSET("caseClosed")}" style="max-width:180px;border-radius:10px"/></div>
      <div class="card"><button id="openCaseBtn">Open Case (10 FRAG)</button></div>
    `;
    document.getElementById("openCaseBtn").onclick = openCase;
  } else if(name === "drones"){
    panelContent.innerHTML = `
      <h3>Drones</h3>
      <div class="card"><img src="${ASSET("drone")}" style="width:120px"/></div>
      <div class="card">You have: <b>${state.drones}</b></div>
    `;
  } else if(name === "profile"){
    panelContent.innerHTML = `
      <h3>Profile</h3>
      <div class="card">Name: <input id="nameInput" value="${state.playerName || 'Guest'}" /></div>
      <div class="card"><button id="saveNameBtn">Save</button></div>
    `;
    document.getElementById("saveNameBtn").onclick = ()=>{
      const v = document.getElementById("nameInput").value || "Guest";
      state.playerName = v; saveState(); render(); closePanel();
    };
  }
}
function closePanel(){ panel.classList.add("hidden"); }

// shop functions
function buyDrone(){
  // max 10 drones; price increases (first 10 at 10 then x2)
  const current = state.drones || 0;
  if(current >= 10) return alert("Max drones reached");
  const price = Math.floor(10 * Math.pow(2, current)); // 10,20,40...
  if(state.frags < price) return alert("Not enough FRAG");
  state.frags -= price;
  state.drones++;
  saveState(); render(); closePanel();
}
function buyFarm(){
  const price = 50;
  if(state.frags < price) return alert("Not enough FRAG");
  if(state.farmSize >= 7) return alert("Max farm size");
  state.frags -= price; state.farmSize++; while(state.farm.length < state.farmSize*state.farmSize) state.farm.push(makeEmptyTile());
  saveState(); render(); closePanel();
}
function openCase(){
  if(state.frags < 10) return alert("Not enough FRAG");
  state.frags -= 10;
  // random reward small demo logic
  const roll = Math.random();
  if(roll < 0.6) state.frags += 8;
  else if(roll < 0.9) { state.frags += 25; state.drones += 1; }
  else { state.frags += 60; state.level +=1; }
  saveState(); render(); closePanel();
}

// flash effect (simple)
function flashEffect(){
  const el = document.createElement("div");
  el.style.position = "fixed"; el.style.left = "50%"; el.style.top = "40%";
  el.style.transform = "translate(-50%,-50%)"; el.style.pointerEvents = "none";
  el.style.width = "160px"; el.style.height = "160px"; el.style.borderRadius = "50%";
  el.style.background = "radial-gradient(circle, rgba(100,170,255,0.28), transparent 40%)";
  el.style.zIndex = 9999; el.style.opacity = "0";
  document.body.appendChild(el);
  requestAnimationFrame(()=>{ el.style.transition = "all 420ms ease-out"; el.style.opacity = "1"; el.style.transform = "translate(-50%,-50%) scale(1.2)"; });
  setTimeout(()=>{ el.style.opacity = "0"; el.style.transform = "translate(-50%,-50%) scale(0.6)"; }, 420);
  setTimeout(()=> el.remove(), 900);
}

// cases: asset accessor
function ASSET(key){
  if(key === "caseClosed") return ASSETS.caseClosed || "cases/case_common_closed.jpg";
  if(key === "drone") return ASSETS.drone || "drones/drone_mk1.jpg";
  return "";
}

// canvas & drone simple animation
let droneObjs = [];
function resizeCanvas(){
  if(!droneCanvas) return;
  const rect = farmGrid.getBoundingClientRect();
  droneCanvas.width = rect.width; droneCanvas.height = rect.height;
  droneCanvas.style.left = rect.left + "px";
  droneCanvas.style.top = rect.top + "px";
}
function drawLoop(){
  if(!ctx) return;
  ctx.clearRect(0,0,droneCanvas.width, droneCanvas.height);
  // ensure drones
  while(droneObjs.length < (state.drones||0)) droneObjs.push({x:20+droneObjs.length*22,y:20,status:"idle",target:null});
  while(droneObjs.length > (state.drones||0)) droneObjs.pop();
  // simple float
  droneObjs.forEach((d,i)=>{
    d.y += Math.sin(Date.now()/400 + i)*0.2;
    // draw image small
    if(droneImg.complete){
      ctx.drawImage(droneImg, d.x, d.y, 32, 32);
    } else {
      // fallback circle
      ctx.fillStyle = "rgba(120,160,255,0.9)";
      ctx.beginPath(); ctx.arc(d.x, d.y, 8,0,Math.PI*2); ctx.fill();
    }
  });
  requestAnimationFrame(drawLoop);
}

// auto-grow checker
setInterval(()=>{
  let changed=false;
  state.farm.forEach(t=>{ if(t.status==="growing"){ if(now() - t.plantedAt >= growthMs(t.seed)) { t.status="grown"; changed=true; } } });
  if(changed){ saveState(); render(); }
}, 800);

// init
function bootstrap(){
  // ensure minimal farm
  if(!state.farm || state.farm.length === 0){
    state.farmSize = 3; state.farm = Array(9).fill().map(()=>makeEmptyTile());
    saveState();
  }
  // selected seed default
  if(!state.selectedSeed) state.selectedSeed="basic";
  render();
  drawLoop();
  window.addEventListener("resize", ()=>{ resizeCanvas(); });
}
bootstrap();

// expose small helpers for debug
window._state = state;
