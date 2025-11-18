// === INITIAL STATE ===

let state = {
    coins: 0,
    stars: 0,

    iron: 0,
    charcoal: 0,
    water: 0,
    core: 0,

    factories: {
        extractor: 0,
        smelter: 0,
        pump: 0
    }
};

// === ELEMENTS ===
const tapObj = document.getElementById("tap-object");

const ironEl = document.getElementById("iron");
const charcoalEl = document.getElementById("charcoal");
const waterEl = document.getElementById("water");
const coreEl = document.getElementById("core");

const coinEl = document.getElementById("coins");
const starEl = document.getElementById("stars");

const locationBg = document.getElementById("location-bg");

const tabs = document.querySelectorAll(".tab");

// === TAP LOGIC ===
tapObj.addEventListener("click", () => {
    let loc = currentLocation;

    if (loc === "career") {
        state.iron++;
        ironEl.textContent = state.iron;
        tapEffect();
    }
    if (loc === "forest") {
        state.charcoal++;
        charcoalEl.textContent = state.charcoal;
        tapEffect();
    }
    if (loc === "lake") {
        state.water++;
        waterEl.textContent = state.water;
        tapEffect();
    }
});

// === TAP EFFECT (small pop animation) ===
function tapEffect() {
    tapObj.style.transform = "translateX(-50%) scale(0.9)";
    setTimeout(() => {
        tapObj.style.transform = "translateX(-50%) scale(1)";
    }, 80);
}

// === LOCATION SWITCH ===
let currentLocation = "career";

const locImages = {
    career: "location/terra/terra_career.jpg",
    forest: "location/terra/terra_forest.jpg",
    lake: "location/terra/terra_lake.jpg"
};

const tapTargets = {
    career: "resources/terra/r1_iron_ore.png",
    forest: "resources/terra/r1_charcoal.png",
    lake: "resources/terra/r1_water.png"
};

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        let loc = tab.dataset.loc;
        currentLocation = loc;

        locationBg.src = locImages[loc];
        tapObj.src = tapTargets[loc];
    });
});

// === FACTORY PURCHASE ===

const buttons = document.querySelectorAll(".buy");

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        let type = btn.dataset.f;

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

// === AUTO PRODUCTION ===
setInterval(() => {
    // extractor → iron
    state.iron += state.factories.extractor * 1;

    // smelter → charcoal
    state.charcoal += state.factories.smelter * 1;

    // pump → water
    state.water += state.factories.pump * 1;

    updateUI();
}, 1000);

// === CRAFT CORE (P1) ===
document.getElementById("craft-btn").addEventListener("click", () => {
    if (
        state.iron >= 100 &&
        state.charcoal >= 100 &&
        state.water >= 100
    ) {
        state.iron -= 100;
        state.charcoal -= 100;
        state.water -= 100;

        state.core++;
        updateUI();
    }
});

// === UPDATE UI ===
function updateUI() {
    ironEl.textContent = state.iron;
    charcoalEl.textContent = state.charcoal;
    waterEl.textContent = state.water;
    coreEl.textContent = state.core;

    coinEl.textContent = state.coins;
    starEl.textContent = state.stars;
}

updateUI();
