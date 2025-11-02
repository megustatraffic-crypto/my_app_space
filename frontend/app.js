// ==================== GLOBAL STATE ====================
let state = {
    frags: 0,
    level: 1,
    drones: 0,
    farm: Array(15).fill({status:"empty"}),
    quests: {
        harvest5: { progress:0, goal:5, reward:5, claimed:false },
        buydrone: { progress:0, goal:1, reward:10, claimed:false }
    },
    profile: { name:"Guest", avatar:"" },
    season: "Aurora" // default
};

// ==================== DOM ====================
const el = {
    farmGrid: document.getElementById("farm_grid"),
    fragsCount: document.getElementById("frags_count"),
    farmLevel: document.getElementById("farm_level"),
    droneCount: document.getElementById("drone_count"),
    questsList: document.getElementById("quests_list"),
    shopList: document.getElementById("shop_list"),
    seasonLabel: document.getElementById("season_label"),
    leadersList: document.getElementById("leaders_list"),
    profileName: document.getElementById("profile_name"),
    profileFrags: document.getElementById("profile_frags"),
    profileLevel: document.getElementById("profile_level"),
    profileAvatar: document.getElementById("profile_avatar"),
    inputAvatar: document.getElementById("input_avatar"),
    inputName: document.getElementById("input_name"),
    miniAvatar: document.getElementById("mini_avatar"),
    miniInfo: document.getElementById("mini_info"),
};

// ==================== SAVE / LOAD ====================
function saveState(){
    localStorage.setItem("farmSave", JSON.stringify(state));
}
function loadState(){
    let s = localStorage.getItem("farmSave");
    if(s) state = JSON.parse(s);
}

// ==================== SEASONS ====================
// rotates every 24h
function updateSeason(){
    const seasons=["Aurora","Solaris","Nebula","Meteor","Quantum"];
    const day = Math.floor(Date.now()/1000/60/60/24);
    let index = day % seasons.length;
    state.season = seasons[index];
    el.seasonLabel.innerText="Season: "+state.season;
}

// ==================== FARM ====================
function growTimeMs(){
    // faster in better seasons
    if(state.season==="Solaris") return 2500;
    if(state.season==="Nebula") return 3500;
    return 4000;
}

function clickTile(i){
    let t = state.farm[i];
    if(t.status==="empty"){
        state.farm[i] = {status:"growing", readyAt: Date.now()+growTimeMs()};
        renderFarm(); saveState();
    }
    else if(t.status==="grown"){
        state.frags++;
        state.farm[i]={status:"empty"};
        animateHarvest(i);
        updateQuest("harvest5");
        renderFarm(); saveState();
    }
}

function renderFarm(){
    el.farmGrid.innerHTML="";
    state.farm.forEach((t,i)=>{
        let d=document.createElement("div");
        d.className="tile";

        if(t.status==="empty"){
            d.innerText="•";
        }
        else if(t.status==="growing"){
            let sec=Math.max(0,Math.ceil((t.readyAt-Date.now())/1000));
            d.classList.add("grow");
            d.innerHTML="🌱<div class='timer'>"+sec+"s</div>";
            if(sec<=0){
                state.farm[i]={status:"grown"};
                renderFarm(); saveState();
            }
        }
        else if(t.status==="grown"){
            d.innerText="✅";
        }
        d.onclick=()=>clickTile(i);
        el.farmGrid.appendChild(d);
    });

    el.fragsCount.innerText=state.frags;
    el.farmLevel.innerText=state.level;
    el.droneCount.innerText=state.drones;
}

// animation
function animateHarvest(i){
    let tile=el.farmGrid.children[i];
    tile.classList.add("harvest-anim");
    setTimeout(()=> tile.classList.remove("harvest-anim"),250);
}

// auto-harvest drones
setInterval(()=>{
    if(state.drones>0){
        state.farm.forEach((t,i)=>{
            if(t.status==="grown"){
                state.frags++;
                state.farm[i]={status:"empty"};
                updateQuest("harvest5");
            }
        });
        renderFarm(); saveState();
    }
}, 3000);

