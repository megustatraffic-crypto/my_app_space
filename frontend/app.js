// Cosmic Farm – Final Stable Frontend
// ✅ адаптивно
// ✅ посадка/сбор без багов
// ✅ дроны с анимацией
// ✅ магазин, квесты, профиль
// ✅ сезонная система
// ✅ автосохранение в localStorage
// ✅ красиво на телефоне (Telegram WebApp)

const STORAGE_KEY = "cosmic_farm_v3";
const BASE_GROW_MS = 6500;
const MAX_FARM = 7;

const SEEDS = {
  basic:   { id:"basic",   price:0,  mul:1,   yield:1 },
  fast:    { id:"fast",    price:5,  mul:0.6, yield:1 },
  premium: { id:"premium", price:15, mul:1.4, yield:2 }
};

let state = loadState();

// DOM
const farmEl = document.getElementById("farm");
const statsEl = document.getElementById("playerStats");
const houseEl = document.getElementById("house");
const canvas = document.getElementById("droneCanvas");
const ctx = canvas.getContext("2d");

// Panels
const P = {
  shop: document.getElementById("panelShop"),
  drones: document.getElementById("panelDrones"),
  quests: document.getElementById("panelQuests"),
  profile: document.getElementById("panelProfile"),
};
const questEl = document.getElementById("questHarvest");

// ------------ Load / Save ------------
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const s = JSON.parse(raw);
      s.farm = s.farm || [];
      s.farmSize = s.farmSize || 3;
      s.level = s.level || 1;
      s.frags = s.frags || 0;
      s.drones = s.drones || 0;
      s.selectedSeed = s.selectedSeed || "basic";
      s.quests = s.quests || { harvested:0, bought:0 };
      s.season = s.season || { start: Date.now(), harvested:0 };
      while(s.farm.length < s.farmSize*s.farmSize) s.farm.push(emptyTile());
      return s;
    }
  }catch(e){}
  return {
    frags: 0,
    level: 1,
    farmSize: 3,
    farm: Array(9).fill().map(emptyTile),
    drones: 0,
    selectedSeed:"basic",
    quests:{ harvested:0, bought:0 },
    season:{ start: Date.now(), harvested:0 }
  };
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emptyTile(){
  return { status:"empty", seed:"basic", planted:0 };
}

// growth time
function growTime(seed){
  const s = SEEDS[seed] || SEEDS.basic;
  const levelFactor = Math.max(0.7, 1-(state.level-1)*0.03);
  return Math.max(1200, Math.floor(BASE_GROW_MS * s.mul * levelFactor));
}

// ------------ Render ------------
function render(){
  farmEl.style.gridTemplateColumns = `repeat(${state.farmSize},1fr)`;
  farmEl.innerHTML = "";

  state.farm.forEach((t,i)=>{
    const el = document.createElement("div");
    el.className = "tile";

    if(t.status==="empty"){
      el.innerHTML = "";
    } else if(t.status==="growing"){
      el.classList.add("planted");
      const left = Math.ceil((t.planted + growTime(t.seed) - Date.now())/1000);
      el.innerHTML = left>0 ? `🌱<div class="timer">${left}s</div>` : "🌱";
      if(left<=0){
        t.status="grown";
      }
    } else if(t.status==="grown"){
      el.innerHTML = "✅";
    }

    el.onclick = ()=> tileClick(i);
    farmEl.appendChild(el);
  });

  statsEl.textContent =
    `Frags: ${state.frags} | Level: ${state.level} | Drones: ${state.drones}`;

  renderHouse();
  updateQuests();
  resizeCanvas();
  save();
}

function renderHouse(){
  let img="img/house1.png";
  if(state.level>=3) img="img/house2.png";
  if(state.level>=6) img="img/house3.png";
  if(state.level>=10) img="img/house4.png";
  houseEl.style.backgroundImage = `url(${img})`;
}

// ------------ Game Logic ------------
function tileClick(i){
  const t = state.farm[i];
  if(t.status==="empty"){
    // plant
    const seed = SEEDS[state.selectedSeed] || SEEDS.basic;
    if(seed.price>0 && state.frags < seed.price) return;
    if(seed.price>0) state.frags -= seed.price;
    t.status="growing";
    t.seed=state.selectedSeed;
    t.planted=Date.now();
  } else if(t.status==="grown"){
    harvestTile(t);
  }
  render();
}

function harvestTile(t){
  const s = SEEDS[t.seed] || SEEDS.basic;
  state.frags += s.yield;
  state.quests.harvested += s.yield;
  state.season.harvested += s.yield;
  t.status="empty";
  levelCheck();
}

// Level & Farm size
function levelCheck(){
  const need = Math.floor(10*Math.pow(state.level,1.6));
  if(state.frags >= need){
    state.frags -= need;
    state.level++;
    if(state.farmSize < MAX_FARM && state.level%2===0){
      state.farmSize++;
      while(state.farm.length < state.farmSize*state.farmSize)
        state.farm.push(emptyTile());
    }
  }
}

