let res = {
    iron: 0,
    charcoal: 0,
    water: 0,
    core: 0
};

let fac = {
    extractor: 0,
    smelter: 0,
    pump: 0
};

const locImgs = {
    career: "location/terra/terra_career.jpg",
    forest: "location/terra/terra_forest.jpg",
    lake: "location/terra/terra_lake.jpg",
};

const resImgs = {
    career: "resources/terra/r1_iron_ore.png",
    forest: "resources/terra/r1_charcoal.png",
    lake: "resources/terra/r1_water.png",
};

let current = "career";

document.querySelectorAll("#tabs button").forEach(b => {
    b.addEventListener("click", () => {
        current = b.dataset.loc;
        document.getElementById("loc-img").src = locImgs[current];
        document.getElementById("res-img").src = resImgs[current];
    });
});

document.getElementById("tap-zone").addEventListener("click", () => {
    if (current === "career") res.iron++;
    if (current === "forest") res.charcoal++;
    if (current === "lake") res.water++;
    update();
});

document.querySelectorAll(".buy").forEach(btn => {
    btn.addEventListener("click", () => {
        const f = btn.dataset.f;
        if (f === "extractor" && res.iron >= 50) {
            res.iron -= 50; fac.extractor++;
        }
        if (f === "smelter" && res.charcoal >= 40) {
            res.charcoal -= 40; fac.smelter++;
        }
        if (f === "pump" && res.water >= 30) {
            res.water -= 30; fac.pump++;
        }
        update();
    });
});

document.getElementById("craft-btn").addEventListener("click", () => {
    if (res.iron >= 50 && res.charcoal >= 30 && res.water >= 40) {
        res.iron -= 50;
        res.charcoal -= 30;
        res.water -= 40;
        res.core++;
    }
    update();
});

setInterval(() => {
    res.iron += fac.extractor;
    res.charcoal += fac.smelter;
    res.water += fac.pump;
    update();
}, 1000);

function update() {
    document.getElementById("iron").textContent = res.iron;
    document.getElementById("charcoal").textContent = res.charcoal;
    document.getElementById("water").textContent = res.water;
    document.getElementById("core").textContent = res.core;

    document.getElementById("fact-list").innerHTML =
        `Extractors: ${fac.extractor} • Smelters: ${fac.smelter} • Pumps: ${fac.pump}`;
}

update();