// ==================== SHOP ====================
function renderShop(){
    el.shopList.innerHTML="";
    const items=[
        {name:"Drone",price:10,action:()=>{ state.drones++; updateQuest("buydrone"); }},
        {name:"Upgrade Farm +1 level",price:20,action:()=>{state.level++;}}
    ];
    items.forEach(it=>{
        let d=document.createElement("div");
        d.className="item";
        d.innerHTML=`<b>${it.name}</b><br>Price: ${it.price} FRAG`;
        let b=document.createElement("button");
        b.innerText="Buy";
        b.onclick=()=>{
            if(state.frags>=it.price){
                state.frags-=it.price;
                it.action();
                renderAll(); saveState();
            }else alert("Not enough frags!");
        };
        d.appendChild(b);
        el.shopList.appendChild(d);
    });
}

// ==================== QUESTS ====================
function updateQuest(name){
    let q=state.quests[name];
    if(!q) return;
    q.progress++;
    if(q.progress>=q.goal) q.progress=q.goal;
    saveState();
    renderQuests();
}

function renderQuests(){
    el.questsList.innerHTML="";
    for(let k in state.quests){
        let q=state.quests[k];
        let d=document.createElement("div");
        d.className="item";
        d.innerHTML=`<b>${k}</b><br>Progress: ${q.progress}/${q.goal}<br>Reward: ${q.reward} FRAG`;
        let b=document.createElement("button");
        if(q.progress>=q.goal && !q.claimed){
            b.innerText="Claim";
            b.onclick=()=>{
                q.claimed=true;
                state.frags+=q.reward;
                renderAll(); saveState();
            }
        } else if(q.claimed){
            b.innerText="✅ Claimed"; b.disabled=true;
        } else {
            b.innerText="Incomplete"; b.disabled=true;
        }
        d.appendChild(b);
        el.questsList.appendChild(d);
    }
}

// ================= PROFILE =================
document.getElementById("btn_save_profile").onclick=()=>{
    state.profile.name=el.inputName.value||"Player";
    state.profile.avatar=el.inputAvatar.value;
    saveState(); renderProfile();
};

document.getElementById("btn_reset").onclick=()=>{
    if(confirm("Reset progress?")){
        localStorage.removeItem("farmSave");
        location.reload();
    }
};

function renderProfile(){
    el.profileName.innerText=state.profile.name;
    el.profileFrags.innerText=state.frags;
    el.profileLevel.innerText=state.level;

    if(state.profile.avatar){
        el.profileAvatar.src=state.profile.avatar;
        el.profileAvatar.classList.remove("hidden");
        el.miniAvatar.src=state.profile.avatar;
        el.miniAvatar.classList.remove("hidden");
    }
    el.miniInfo.innerText=state.profile.name;
}

// ================= LEADERS (offline mock) =================
function renderLeaders(){
    el.leadersList.innerHTML="";
    let fake=[
        {name:"Nova",score:120},
        {name:"Solar",score:88},
        {name:"Quark",score:50},
        {name:state.profile.name,score:state.frags},
    ];
    fake.sort((a,b)=>b.score-a.score);
    fake.forEach(p=>{
        let d=document.createElement("div");
        d.className="item";
        d.innerHTML=`${p.name} — ${p.score} FRAG`;
        el.leadersList.appendChild(d);
    });
}

// ================= PANEL SWITCH =================
document.querySelectorAll(".menu-btn").forEach(btn=>{
    btn.onclick=()=>{
        let p=btn.dataset.panel;
        document.querySelectorAll(".panel").forEach(s=>s.classList.remove("active"));
        document.getElementById("panel_"+p).classList.add("active");
        renderAll();
    }
});

// ================= INIT =================
loadState();
updateSeason();
setInterval(()=>{ updateSeason(); }, 60000);
function renderAll(){
    renderFarm();
    renderShop();
    renderQuests();
    renderProfile();
    renderLeaders();
}
renderAll();
