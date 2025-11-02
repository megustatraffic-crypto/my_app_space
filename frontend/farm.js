// ✅ farm.js — рабочая логика фермы

// глобальный объект состояния
let state = {
    frags: 0,
    level: 1,
    tiles: ["empty","empty","empty","empty","empty","empty","empty","empty","empty"],
    lastSave: Date.now(),
    drones: 0
};

// сохраняем в localStorage
function save() {
    localStorage.setItem("cf_state", JSON.stringify(state));
}

// загружаем
function load() {
    const data = localStorage.getItem("cf_state");
    if (data) state = JSON.parse(data);
}

load();

// UI элементы
const farmGrid = document.getElementById("farm_grid");
const statusBar = document.getElementById("status_bar");

// рисуем ферму
function renderFarm() {
    statusBar.innerHTML = `Frags: ${state.frags} | Level: ${state.level}`;

    farmGrid.innerHTML = "";

    state.tiles.forEach((tile, index) => {
        const el = document.createElement("div");
        el.className = "tile";

        if (tile === "empty") el.innerHTML = "⬛";
        if (tile === "growing") el.innerHTML = "🌱";
        if (tile === "grown") el.innerHTML = "✅";

        el.onclick = () => handleTileClick(index);
        farmGrid.appendChild(el);
    });
}

// логика нажатия
function handleTileClick(i) {
    // посадка
    if (state.tiles[i] === "empty") {
        state.tiles[i] = "growing";

        // через 5 сек → становится готовым
        setTimeout(() => {
            state.tiles[i] = "grown";
            save();
            renderFarm();
        }, 5000);
    }

    // сбор урожая
    else if (state.tiles[i] === "grown") {
        state.frags++;
        state.tiles[i] = "empty";
    }

    save();
    renderFarm();
}

// авто-дроны
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
