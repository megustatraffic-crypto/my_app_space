// ===== GAME STATE =====
let state = {
    coins: 0,
    stars: 0,

    iron: 0,
    charcoal: 0,
    water: 0,

    factories: {
        extractor: 0,
        smelter: 0,
        pump: 0
    },

    core: 0,

    currentLocation: "career"
};

// ===== UI ELEMENTS =====
const el = {
    coins: document.getElementById("coins"),
    stars: document.getElementById("stars"),

    iron: document.getElementById("iron"),
    charcoal: document.getElementById("charcoal"),
    water: document.getElementById("water"),

    core: document.getElementById("core"),

    locationBg: document.getElementById("location-bg"),
    tapObject: document.getElementById("tap-object"),

    factoryList: document.getElementById("factory-list"),

    craftBtn: document.getElementById("craft-btn"),
};

const LOCATIONS = {
    "career": {
        bg: "location/terra/terra_career.jpg",
        resource: "resources/terra/r1_iron_ore.png",
        yield: () => state.iron++
    },
    "forest": {
        bg: "location/terra/terra_forest.jpg",
        resource: "resources/terra/r1_charcoal.png",
        yield: () => state.charcoal++
    },
    "lake": {
        bg: "location/terra/terra_lake.jpg",
        resource: "resources/terra/r1_water.png",
        yield: () => state.water++
    }
};

// ===== TAPPING =====
el.tapObject.addEventListener("click", () => {
    LOCATIONS[state.currentLocation].yield();
    updateUI();
});

// ===== SWITCH LOCATION =====
document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");

        state.currentLocation = btn.dataset.loc;

        const loc = LOCATIONS[state.currentLocation];
        el.locationBg.src = loc.bg;
        el.tapObject.src = loc.resource;

        updateUI();
    });
});

// ===== FACTORY PURCHASE =====
document.querySelectorAll(".buy").forEach(btn => {
    btn.addEventListener("click", () => {
        const type = btn.dataset.f;

        if (type === "extractor" && state.iron >= 50) {
            state.iron -= 50;
            state.factories.extractor++;
        }
        if (type === "smelter" && state.charcoal >= 40) {
            state.charcoal -= 40;
            state.factories.smelter++;
        }
        if (type === "pump" && state.water >= 30) {
            state.water -= 30;
            state.factories.pump++;
        }

        updateUI();
    });
});

// ===== FACTORY AUTO-INCOME =====
setInterval(() => {
    state.iron += state.factories.extractor * 1;
    state.charcoal += state.factories.smelter * 1;
    state.water += state.factories.pump * 1;

    updateUI();
}, 1000);

// ===== CRAFT CORE =====
el.craftBtn.addEventListener("click", () => {
    if (state.iron >= 50 && state.charcoal >= 30 && state.water >= 40) {
        state.iron -= 50;
        state.charcoal -= 30;
        state.water -= 40;
        state.core++;
        updateUI();
    }
});

// ===== UPDATE UI =====
function updateUI() {
    el.coins.textContent = state.coins;
    el.stars.textContent = state.stars;

    el.iron.textContent = state.iron;
    el.charcoal.textContent = state.charcoal;
    el.water.textContent = state.water;

    el.core.textContent = state.core;

    let f = state.factories;

    el.factoryList.innerHTML = `
        Extractors: ${f.extractor}<br>
        Smelters: ${f.smelter}<br>
        Pumps: ${f.pump}
    `;
}

updateUI();
