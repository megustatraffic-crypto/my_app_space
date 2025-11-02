// minimal Telegram WebApp initializer
window.TG = null;
window.TG_READY = false;

(function init(){
  try {
    if(window.Telegram && Telegram.WebApp){
      window.TG = Telegram.WebApp;
      TG.expand();
      TG_READY = true;
    }
  } catch(e){
    // not in TG client
    TG_READY = false;
  }
})();
