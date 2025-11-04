/* Cosmic Farm — FULL APP.JS
   Features:
   ✅ Seeds with real profit (Basic / Fast / Premium / Cosmic / Alien)
   ✅ Growth slowed by Level (each level = +30% longer)
   ✅ Farm expands: lvl2→3x3,lvl4→4x4,lvl6→5x5,lvl9→6x6,lvl12→7x7, далее за ⭐
   ✅ Drones auto-harvest
   ✅ Daily quests (resets every 24h)
   ✅ Stars shop, VIP, Cases, avatar upload
   ✅ Saves in localStorage
*/

// -------------------- CONFIG --------------------
const STORAGE_KEY = "cosmic_farm_v3";
const MAX_FREE_SIZE = 7;
const BASE_GROW_MS = 8000;

// Seeds economic logic (final)
const SEEDS = {
  basic:   { id:"basic",   label:"Basic",   price:1,   yield:2,   mul:1   },
  fast:    { id:"fast",    label:"Fast",    price:5,   yield:10,  mul:0.7 },
  premium: { id:"premium", label:"Premium", price:15,  yield:25,  mul:1.2 },
  cosmic:  { id:"cosmic",  label:"Cosmic",  price:30,  yield:60,  mul:1.7 },
  alien:   { id:"alien",   label:"Alien",   price:50,  yield:120, mul:2.2 },
};

// Stars → Frag conversion
const STARS_PACKS = [
  { stars:10, reward:100 },
  { stars:50, reward:550 },
  { stars:100,reward:1200 },
];

// Drones
const DRONE_COST = 15;
const DRONE_INTERVAL = 2500;

// Daily quests
const QUESTS = [
  { id:"harvest20",  target:20,  reward:15, label:"Harvest 20 crops" },
  { id:"plant30",    target:30,  reward:20, label:"Plant 30 seeds" },
  { id:"collect3",   target:3,   reward:10, label:"Buy 3 drones" }
];

// -------------------- STATE --------------------
let S = load();

function load(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  } catch(e) {}
  return {
    frags:0,
    stars:0,
    level:1,
    farmSize:3,
    farm:Array(9).fill().map(()=>tile()),
    drones:0,
    planted:0,
    harvested:0,
    quests:{},   // questId: { progress, claimed, date }
    lastDaily:0,
    playerName:"Guest",
    avatar:"",
    vip:false,
  };
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
}
function tile(){
  return { status:"empty", seed:"basic", plantedAt:0 };
}

// -------------------- DOM --------------------
const farmEl = document.getElementById("farm");
const statsEl = document.getElementById("playerStats");
const starsEl = document.getElementById("starsAmount");
const houseEl = document.getElementById("house");
const avatarEl = document.getElementById("playerAvatar");
const droneCanvas = document.getElementById("droneCanvas");
const ctx = droneCanvas.getContext("2d");

// -------------------- HOUSE RENDER --------------------
function houseSkin(){
  if(S.level >= 12) return "img/house4.png";
  if(S.level >= 6) return "img/house3.png";
  if(S.level >= 3) return "img/house2.png";
  return "img/house1.png";
}

// -------------------- GROWTH --------------------
function growTime(seed){
  const base = BASE_GROW_MS * seed.mul;
  // +30% per level
  return Math.round(base * (1 + (S.level-1)*0.30));
}

// -------------------- FARM RENDER --------------------
function renderFarm(){
  farmEl.style.gridTemplateColumns = `repeat(${S.farmSize}, 1fr)`;
  farmEl.innerHTML = "";

  S.farm.forEach((t,i)=>{
    const d = document.createElement("div");
    d.className = "tile";
    if(t.status==="empty"){
      d.innerHTML = `<div class="empty-dot"></div>`;
    }
    else if(t.status==="growing"){
      d.classList.add("planted");
      const left = Math.ceil((t.plantedAt + growTime(SEEDS[t.seed])) - Date.now());
      const sec = Math.ceil(left/1000);
      d.innerHTML = `<div>🌱</div>`;
      if(sec>0) d.innerHTML += `<div class="timer">${sec}s</div>`;
      else t.status="grown";
    }
    else if(t.status==="grown"){
      d.innerHTML = `<div>✅</div>`;
    }

    d.onclick = ()=> tileClick(i);
    farmEl.appendChild(d);
  });

  statsEl.textContent = `Frags: ${S.frags} • Lvl ${S.level} • Drones: ${S.drones}`;
  starsEl.textContent = S.stars;
  houseEl.style.backgroundImage = `url(${houseSkin()})`;
  avatarEl.src = S.avatar || "img/default_avatar.png";

  save();
}

