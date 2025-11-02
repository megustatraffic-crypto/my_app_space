// === LOAD SAVE ===
let state = {
    frags: 0,
    level: 1,
    tiles: Array(9).fill({ status: "empty", plantedAt: 0 }),
    growTime: 7000,       // 7 sec growth
    seasonStart: Date.now(),
    seasonName: "🌸 Spring Season",
    drones: 0,
    rating: 0
};

function save() { localStorage.setItem("cf_state", JSON.stringify(state)); }
function load() {
    const s = localStorage.getItem("cf_state");
    if (s) state = JSON.parse(s);
}
load();

// Season system
const seasons = ["🌸 Spring Season", "☀️ Sun Season", "🍁 Fall Season", "❄️ Ice Season"];

function updateSeason() {
    const seasonBox = document.getElementById("season_box");
    const now = Date.now();
    const days = Math.floor((now - state.seasonStart) / (1000*60*60*24));

    if (days >= 7) {                // 7 days per season
        state.seasonStart = Date.now();
        state.seasonName = seasons[ Math.floor(Math.random()*seasons.length) ];
        save();
    }
    seasonBox.innerHTML = state.seasonName + " | Global Rank: " + state.rating;
}

const grid = document.getElementById("farm_grid");
const statusBar = document.getElementById("status_bar");

function renderFarm() {
    updateSeason();
    statusBar.innerHTML = `Frags: ${state.frags} | Level: ${state.level} | Drones: ${state.drones}`;

    grid.innerHTML = "";

    state.tiles.forEach((tile, i)=>{
        const el = document.createElement("div");
        el.className = "tile";

        let now = Date.now();
        let diff = now - tile.plantedAt;
        let left = Math.ceil((state.growTime - diff)/1000);

        if (tile.status === "empty") el.innerHTML = "⬛";
        if (tile.status === "growing") {
            el.innerHTML = `<span class="grow">🌱</span>`;
            if (left > 0) {
                const timer = document.createElement("div");
                timer.className = "timer";
                timer.innerText = `${left}s`;
                el.appendChild(timer);
            }
            if (diff >= state.growTime) tile.status = "grown";
        }
        if (tile.status === "grown") el.innerHTML = "✅";

        el.onclick = ()=> clickTile(i);
        grid.appendChild(el);
    });

    save();
}

function clickTile(i) {
    let t = state.tiles[i];
    if (t.status === "empty") {
        state.tiles[i] = { status:"growing", plantedAt:Date.now() };
        state.rating++; // progress in global leaderboard
    }
    else if (t.status === "grown") {
        state.frags++;
        state.tiles[i] = { status:"empty", plantedAt:0 };
    }
    save();
    renderFarm();
}

// Drones auto-harvest
setInterval(()=>{
    if (state.drones > 0) {
        state.tiles.forEach((t,i)=>{
            if (t.status === "grown") {
                state.frags++;
                state.tiles[i] = { status:"empty", plantedAt:0 };
            }
        });
        renderFarm();
    }
}, 3000);

// Update farm every 1 sec (to update timers)
setInterval(()=>renderFarm(), 1000);

renderFarm();
