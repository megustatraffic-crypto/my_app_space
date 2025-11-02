// ✅ farm.js — рабочая логика фермы

let state = {
    frags: 0,
    level: 1,
    tiles: ["empty","empty","empty","empty","empty","empty","empty","empty","empty"],
    drones: 0
};

function save() {
    localStorage.setItem("cf_state", JSON.stringify(state));
}
function load() {
    const saved = localStorage.getItem("cf_state");
    if (saved) state = JSON.parse(saved);
}
load();

const grid = document.getElementById("farm_grid");
const statusBar = document.getElementById("status_bar");

function renderFarm() {
    statusBar.innerHTML = `Frags: ${state.frags} | Level: ${state.level} | Drones: ${state.drones}`;

    grid.innerHTML = "";

    state.tiles.forEach((t, i) => {
        const el = document.createElement("div");
        el.className = "tile";

        if (t === "empty") el.innerHTML = "⬛";
        if (t === "growing") el.innerHTML = "🌱";
        if (t === "grown") el.innerHTML = "✅";

        el.onclick = () => clickTile(i);
        grid.appendChild(el);
    });
}

function clickTile(i) {
    if (state.tiles[i] === "empty") {
        state.tiles[i] = "growing";

        setTimeout(() => {
            state.tiles[i] = "grown";
            save();
            renderFarm();
        }, 5000);
    }
    else if (state.tiles[i] === "grown") {
        state.frags++;
        state.tiles[i] = "empty";
    }

    save();
    renderFarm();
}

// автодроны
setInterval(() => {
    if (state.drones > 0) {
        for (let i = 0; i < state.tiles.length; i++) {
            if (state.tiles[i] === "grown") {
                state.frags++;
                state.tiles[i] = "empty";
            }
        }
        save();
        renderFarm();
    }
}, 3000);

renderFarm();
