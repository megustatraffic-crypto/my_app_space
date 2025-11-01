import { apiGetFarm, apiPlant, apiHarvest } from "./api.js";
import { telegramLogin } from "./telegram-init.js";

const farm = document.getElementById("farm");
const usernameEl = document.getElementById("username");
const fragsEl = document.getElementById("frags");

let token = localStorage.getItem("token");
let user = null;
let state = [];

async function init(){
    if(!token){
        user = await telegramLogin();
        token = localStorage.getItem("token");
    }
    loadFarm();
}

async function loadFarm(){
    const res = await apiGetFarm(token);
    user = res.user;
    state = res.plots;

    usernameEl.innerText = "👤 " + user.name;
    fragsEl.innerText = "💎 Frags: " + user.frags;

    render();
}

function render(){
    farm.innerHTML = "";
    state.forEach((plot, idx)=>{
        const div = document.createElement("div");
        div.className = "plot";

        if(plot.state === "empty") div.innerText = "🕳 empty";
        if(plot.state === "growing") div.innerText = "🌱 growing";
        if(plot.state === "grown") div.innerText = "✅ ready";

        div.onclick = () => clickPlot(idx, plot.state);
        farm.appendChild(div);
    });
}

async function clickPlot(i, st){
    if(st === "empty"){
        await apiPlant(token, i);
    }
    if(st === "grown"){
        await apiHarvest(token, i);
    }
    loadFarm();
}

init();
