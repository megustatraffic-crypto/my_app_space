// ---------- CONFIG ----------
const TILES_COUNT = 15;
const DRONE_ANIM_IMG = "https://i.imgur.com/s9QGZpR.png"; // временно, можно заменить

// ---------- STATE ----------
let USER_ID = null;
let state = {
  user_id: null,
  frags: 0,
  level: 1,
  drones: 0,
  farm: Array(TILES_COUNT).fill({status:"empty"}),
  quests: {
    harvest5: { progress:0, goal:5, reward:5, claimed:false },
    buydrone: { progress:0, goal:1, reward:10, claimed:false }
  },
  profile: { name: "Guest", avatar: "" },
  season: "Aurora"
};

// ---------- ELEMENTS ----------
const EL = {
  frags_count: document.getElementById("frags_count"),
  farm_level: document.getElementById("farm_level"),
  drone_count: document.getElementById("drone_count"),
  farm_grid: document.getElementById("farm_grid"),
  farm_visual: document.getElementById("farm_visual"),
  shop_list: document.getElementById("shop_list"),
  drones_area: document.getElementById("drones_area"),
  quests_list: document.getElementById("quests_list"),
  profile_name: document.getElementById("profile_name"),
  profile_frags: document.getElementById("profile_frags"),
  profile_level: document.getElementById("profile_level"),
  profile_avatar: document.getElementById("profile_avatar"),
  input_avatar: document.getElementById("input_avatar"),
  input_name: document.getElementById("input_name"),
  mini_avatar: document.getElementById("mini_avatar"),
  mini_info: document.getElementById("mini_info"),
  season_label: document.getElementById("season_label"),
  drone_layer: document.getElementById("drone_layer"),
  leaders_list: document.getElementById("leaders_list")
};

// ---------- HELPERS ----------
function saveLocal(){ try{ localStorage.setItem("cf_state_"+state.user_id, JSON.stringify(state)); }catch(e){} }
function loadLocal(uid){
  try { const s = localStorage.getItem("cf_state_"+uid); return s ? JSON.parse(s) : null; } catch(e){ return null; }
}
function now(){ return Date.now(); }

// ---------- IDENTIFY USER ----------
function identify(){
  try {
    if(window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user){
      USER_ID = String(Telegram.WebApp.initDataUnsafe.user.id);
      state.user_id = USER_ID;
      state.profile.name = Telegram.WebApp.initDataUnsafe.user.first_name || state.profile.name;
    } else {
      USER_ID = localStorage.getItem("cf_guest_id");
      if(!USER_ID){ USER_ID = "guest_"+Math.floor(Math.random()*9999999); localStorage.setItem("cf_guest_id", USER_ID); }
      state.user_id = USER_ID;
    }
  } catch(e){
    USER_ID = localStorage.getItem("cf_guest_id") || ("guest_"+Math.floor(Math.random()*9999999));
    state.user_id = USER_ID;
  }
}

// ---------- SEASON ----------
function updateSeason(){
  const seasons = ["Aurora","Solaris","Nebula","Meteor","Quantum"];
  const day = Math.floor(Date.now()/1000/60/60/24);
  state.season = seasons[day % seasons.length];
  EL.season_label.innerText = state.season;
}

// ---------- GROW TIME BY SEASON/LEVEL ----------
function getGrowMs(){
  let base = 4000;
  if(state.season === "Solaris") base = 3000;
  if(state.season === "Nebula") base = 4500;
  // level speeds up growth slightly
  base = Math.max(800, base - (state.level - 1) * 250);
  return base;
}

// ---------- LOAD / SAVE (backend first, fallback local) ----------
async function loadState(){
  identify();
  const local = loadLocal(state.user_id);
  try{
    const res = await apiGetState(state.user_id);
    if(res && res.ok && res.user){
      Object.assign(state, res.user);
    } else if(local){
      Object.assign(state, local);
    } else {
      // defaults
      state.user_id = state.user_id;
      state.frags = state.frags || 0;
      state.level = state.level || 1;
      state.drones = state.drones || 0;
      state.farm = state.farm && state.farm.length===TILES_COUNT ? state.farm : Array(TILES_COUNT).fill({status:"empty"});
    }
  }catch(e){
    if(local) Object.assign(state, local);
  }
  applyProfileUI();
  renderAll();
  startDroneInterval();
}

// save to backend and local (fire-and-forget)
async function saveState(){
  saveLocal();
  try{ await apiSave({ user_id: state.user_id, frags: state.frags, level: state.level, drones: state.drones, farm: state.farm, profile: state.profile, quests: state.quests }); }catch(e){}
}