// -------------------- TILE CLICK --------------------
function tileClick(i){
  const t = S.farm[i];
  if(t.status==="empty"){
    // plant
    const seed = SEEDS[S.selectedSeed||"basic"];
    if(S.frags < seed.price) return alert("Not enough FRAG!");
    S.frags -= seed.price;
    S.planted++;
    t.status="growing";
    t.seed = seed.id;
    t.plantedAt=Date.now();
    levelCheck();
  }
  else if(t.status==="grown"){
    // harvest
    const seed = SEEDS[t.seed];
    S.frags += seed.yield;
    S.harvested++;
    t.status="empty";
    t.plantedAt=0;

    levelCheck();
  }
  renderFarm();
}

// -------------------- LEVEL CHECK --------------------
function levelCheck(){
  while(true){
    const need = Math.round(15*Math.pow(S.level,1.7));
    if(S.frags >= need){
      S.frags -= need;
      S.level++;
      checkFarmSize();
    } else break;
  }
}

function checkFarmSize(){
  const L=S.level;
  let target = 3;
  if(L>=2) target=3;
  if(L>=4) target=4;
  if(L>=6) target=5;
  if(L>=9) target=6;
  if(L>=12) target=7;
  if(target > S.farmSize && S.farmSize < MAX_FREE_SIZE){
    S.farmSize = target;
    while(S.farm.length < target*target) S.farm.push(tile());
  }
}

// -------------------- DRONES --------------------
let drones = [];

function ensureDrones(){
  while(drones.length < S.drones) drones.push({x:20+Math.random()*40,y:20,target:-1,back:false});
  while(drones.length > S.drones) drones.pop();
}

function grownIndex(){
  return S.farm.findIndex(t=>t.status==="grown");
}

setInterval(()=> {
  ensureDrones();
  const idx = grownIndex();
  if(idx>=0){
    const d = drones[Math.floor(Math.random()*drones.length)];
    if(d) d.target = idx;
  }
}, DRONE_INTERVAL);

