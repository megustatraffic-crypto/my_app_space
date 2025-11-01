// api.js
const API = "https://my-app-space.onrender.com";

export async function apiTelegramLogin(initData){
    const r = await fetch(`${API}/auth/telegram`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ initData })
    });
    return await r.json();
}

export async function apiGetFarm(token){
    const r = await fetch(`${API}/game/farm`, {
        headers:{ "Authorization": `Bearer ${token}` }
    });
    return await r.json();
}

export async function apiPlant(token, idx){
    const r = await fetch(`${API}/game/plant`, {
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ index: idx })
    });
    return await r.json();
}

export async function apiHarvest(token, idx){
    const r = await fetch(`${API}/game/harvest`, {
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ index: idx })
    });
    return await r.json();
}