// ---------- RENDER FARM ----------
function renderFarm(){
  EL.farm_grid.innerHTML = "";
  state.farm.forEach((tile,i)=>{
    const div = document.createElement("div");
    div.className = "tile";
    if(tile.status === "empty") div.innerText = "•";
    else if(tile.status === "growing"){
      div.classList.add("grow");
      const sec = Math.max(0, Math.ceil((tile.readyAt - now())/1000));
      div.innerHTML = "🌱<div class='timer'>"+sec+"s</div>";
      if(sec <= 0){
        state.farm[i] = { status:"grown" };
        saveState();
        renderFarm();
        return;
      }
    } else if(tile.status === "grown"){ div.innerText = "✅"; }
    div.onclick = ()=> onTileClick(i);
    EL.farm_grid.appendChild(div);
  });

  EL.frags_count.innerText = state.frags;
  EL.farm_level.innerText = state.level;
  EL.drone_count.innerText = state.drones;
  EL.farm_visual.innerText = getFarmVisual(state.level);
}

function getFarmVisual(level){
  const map = {
    1:"Rusty orbital plot - small hydroponics.",
    2:"Glass dome - improved yields.",
    3:"Automated terraces - faster growth.",
    4:"Solar greenhouse - premium output.",
    5:"Orbital biodome - legendary crops."
  };
  return map[level] || map[1];
}

// ---------- TILE ACTIONS ----------
function onTileClick(i){
  const t = state.farm[i];
  if(t.status === "empty"){
    state.farm[i] = { status:"growing", readyAt: now() + getGrowMs() };
    renderFarm(); saveState();
  } else if(t.status === "grown"){
    state.frags++;
    state.farm[i] = { status:"empty" };
    animateHarvest(i);
    updateQuestProgress("harvest5");
    renderFarm(); saveState();
  }
}

// ---------- ANIMATIONS ----------
function animateHarvest(i){
  const tile = EL.farm_grid.children[i];
  if(!tile) return;
  tile.classList.add("harvest-anim");
  setTimeout(()=> tile.classList.remove("harvest-anim"), 300);
}

function spawnDroneAnim(x,y){
  const d = document.createElement("div");
  d.className = "drone";
  d.style.left = (x-18)+"px"; d.style.top = (y-18)+"px";
  d.style.backgroundImage = `url(${DRONE_ANIM_IMG})`;
  EL.drone_layer.appendChild(d);
  setTimeout(()=> d.remove(), 2800);
}

// simple positioning for tile -> get coordinates
function spawnDroneForTile(tileIndex){
  const gridRect = EL.farm_grid.getBoundingClientRect();
  const tiles = EL.farm_grid.children;
  if(!tiles || !tiles[tileIndex]) return;
  const r = tiles[tileIndex].getBoundingClientRect();
  spawnDroneAnim(r.left - gridRect.left + 20, r.top - gridRect.top + 20);
}

// ---------- DRONES: auto-harvest ----------
let DRONE_INTERVAL_ID = null;
function startDroneInterval(){
  if(DRONE_INTERVAL_ID) clearInterval(DRONE_INTERVAL_ID);
  DRONE_INTERVAL_ID = setInterval(()=>{
    if(state.drones <= 0) return;
    for(let i=0;i<state.farm.length;i++){
      if(state.farm[i] && state.farm[i].status === "grown"){
        state.frags++;
        if(state.farm[i].status === "grown"){ spawnDroneForTile(i); }
        state.farm[i] = { status:"empty" };
        updateQuestProgress("harvest5");
      }
    }
    renderFarm(); saveState();
  }, 3000);
}

// ---------- SHOP ----------
const SHOP_ITEMS = [
  { id:"seed_basic", name:"Basic Seed (plant)", price:0, desc:"Plant on empty tile" },
  { id:"drone_1", name:"Drone Mk.I", price:10, desc:"Auto-harvest every few seconds", drone:true },
  { id:"farm_up", name:"Upgrade Farm +1", price:20, desc:"Increase farm level by 1" }
];

function renderShop(){
  EL.shop_list.innerHTML = "";
  SHOP_ITEMS.forEach(it=>{
    const box = document.createElement("div"); box.className="item";
    box.innerHTML = `<b>${it.name}</b><br>${it.desc}<br>Price: ${it.price} FRAG`;
    const btn = document.createElement("button"); btn.className="small"; btn.innerText="Buy";
    btn.onclick = async ()=>{
      if(state.frags < it.price){ alert("Not enough Frags"); return; }
      state.frags -= it.price;
      if(it.drone){ state.drones++; updateQuestProgress("buydrone"); }
      if(it.id === "farm_up"){ state.level = Math.min(5, state.level + 1); }
      renderAll(); saveState();
      // attempt backend shop call (optional)
      try{ await apiShopBuy({ user_id: state.user_id, itemId: it.id }); }catch(e){}
    };
    box.appendChild(btn);
    EL.shop_list.appendChild(box);
  });
}