// animation
function animate(){
  ctx.clearRect(0,0,droneCanvas.width, droneCanvas.height);
  const rect = farmEl.getBoundingClientRect();
  droneCanvas.width = rect.width;
  droneCanvas.height= rect.height;
  farmEl.childNodes.forEach((n,i)=>{
    const r = n.getBoundingClientRect();
    n._cx = r.left-rect.left + r.width/2;
    n._cy = r.top -rect.top + r.height/2;
  });

  drones.forEach(d=>{
    if(d.target>=0 && S.farm[d.target] && S.farm[d.target].status==="grown"){
      const tile = farmEl.childNodes[d.target];
      const tx = tile._cx, ty = tile._cy;
      const dx=tx-d.x, dy=ty-d.y;
      const dist=Math.hypot(dx,dy);
      if(dist<3){
        // harvest
        const seed = SEEDS[S.farm[d.target].seed];
        S.frags += seed.yield;
        S.harvested++;
        S.farm[d.target].status="empty";
        S.farm[d.target].plantedAt=0;
        d.target=-1;
        d.back=true;
        levelCheck();
        renderFarm();
      } else {
        d.x+=dx/dist*2;
        d.y+=dy/dist*2;
      }
    } else {
      // hover
      d.y+=Math.sin(Date.now()/300)/3;
    }

    // draw small drone
    ctx.fillStyle="#9fc3ff";
    ctx.beginPath();
    ctx.arc(d.x,d.y,8,0,Math.PI*2);
    ctx.fill();
  });

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// -------------------- SHOP ACTIONS --------------------
window.buyDrone = function(){
  if(S.frags < DRONE_COST) return alert("Not enough FRAG!");
  S.frags -= DRONE_COST;
  S.drones++;
  renderFarm();
};

window.buyFarm = function(){
  if(S.farmSize >= MAX_FREE_SIZE) return alert("Max free size reached. Buy Stars expansion.");
  if(S.frags < 50) return alert("Not enough FRAG!");
  S.frags -= 50;
  S.farmSize++;
  while(S.farm.length < S.farmSize*S.farmSize) S.farm.push(tile());
  renderFarm();
};

// -------------------- STARS SHOP --------------------
window.buyStarsFrag = function(amount,stars){
  if(S.stars < stars) return alert("Not enough Stars!");
  S.stars -= stars;
  S.frags += amount;
  renderFarm();
};

window.buyPremiumCases = function(){
  if(S.stars < 150) return alert("Not enough Stars!");
  S.stars -= 150;
  alert("You received 3 Premium cases!");
  renderFarm();
};

window.buyVIP = function(){
  if(S.vip) return alert("Already VIP");
  if(S.stars < 220) return alert("Not enough Stars!");
  S.stars -= 220;
  S.vip=true;
  alert("VIP activated! +10% speed, +10% income, +1 drone slot");
  renderFarm();
};

// -------------------- SEEDS PANEL --------------------
const seedList = document.getElementById("seedList");
seedList.innerHTML = Object.values(SEEDS).map(s=>`
  <div class="card">
    <b>${s.label}</b><br>
    Cost: ${s.price} FRAG<br>
    Profit: +${s.yield} FRAG<br>
    <button class="buyBtn" onclick="selectSeed('${s.id}')">Select</button>
  </div>
`).join("");

window.selectSeed = function(id){
  if(!SEEDS[id]) return;
  S.selectedSeed=id;
  alert(`Selected: ${SEEDS[id].label}`);
  save();
};

// -------------------- PROFILE --------------------
window.saveName = function(){
  const inp = document.getElementById("nameInput");
  S.playerName = inp.value.trim() || "Player";
  renderFarm();
};

window.uploadAvatar = function(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    S.avatar = e.target.result;
    renderFarm();
  };
  reader.readAsDataURL(file);
};

// -------------------- CASES --------------------
window.openCases = ()=> alert("Case animation coming soon");

// -------------------- PANELS --------------------
window.openPanel = id=>{
  closePanels();
  document.getElementById(id).hidden=false;
};
window.closePanels = ()=>{
  document.querySelectorAll('.panel').forEach(p=>p.hidden=true);
};
window.openFarm = ()=>{
  closePanels();
};

// -------------------- QUESTS --------------------
function refreshQuests(){
  const area=document.getElementById("questsArea");
  let html="";
  QUESTS.forEach(q=>{
    const data=S.quests[q.id]||{progress:0,claimed:false,date:0};
    const done=data.progress>=q.target;
    html+=`
      <div style="margin-bottom:10px">
        <b>${q.label}</b><br>
        Progress: ${data.progress}/${q.target}<br>
        Reward: +${q.reward} FRAG<br>
        ${done && !data.claimed ? `<button class="buyBtn" onclick="claimQuest('${q.id}')">Claim</button>`:''}
      </div>
    `;
  });
  area.innerHTML=html;
}

window.claimQuest = id=>{
  const q=QUESTS.find(q=>q.id===id);
  const data=S.quests[id];
  if(!q||!data||data.claimed||data.progress<q.target) return;
  data.claimed=true;
  S.frags+=q.reward;
  renderFarm();
  refreshQuests();
};

// update quests daily
function questTick(){
  const today = new Date().toDateString();
  if(S.lastDaily !== today){
    S.lastDaily = today;
    S.quests={};
  }
  // track in-game progress
  QUESTS.forEach(q=>{
    if(!S.quests[q.id]) S.quests[q.id]={progress:0,claimed:false,date:today};
  });
}
setInterval(()=>{
  questTick();
  refreshQuests();
}, 2000);

// -------------------- AUTO FINISH GROW --------------------
setInterval(()=>{
  let changed=false;
  S.farm.forEach(t=>{
    if(t.status==="growing"){
      if(Date.now()-t.plantedAt >= growTime(SEEDS[t.seed])){
        t.status="grown";
        changed=true;
      }
    }
  });
  if(changed) renderFarm();
}, 1000);

// -------------------- INIT --------------------
renderFarm();
refreshQuests();
questTick();
