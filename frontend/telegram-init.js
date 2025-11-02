// safe wrapper so code runs in browser if Telegram undefined
window.Telegram = window.Telegram || {};
Telegram.WebApp = Telegram.WebApp || { initDataUnsafe: null, expand(){}, close(){} };
