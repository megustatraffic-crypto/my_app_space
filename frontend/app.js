const STORAGE_KEY = "cosmic_farm_state_v1";

let state = loadState();

// growth speed
function growTime() {
  return Math.max(3000, 7000 - state.level * 300);
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s) return s;
  } catch(e){}

  return {
    frags: 0,
    level: 1,
    farmSize: 3,
    farm: Array(9).fill(null).map(()=>({status:"empty", planted:0})),
    drones: 0,
    harvested: 0
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// === UI ===
const farmEl = document.getElementById("farm");
const statsEl = document.getElementById("playerStats");
const houseEl = document.getElementById("house");
const tabModal = document.getElementById("tabModal");

// Render farm
function renderFarm() {
  farmEl.style.gridTemplateColumns = `repeat(${state.farmSize}, 1fr)`;
  farmEl.innerHTML = "";

  state.farm.forEach((tile, i) => {
    const div = document.createElement("div");
    div.className = "tile";

    if (tile.status === "empty") {
      div.textContent = "";
    } else if (tile.status === "growing") {
      div.textContent = "🌱";
      div.classList.add("growing");
      const left = Math.ceil((tile.planted + growTime() - Date.now())/1000);
      if (left > 0) {
        const t = document.createElement("div");
        t.className = "timer";
        t.textContent = `${left}s`;
        div.appendChild(t);
      } else {
        tile.status = "grown";
      }
    } else if (tile.status === "grown") {
      div.textContent = "✅";
    }

    div.addEventListener("click", ()=> tileClick(i));
    farmEl.appendChild(div);
  });

  statsEl.textContent =
    `Frags: ${state.frags} | Level: ${state.level} | Drones: ${state.drones}`;

  saveState();
  renderHouse();
}

function renderHouse() {
  // swap house skin
  let img = "img/house1.png";
  if (state.level >= 3) img = "img/house2.png";
  if (state.level >= 6) img = "img/house3.png";
  if (state.level >= 10) img = "img/house4.png";
  houseEl.style.backgroundImage = `url(${img})`;
}

function tileClick(i) {
  const tile = state.farm[i];
  if (tile.status === "empty") {
    tile.status = "growing";
    tile.planted = Date.now();
  }
  else if (tile.status === "grown") {
    tile.status = "empty";
    tile.planted = 0;
    state.frags++;
    state.harvested++;
    levelCheck();
  }

  renderFarm();
}

// drones auto-harvest
setInterval(()=>{
  if (state.drones > 0) {
    state.farm.forEach(t=>{
      if (t.status === "grown") {
        t.status = "empty";
        t.planted = 0;
        state.frags++;
        state.harvested++;
      }
    });
    levelCheck();
    renderFarm();
  }
}, 3000);

function levelCheck() {
  const need = 10 * Math.pow(state.level, 1.6);
  if (state.frags >= need) {
    state.frags -= Math.floor(need);
    state.level++;

    if (state.farmSize < 7) {
      state.farmSize++;
      while (state.farm.length < state.farmSize*state.farmSize) {
        state.farm.push({status:"empty", planted:0});
      }
    }
  }
}

// === modal tabs ===
function openTab(name) {
  tabModal.hidden = false;

  if(name==="shop"){
    tabModal.innerHTML = `
      <h3>Shop</h3>
      <p>Buy Drone (10 FRAG) <button onclick="buyDrone()">Buy</button></p>
      <p>Upgrade Farm (50 FRAG) <button onclick="buyUp()">Buy</button></p>
      <button onclick="closeTab()">Close</button>
    `;
  }
  if(name==="drones"){
    tabModal.innerHTML = `
      <h3>Drones</h3>
      <p>Your drones: ${state.drones}</p>
      <button onclick="closeTab()">Close</button>
    `;
  }
  if(name==="quests"){
    tabModal.innerHTML = `
      <h3>Quests</h3>
      <p>Harvest: ${state.harvested}</p>
      <button onclick="closeTab()">Close</button>
    `;
  }
  if(name==="profile"){
    tabModal.innerHTML = `
      <h3>Profile</h3>
      <p>Level: ${state.level}</p>
      <p>Frags: ${state.frags}</p>
      <p>Drones: ${state.drones}</p>
      <button onclick="closeTab()">Close</button>
    `;
  }
}

function closeTab(){
  tabModal.hidden = true;
  tabModal.innerHTML = "";
}

// === shop actions ===
function buyDrone(){
  if(state.frags < 10) return alert("Not enough FRAG!");
  state.frags -= 10;
  state.drones++;
  saveState();
  renderFarm();
  alert("Drone purchased!");
}

function buyUp(){
  if(state.frags < 50) return alert("Not enough FRAG!");
  if(state.farmSize >= 7) return alert("Max farm size!");

  state.frags -= 50;
  state.farmSize++;

  while(state.farm.length < state.farmSize*state.farmSize){
    state.farm.push({status:"empty",planted:0});
  }

  saveState();
  renderFarm();
}

// initial draw
renderFarm();
