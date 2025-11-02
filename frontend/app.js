// state (saved locally)
let game = JSON.parse(localStorage.getItem("cosmicFarm")) || {
    frags: 0,
    level: 1,
    drones: 0,
    farm: Array(9).fill("empty")
};

const gridEl = document.getElementById("farmGrid");
const statsEl = document.getElementById("userStats");
const descEl = document.getElementById("farmDesc");

// draw UI
function render() {
    gridEl.innerHTML = "";
    statsEl.innerText = `Frags: ${game.frags} | Level: ${game.level} | Drones: ${game.drones}`;
    descEl.innerText = "Rusty orbital plot — small hydroponics.";

    game.farm.forEach((state, i) => {
        const t = document.createElement("div");
        t.className = "tile";

        if(state === "empty") t.innerText = "";
        if(state === "growing") t.innerText = "🌱";
        if(state === "grown") t.innerText = "✅";

        t.onclick = () => clickTile(i);
        gridEl.appendChild(t);
    });

    save();
}

// tile logic
function clickTile(i) {
    let state = game.farm[i];

    if(state === "empty") {
        game.farm[i] = "growing";
        setTimeout(() => {
            game.farm[i] = "grown";
            render();
        }, 3000);
    }
    else if(state === "grown") {
        game.frags++;
        game.farm[i] = "empty";
    }

    render();
}

// save
function save(){
    localStorage.setItem("cosmicFarm", JSON.stringify(game));
}

// startup
render();
