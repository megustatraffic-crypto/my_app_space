// app.js
const BACKEND = (window.BACKEND_URL) ? window.BACKEND_URL : "https://your-backend.example.com"; 
// replace with real URL or set global BACKEND_URL

const TELEGRAM_ID = localStorage.getItem('tgId') || (Math.floor(Math.random()*900000)+100000).toString();
localStorage.setItem('tgId', TELEGRAM_ID);
document.getElementById('backendUrl').innerText = BACKEND;

async function api(path, body, method='POST') {
  const res = await fetch(BACKEND + path, {
    method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  return res.json();
}

async function refresh() {
  const r = await fetch(BACKEND + '/game/' + TELEGRAM_ID);
  const j = await r.json();
  if (!j.success) return console.error(j);
  const u = j.user;
  document.getElementById('r_iron').innerText = u.resources.R1_1;
  document.getElementById('r_char').innerText = u.resources.R1_2;
  document.getElementById('r_water').innerText = u.resources.R1_3;
  document.getElementById('p1').innerText = u.resources.P1 || 0;
}

document.querySelectorAll('.tapbtn').forEach(b=>{
  b.onclick = async ()=> {
    const resource = b.dataset.resource;
    await api('/game/tap', { telegramId: TELEGRAM_ID, resource });
    refresh();
  };
});

document.getElementById('toggle_extractor').onclick = async ()=>{
  await api('/game/module/toggle', { telegramId: TELEGRAM_ID, module: 'extractor' });
  refresh();
};
document.getElementById('toggle_pump').onclick = async ()=>{
  await api('/game/module/toggle', { telegramId: TELEGRAM_ID, module: 'pump' });
  refresh();
};
document.getElementById('toggle_smelter').onclick = async ()=>{
  await api('/game/module/toggle', { telegramId: TELEGRAM_ID, module: 'smelter' });
  refresh();
};

document.getElementById('upgrade_extractor').onclick = async ()=>{
  const res = await api('/game/module/upgrade', { telegramId: TELEGRAM_ID, module: 'extractor' });
  if (res.error) alert(res.error + (res.need ? ' need:' + res.need : ''));
  refresh();
};
document.getElementById('upgrade_pump').onclick = async ()=>{
  const res = await api('/game/module/upgrade', { telegramId: TELEGRAM_ID, module: 'pump' });
  if (res.error) alert(res.error + (res.need ? ' need:' + res.need : ''));
  refresh();
};
document.getElementById('upgrade_smelter').onclick = async ()=>{
  const res = await api('/game/module/upgrade', { telegramId: TELEGRAM_ID, module: 'smelter' });
  if (res.error) alert(res.error + (res.need ? ' need:' + res.need : ''));
  refresh();
};

document.getElementById('craft_p1').onclick = async ()=>{
  const res = await api('/game/craft/p1', { telegramId: TELEGRAM_ID });
  if (res.error) alert(res.error);
  refresh();
};

setInterval(refresh, 3000);
refresh();
