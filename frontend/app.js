/* app.js — main logic: farm, shop, drones, quests, profile, leaders.
   Uses api.js wrappers with fallback to localStorage when backend fails.
*/

(function(){
  // identify user (prefer Telegram initDataUnsafe)
  var user_id = null;
  try {
    if(window.TG && TG.initDataUnsafe && TG.initDataUnsafe.user && TG.initDataUnsafe.user.id){
      user_id = String(TG.initDataUnsafe.user.id);
    }
  } catch(e){}
  if(!user_id){
    user_id = localStorage.getItem("cf_guest_id");
    if(!user_id){ user_id = "guest_" + Math.floor(Math.random()*9999999); localStorage.setItem("cf_guest_id", user_id); }
  }

  // state
  var state = {
    user_id: user_id,
    frags: 0,
    farm: Array(9).fill("empty"),
    inventory: [],
    profile: { name: "Guest", avatar: "" },
    level: 1,
    drones: [] // each drone: {id, speedSec}
  };

  // DOM references
  var el = {
    frags: document.getElementById("frags_count"),
    farmGrid: document.getElementById("farm_grid"),
    farmVisual: document.getElementById("farm_visual"),
    shopList: document.getElementById("shop_list"),
    dronesArea: document.getElementById("drones_area"),
    questsList: document.getElementById("quests_list"),
    profileName: document.getElementById("profile_name"),
    profileFrags: document.getElementById("profile_frags"),
    profileLevel: document.getElementById("profile_level"),
    profileAvatar: document.getElementById("profile_avatar"),
    inputAvatar: document.getElementById("input_avatar"),
    inputName: document.getElementById("input_name"),
    leadersList: document.getElementById("leaders_list"),
    miniAvatar: document.getElementById("mini_avatar"),
    miniInfo: document.getElementById("mini_info")
  };

  // menu nav
  document.querySelectorAll(".menu-btn").forEach(function(btn){
    btn.addEventListener("click", function(){ var p = btn.getAttribute("data-panel"); openPanel(p); });
  });

  function hideAllPanels(){ document.querySelectorAll(".panel").forEach(p=>p.classList.add("hidden")); }
  window.openPanel = function(name){
    hideAllPanels();
    var elp = document.getElementById("panel_" + name);
    if(elp) elp.classList.remove("hidden");
    if(name === "farm") renderFarm();
    if(name === "shop") renderShop();
    if(name === "drones") renderDrones();
    if(name === "quests") renderQuests();
    if(name === "profile") renderProfile();
    if(name === "leaders") renderLeaders();
  };

  // load from backend (or fallback local)
  function loadState(){
    api_get_state(state.user_id).then(function(resp){
      if(resp && resp.ok){
        state.frags = resp.frags || 0;
        state.farm = Array.isArray(resp.farm) && resp.farm.length===9 ? resp.farm : Array(9).fill("empty");
        state.inventory = resp.inventory || [];
        if(resp.profile) state.profile = resp.profile;
        if(resp.level) state.level = resp.level || 1;
        if(resp.drones) state.drones = resp.drones || [];
      } else {
        // local fallback
        var local = localStorage.getItem("cf_state_" + state.user_id);
        if(local){
          try { var obj = JSON.parse(local); Object.assign(state, obj); }
          catch(e){ /* ignore */ }
        }
      }
      applyProfileToUI();
      openPanel("farm");
      startDroneLoop();
    }).catch(function(){
      var local = localStorage.getItem("cf_state_" + state.user_id);
      if(local){ try { var obj = JSON.parse(local); Object.assign(state, obj); } catch(e){} }
      applyProfileToUI();
      openPanel("farm");
      startDroneLoop();
    });
  }

  // save to backend (and local)
  function saveState(){
    // local copy
    try { localStorage.setItem("cf_state_" + state.user_id, JSON.stringify(state)); } catch(e){}
    // backend
    api_save_state({
      user_id: state.user_id,
      frags: state.frags,
      farm: state.farm,
      inventory: state.inventory,
      profile: state.profile,
      level: state.level,
      drones: state.drones
    }).then(function(resp){ /* ok */ }).catch(function(){ /* ignore */ });
    applyProfileToUI();
  }

  // FARM functions
  function renderFarm(){
    el.frags.innerText = state.frags;
    document.getElementById("farm_level").innerText = state.level;
    // visual by level
    el.farmVisual.innerText = getFarmVisualText(state.level);
    // grid
    el.farmGrid.innerHTML = "";
    state.farm.forEach(function(s, i){
      var d = document.createElement("div"); d.className = "tile";
      if(s==="empty") d.innerText = "Empty";
      else if(s==="growing") d.innerText = "🌱";
      else if(s==="grown") d.innerText = "✅";
      d.addEventListener("click", function(){ onTileClick(i); });
      el.farmGrid.appendChild(d);
    });
  }
  function getFarmVisualText(level){
    // different descriptions / visuals per level
    var maps = {
      1: "Rusty orbital plot — small hydroponics.",
      2: "Upgraded glass dome — better sunlight capture.",
      3: "Automated terraces — faster growth.",
      4: "Solar greenhouse — premium yields.",
      5: "Orbital biodome — legendary crops."
    };
    return maps[state.level] || maps[1];
  }
  function onTileClick(i){
    if(state.farm[i] === "empty"){
      // planting cost maybe free
      state.farm[i] = "growing";
      renderFarm();
      setTimeout(function(){
        state.farm[i] = "grown";
        renderFarm();
        saveState();
      }, getGrowTimeMs());
      saveState();
    } else if(state.farm[i] === "grown"){
      state.frags += 1;
      state.farm[i] = "empty";
      renderFarm();
      saveState();
    } else {
      // growing
      // optionally show time remaining — not implemented now
    }
  }
  function getGrowTimeMs(){
    // base 3000ms, faster if boosters/inventory (future)
    var base = 3000;
    // if level increases, growth faster:
    var factor = Math.max(1, 1 - (state.level - 1) * 0.08);
    return Math.round(base * factor);
  }

  // SHOP
  var SHOP_ITEMS = [
    { id:"seed_basic", name:"Basic Seed", price:3, desc:"Standard seed" },
    { id:"seed_fast",  name:"Fast Seed",  price:8, desc:"Grows 2x faster (applies to next plant)" },
    { id:"drone_1",   name:"Drone Mk.I",  price:30, desc:"Auto-harvests every 10s", drone:true, speed:10 },
    { id:"farm_upgrade", name:"Upgrade Farm", price:100, desc:"Increase farm level (+1)" }
  ];
  function renderShop(){
    el.shopList.innerHTML = "";
    SHOP_ITEMS.forEach(function(it){
      var box = document.createElement("div"); box.className = "item";
      box.innerHTML = "<b>"+it.name+"</b> — "+it.price+" FRAG<br><small>"+it.desc+"</small><br>";
      var btn = document.createElement("button"); btn.className = "small"; btn.innerText = "Buy";
      btn.addEventListener("click", function(){ buyItem(it); });
      box.appendChild(btn);
      el.shopList.appendChild(box);
    });
  }
  function buyItem(it){
    if(state.frags < it.price){ alert("Not enough Frags"); return; }
    state.frags -= it.price;
    if(it.drone){
      var id = "dr_"+Date.now();
      state.drones.push({ id:id, speedSec: it.speed });
      alert("Drone bought: " + it.name);
    } else if(it.id === "farm_upgrade"){
      state.level = Math.min(5, state.level + 1);
      alert("Farm upgraded to level " + state.level);
    } else {
      state.inventory.push(it.id);
      alert("Bought: " + it.name);
    }
    saveState();
    renderFarm();
    renderDrones();
    renderShop();
  }

  // DRONES (auto-harvest)
  var droneTimers = {};
  function startDroneLoop(){
    // clear old timers
    Object.keys(droneTimers).forEach(k=>{ clearInterval(droneTimers[k]); });
    droneTimers = {};
    state.drones.forEach(function(d){
      if(droneTimers[d.id]) return;
      droneTimers[d.id] = setInterval(function(){ droneHarvest(d); }, Math.max(3000, d.speedSec*1000));
    });
  }
  function droneHarvest(drone){
    // find first grown crop and harvest
    var idx = state.farm.indexOf("grown");
    if(idx >= 0){
      state.frags += 1;
      state.farm[idx] = "empty";
      saveState();
      renderFarm();
    }
  }
  function renderDrones(){
    el.dronesArea.innerHTML = "";
    if(state.drones.length === 0){
      el.dronesArea.innerText = "No drones. Buy a Drone in Shop.";
      return;
    }
    state.drones.forEach(function(d){
      var div = document.createElement("div"); div.className = "item";
      div.innerHTML = "<b>"+d.id+"</b> — every "+d.speedSec+"s <button class='small'>Remove</button>";
      var btn = div.querySelector("button");
      btn.addEventListener("click", function(){
        state.drones = state.drones.filter(x=>x.id !== d.id);
        saveState();
        renderDrones();
        startDroneLoop();
      });
      el.dronesArea.appendChild(div);
    });
  }

  // QUESTS (simple local quests with backend optional)
  var QUESTS = [
    { id:"q1", text:"Harvest 5 crops", reward:5, check:function(s){ /*TODO*/ return false } },
    { id:"q2", text:"Buy 1 drone", reward:10, check:function(s){ return s.drones && s.drones.length>=1 } }
  ];
  function renderQuests(){
    el.questsList.innerHTML = "";
    // try backend first
    api_get_quests(state.user_id).then(function(resp){
      var list = resp && resp.ok && Array.isArray(resp.quests) ? resp.quests : QUESTS;
      list.forEach(function(q){
        var div = document.createElement("div"); div.className="item";
        var completed = false; // local check
        if(q.id === "q2") completed = state.drones.length >= 1;
        div.innerHTML = "<b>"+q.text+"</b><br>Reward: "+q.reward+" FRAG";
        var btn = document.createElement("button"); btn.className="small"; btn.innerText = completed ? "Claim" : "Start";
        btn.disabled = completed ? false : false;
        btn.addEventListener("click", function(){
          if(completed){
            state.frags += q.reward;
            alert("Quest claimed: +" + q.reward + " FRAG");
            saveState();
            renderQuests();
          } else {
            alert("Do this quest to claim reward.");
          }
        });
        div.appendChild(btn);
        el.questsList.appendChild(div);
      });
    }).catch(function(){
      // render local
      QUESTS.forEach(function(q){
        var div = document.createElement("div"); div.className="item";
        var completed = (q.id==="q2") ? state.drones.length>=1 : false;
        div.innerHTML = "<b>"+q.text+"</b><br>Reward: "+q.reward+" FRAG";
        var btn = document.createElement("button"); btn.className="small"; btn.innerText = completed ? "Claim" : "Start";
        btn.addEventListener("click", function(){
          if(completed){ state.frags += q.reward; saveState(); renderQuests(); alert("Claimed!"); }
          else alert("Do mission to complete.");
        });
        div.appendChild(btn);
        el.questsList.appendChild(div);
      });
    });
  }

  // PROFILE
  function applyProfileToUI(){
    el.profileName && (el.profileName.innerText = state.profile.name || "Guest");
    el.profileFrags && (el.profileFrags.innerText = state.frags);
    el.profileLevel && (el.profileLevel.innerText = state.level);
    if(state.profile.avatar){
      el.profileAvatar && (el.profileAvatar.src = state.profile.avatar, el.profileAvatar.classList.remove("hidden"));
      el.miniAvatar && (el.miniAvatar.src = state.profile.avatar, el.miniAvatar.classList.remove("hidden"));
    } else {
      el.profileAvatar && el.profileAvatar.classList.add("hidden");
      el.miniAvatar && el.miniAvatar.classList.add("hidden");
    }
    el.miniInfo && (el.miniInfo.innerText = state.profile.name || ("u"+state.user_id.slice(0,4)));
    // fill inputs if present
    var inpA = document.getElementById("input_avatar"); if(inpA) inpA.value = state.profile.avatar || "";
    var inpN = document.getElementById("input_name"); if(inpN) inpN.value = state.profile.name || "";
  }
  function renderProfile(){
    applyProfileToUI();
    // save profile button
    var btn = document.getElementById("btn_save_profile");
    if(btn){
      btn.onclick = function(){
        var a = document.getElementById("input_avatar").value.trim();
        var n = document.getElementById("input_name").value.trim();
        if(n) state.profile.name = n;
        state.profile.avatar = a;
        saveState();
        applyProfileToUI();
        alert("Profile saved");
      };
    }
    var reset = document.getElementById("btn_reset");
    if(reset){ reset.onclick = function(){
      if(confirm("Reset your progress? This will clear farm, frags and drones.")){
        state.frags = 0; state.farm = Array(9).fill("empty"); state.drones = []; state.inventory = []; state.level = 1;
        saveState(); renderFarm(); renderDrones(); renderShop(); renderProfile(); alert("Reset done");
      }
    };}
  }

  // LEADERS (try backend then local)
  function renderLeaders(){
    el.leadersList.innerHTML = "<p class='muted'>Loading...</p>";
    api_get_leaders().then(function(resp){
      if(resp && resp.ok && Array.isArray(resp.leaders)){
        showLeaders(resp.leaders);
      } else {
        showLeadersLocal();
      }
    }).catch(function(){ showLeadersLocal(); });
  }
  function showLeaders(leaders){
    el.leadersList.innerHTML = "";
    leaders.forEach(function(l, i){
      var row = document.createElement("div"); row.className="leader-row";
      row.innerHTML = "<div>#"+(i+1)+" "+(l.name||("u"+l.user_id.slice(0,4)))+"</div><div>"+(l.frags||0)+" FRAG</div>";
      el.leadersList.appendChild(row);
    });
  }
  function showLeadersLocal(){
    // use local storage snapshots: gather few guest states if any (simple demo)
    var arr = [];
    for(var k in localStorage){
      if(k.indexOf("cf_state_")===0){
        try{
          var o = JSON.parse(localStorage.getItem(k));
          arr.push({ name: (o.profile && o.profile.name) ? o.profile.name : k, frags: o.frags || 0 });
        }catch(e){}
      }
    }
    arr.sort((a,b)=> (b.frags||0)-(a.frags||0));
    el.leadersList.innerHTML = "";
    if(arr.length === 0) { el.leadersList.innerHTML = "<p class='muted'>No local players</p>"; return; }
    showLeaders(arr.slice(0,20));
  }

  // initial UI rendering helpers
  function renderShop(){ /* used for updates after buying */ renderShop(); }

  // bind some panel-specific rendering methods to window for easy calls
  window.renderFarm = renderFarm;
  window.renderShop = function(){ // render shop elements into shop_list
    var shopL = document.getElementById("shop_list");
    shopL.innerHTML = "";
    SHOP_ITEMS.forEach(function(it){
      var box = document.createElement("div"); box.className = "item";
      box.innerHTML = "<b>"+it.name+"</b> — "+it.price+" FRAG<br><small>"+it.desc+"</small>";
      var btn = document.createElement("button"); btn.className = "small"; btn.innerText = "Buy";
      btn.addEventListener("click", function(){ buyItem(it); });
      box.appendChild(btn); shopL.appendChild(box);
    });
  };

  // alias previously defined buyItem/renderDrones
  window.buyItem = buyItem;
  window.renderDrones = renderDrones;
  window.renderQuests = renderQuests;
  window.renderProfile = renderProfile;
  window.renderLeaders = renderLeaders;

  // auto-save periodically
  setInterval(saveState, 15 * 1000);

  // start
  loadState();
  // start drones after load
  setTimeout(startDroneLoop, 1500);

})();
