// api.js - backend wrappers with fallback
var API = "https://my-app-space.onrender.com"; // <- change if needed

function fetchJSON(url, opts){ return fetch(url, opts).then(r=>r.json()).catch(e=>{ throw e }) }

// get state (query param user_id)
function api_get_state(user_id){
  return fetchJSON(API + "/game/state?user_id=" + encodeURIComponent(user_id), { method:"GET" })
    .catch(()=>({ ok:false }));
}

// save state (payload: user_id, frags, farm, inventory, profile {name,avatar}, level)
function api_save_state(payload){
  return fetchJSON(API + "/game/save", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  }).catch(()=>({ ok:false }));
}

// shop buy (payload: user_id, itemId)
function api_shop_buy(payload){
  return fetchJSON(API + "/shop/buy", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  }).catch(()=>({ ok:false }));
}

// quests /leaders endpoints (optional backend)
function api_get_quests(user_id){
  return fetchJSON(API + "/game/quests?user_id=" + encodeURIComponent(user_id), { method:"GET" })
    .catch(()=>({ ok:false }));
}
function api_get_leaders(){
  return fetchJSON(API + "/game/leaderboard", { method:"GET" })
    .catch(()=>({ ok:false }));
}