// ---------- QUESTS ----------
function updateQuestProgress(key){
  if(!state.quests[key]) return;
  state.quests[key].progress = Math.min(state.quests[key].goal, (state.quests[key].progress || 0) + 1);
  if(state.quests[key].progress >= state.quests[key].goal && !state.quests[key].claimed){
    // auto notify, let user claim from UI
  }
  renderQuests();
  saveState();
}

function renderQuests(){
  EL.quests_list.innerHTML = "";
  Object.keys(state.quests).forEach(k=>{
    const q = state.quests[k];
    const d = document.createElement("div"); d.className="item";
    d.innerHTML = `<b>${q.goal}x ${k}</b><br>Progress: ${q.progress||0}/${q.goal}<br>Reward: ${q.reward} FRAG`;
    const btn = document.createElement("button"); btn.className="small";
    if(q.progress >= q.goal && !q.claimed){ btn.innerText="Claim"; btn.onclick = ()=>{ state.frags += q.reward; q.claimed = true; renderAll(); saveState(); }; }
    else if(q.claimed){ btn.innerText = "✅ Claimed"; btn.disabled = true; }
    else { btn.innerText = "Incomplete"; btn.disabled = true; }
    d.appendChild(btn);
    EL.quests_list.appendChild(d);
  });
}

// ---------- PROFILE ----------
function applyProfileUI(){
  EL.profile_name.innerText = state.profile.name || "Guest";
  EL.profile_frags.innerText = state.frags;
  EL.profile_level.innerText = state.level;
  if(state.profile.avatar){
    EL.profile_avatar.src = state.profile.avatar; EL.profile_avatar.classList.remove("hidden");
    EL.mini_avatar.src = state.profile.avatar; EL.mini_avatar.classList.remove("hidden");
  } else { EL.profile_avatar.classList.add("hidden"); EL.mini_avatar.classList.add("hidden"); }
  EL.mini_info.innerText = state.profile.name || ("u"+state.user_id.slice(0,4));
}
document.getElementById("btn_save_profile").onclick = ()=>{ state.profile.avatar = EL.input_avatar.value.trim(); state.profile.name = EL.input_name.value.trim() || state.profile.name; applyProfileUI(); saveState(); };
document.getElementById("btn_reset").onclick = ()=>{ if(confirm("Reset progress?")){ localStorage.removeItem("cf_state_"+state.user_id); location.reload(); } };

// ---------- LEADERS ----------
async function renderLeaders(){
  EL.leaders_list.innerHTML = "<div class='muted'>Loading...</div>";
  try{
    const res = await apiLeaders();
    if(res && res.ok && Array.isArray(res.leaders)){
      EL.leaders_list.innerHTML = "";
      res.leaders.forEach(l=>{
        const d = document.createElement("div"); d.className="item"; d.innerText = `${l.name||l.user_id} — ${l.frags||0} FRAG`; EL.leaders_list.appendChild(d);
      });
      return;
    }
  }catch(e){}
  // fallback: local snapshot
  const arr=[];
  for(let k in localStorage){
    if(k.indexOf("cf_state_")===0){
      try{ const obj = JSON.parse(localStorage.getItem(k)); arr.push({ name: obj.profile?.name||k, frags: obj.frags||0 }); }catch(e){}
    }
  }
  arr.sort((a,b)=>b.frags-a.frags);
  EL.leaders_list.innerHTML = "";
  arr.slice(0,20).forEach(p=>{ const d = document.createElement("div"); d.className='item'; d.innerText = `${p.name} — ${p.frags} FRAG`; EL.leaders_list.appendChild(d); });
}

// ---------- UI SWITCH ----------
document.querySelectorAll(".menu-btn").forEach(btn=>{
  btn.addEventListener("click", (ev)=>{
    const p = btn.dataset.panel;
    document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
    document.getElementById("panel_"+p).classList.add("active");
    renderAll();
  });
});

// ---------- RENDER ALL ----------
function renderAll(){
  updateSeason();
  renderFarm(); renderShop(); renderQuests(); applyProfileUI(); renderLeaders();
}

// ---------- DRONE SPAWN UTIL ----------
function spawnDroneAtTile(i){
  const tiles = EL.farm_grid.children;
  if(!tiles || !tiles[i]) return;
  const r = tiles[i].getBoundingClientRect();
  const gridR = EL.farm_grid.getBoundingClientRect();
  const x = r.left - gridR.left + (r.width/2);
  const y = r.top - gridR.top + (r.height/2);
  spawnDroneAnim(x,y);
}

// ---------- INIT ----------
identify(); updateSeason();
(async ()=>{ await loadState(); renderAll(); startDroneInterval(); setInterval(()=>{ renderAll(); },1000); })();
