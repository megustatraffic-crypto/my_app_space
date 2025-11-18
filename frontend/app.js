let resources = {
    iron: 0,
    charcoal: 0,
    water: 0,
    core: 0
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

// === UPDATE COUNTERS ===
function updateUI() {
    document.getElementById("count-iron").innerText = resources.iron;
    document.getElementById("count-charcoal").innerText = resources.charcoal;
    document.getElementById("count-water").innerText = resources.water;
    document.getElementById("count-core").innerText = resources.core;
}

updateUI();
