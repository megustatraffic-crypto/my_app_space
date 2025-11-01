import { telegramLogin } from "./telegram-init.js";

const itemsEl = document.getElementById("items");
let token = localStorage.getItem("token");
let user = null;

async function init(){
    if(!token) user = await telegramLogin();
    token = localStorage.getItem("token");

    itemsEl.innerHTML = `
        <div class="card neon">
            <h3>🚀 Speed Booster</h3>
            <p>Grow crops 2x faster</p>
            <button class="btn primary">Buy – 10 Frags</button>
        </div>
    `;
}

init();
