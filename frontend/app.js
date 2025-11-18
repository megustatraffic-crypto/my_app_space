let resources = {
    iron: 0,
    charcoal: 0,
    water: 0,
    core: 0
};

let factories = {
    extractor: 0,
    smelter: 0,
    pump: 0
};

// === LOCATION SWITCH ===
const locationImages = {
    career: "location/terra/terra_career.jpg",
    forest: "location/terra/terra_forest.jpg",
    lake: "location/terra/terra_lake.jpg"
};

const resourceImages = {
    career: "resources/terra/r1_iron_ore.png",
    forest: "resources/terra/r1_charcoal.png",
    lake: "resources/terra/r1_water.png"
};

let currentLoc = "career";

document.querySelectorAll(".location-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const loc = btn.dataset.loc;
        currentLoc = loc;

        document.getElementById("location-img").src = locationImages[loc];
        document.getElementById("resource-img").src = resourceImages[loc];
    });
});

// === TAP HANDLER ===
document.getElementById("tap-area").addEventListener("click", () => {
    if (currentLoc === "career") resources.iron += 1;
    if (currentLoc === "forest") resources.charcoal += 1;
    if (currentLoc === "lake") resources.water += 1;

    updateUI();
});

// === FACTORY PURCHASE ===
document.querySelectorAll(".factory-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const type = btn.dataset.factory;

        if (type === "extractor" && resources.iron >= 50) {
            resources.iron -= 50;
            factories.extractor++;
        }

        if (type === "smelter" && resources.charcoal >= 40) {
            resources.charcoal -= 40;
            factories.smelter++;
        }

        if (type === "pump" && resources.water >= 30) {
            resources.water -= 30;
            factories.pump++;
        }

        updateUI();
    });
});

// === FACTORY AUTOGENERATION ===
setInterval(() => {
    resources.iron += factories.extractor;
    resources.charcoal += factories.smelter;
    resources.water += factories.pump;

    updateUI();
}, 1000);

// === CRAFT CORE ===
document.getElementById("craft-btn").addEventListener("click", () => {
    if (
        resources.iron >= 50 &&
        resources.charcoal >= 30 &&
        resources.water >= 40
    ) {
        resources.iron -= 50;
        resources.charcoal -= 30;
        resources.water -= 40;
        resources.core += 1;
    }

    updateUI();
});

// === UPDATE UI ===
function updateUI() {
    document.getElementById("count-iron").innerText = resources.iron;
    document.getElementById("count-charcoal").innerText = resources.charcoal;
    document.getElementById("count-water").innerText = resources.water;
    document.getElementById("count-core").innerText = resources.core;

    document.getElementById("factory-list").innerHTML = `
        <p>Extractors: ${factories.extractor}</p>
        <p>Smelters: ${factories.smelter}</p>
        <p>Pumps: ${factories.pump}</p>
    `;
}

updateUI();