// ------------ Shop ------------
window.buyDrone = function(){
  if(state.frags<10) return alert("Not enough FRAG");
  state.frags-=10;
  state.drones++;
  state.quests.bought++;
  alert("Drone purchased!");
  render();
};
window.buyFarm = function(){
  if(state.frags<50) return alert("Not enough FRAG");
  if(state.farmSize>=MAX_FARM) return alert("Max size");
  state.frags-=50;
  state.farmSize++;
  while(state.farm.length < state.farmSize*state.farmSize)
    state.farm.push(emptyTile());
  alert("Farm expanded!");
  render();
};
window.buySeed = function(id){
  const s = SEEDS[id];
  if(!s) return;
  if(s.price>0 && state.frags<s.price) return alert("Not enough");
  if(s.price>0) state.frags-=s.price;
  state.selectedSeed=id;
  alert("Selected "+s.id);
  render();
};

// ------------ Quests ------------
function updateQuests(){
  questEl.innerHTML = `
    <b>Harvest 5</b><br>
    ${state.quests.harvested}/5
    ${(state.quests.harvested>=5)? `<button onclick="claimHarvest()">Claim</button>`:''}
    <hr>
    <b>Buy 1 drone</b><br>
    ${state.quests.bought}/1
    ${(state.quests.bought>=1)? `<button onclick="claimDrone()">Claim</button>`:''}
  `;
}
window.claimHarvest = function(){
  if(state.quests.harvested<5) return;
  state.quests.harvested-=5;
  state.frags+=5;
  alert("Reward +5");
  render();
};
window.claimDrone = function(){
  if(state.quests.bought<1) return;
  state.quests.bought-=1;
  state.frags+=10;
  alert("Reward +10");
  render();
};

// ------------ Panels ------------
window.openPanel = id=>{
  hidePanels();
  P[id.substring(5).toLowerCase()]?.classList.add("open");
};
window.closePanels = hidePanels;
function hidePanels(){
  Object.values(P).forEach(p=>p.classList.remove("open"));
}
window.openFarm = hidePanels;

// ------------ Profile ------------
window.saveName = ()=>{
  const x=document.getElementById("nameInput").value || "Player";
  state.playerName=x;
  document.getElementById("playerName").textContent=x;
  hidePanels();
  save();
};

// ------------ Drone Animation ------------
let dronesArr=[];
function syncDrones(){
  while(dronesArr.length<state.drones)
    dronesArr.push({x:15+dronesArr.length*25,y:20,target:null,mode:"idle"});
  while(dronesArr.length>state.drones)
    dronesArr.pop();
}

function resizeCanvas(){
  const r=farmEl.getBoundingClientRect();
  canvas.width=r.width;
  canvas.height=r.height;
  canvas.style.left=r.left+"px";
  canvas.style.top=r.top+"px";
}

function grownIndex(){
  return state.farm.findIndex(t=>t.status==="grown");
}

function animate(time){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const rect=farmEl.getBoundingClientRect();
  const size=state.farmSize;
  const w=rect.width/size;
  const h=rect.height/size;

  dronesArr.forEach((d,i)=>{
    if(d.mode==="idle"){
      const idx=grownIndex();
      if(idx>=0){ d.target=idx; d.mode="go"; }
    } else if(d.mode==="go" && d.target!=null){
      const r=Math.floor(d.target/size);
      const c=d.target%size;
      const tx=c*w+w/2, ty=r*h+h/2;
      const dx=tx-d.x, dy=ty-d.y;
      const dist=Math.hypot(dx,dy);
      const step=0.2*(time-(_lastTime||time));
      if(dist<=step){
        d.x=tx; d.y=ty;
        // harvest auto
        if(state.farm[d.target].status==="grown"){
          harvestTile(state.farm[d.target]);
          save();
        }
        d.mode="back"; d.target=null;
      } else {
        d.x+=dx/dist*step;
        d.y+=dy/dist*step;
      }
    } else if(d.mode==="back"){
      const bx=15+i*25, by=20;
      const dx=bx-d.x, dy=by-d.y;
      const dist=Math.hypot(dx,dy);
      const step=0.2*(time-(_lastTime||time));
      if(dist<=step){ d.x=bx; d.y=by; d.mode="idle"; }
      else{ d.x+=dx/dist*step; d.y+=dy/dist*step; }
    }

    // draw drone
    ctx.save();
    ctx.translate(d.x,d.y);
    ctx.fillStyle="#cfe6ff";
    ctx.fillRect(-5,-3,10,6);
    ctx.restore();
  });

  _lastTime=time;
  requestAnimationFrame(animate);
}
let _lastTime=0;

// ------------ Timers ------------
setInterval(()=>{
  let changed=false;
  state.farm.forEach(t=>{
    if(t.status==="growing" && Date.now()-t.planted>=growTime(t.seed)){
      t.status="grown";
      changed=true;
    }
  });
  if(changed) render();
},800);

// new season every 1 day
setInterval(()=>{
  const D=24*3600*1000;
  if(Date.now()-state.season.start >= D){
    const bonus=Math.floor(state.season.harvested/5);
    state.frags+=bonus;
    state.season={ start:Date.now(), harvested:0 };
    alert(`New season! +${bonus} FRAG`);
    render();
  }
},5000);

// ------------ Init ------------
syncDrones();
render();
resizeCanvas();
requestAnimationFrame(animate);
window.addEventListener("resize",()=>{ resizeCanvas(); render(); });
setInterval(syncDrones,2000);
