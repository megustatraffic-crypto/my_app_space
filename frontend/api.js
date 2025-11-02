// Set this to your backend URL
const API_URL = "https://my-app-space.onrender.com";

// wrappers
async function apiGetState(user_id){
  try {
    const r = await fetch(`${API_URL}/game/state?user_id=${encodeURIComponent(user_id)}`);
    return await r.json();
  } catch(e){ return { ok:false } }
}
async function apiSave(payload){
  try {
    const r = await fetch(`${API_URL}/game/save`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    return await r.json();
  } catch(e){ return { ok:false } }
}
async function apiShopBuy(payload){
  try {
    const r = await fetch(`${API_URL}/shop/buy`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)
    });
    return await r.json();
  } catch(e){ return { ok:false } }
}
async function apiLeaders(){ try { const r = await fetch(`${API_URL}/game/leaderboard`); return await r.json(); } catch(e){ return { ok:false } } }
