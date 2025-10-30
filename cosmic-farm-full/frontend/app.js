
(function(){
  // Simple client-side MiniApp behavior: name input, language toggle, tutorial, plots, collect.
  const welcome = document.getElementById('welcome');
  const tutorial = document.getElementById('tutorial');
  const dashboard = document.getElementById('dashboard');
  const startBtn = document.getElementById('startBtn');
  const langBtn = document.getElementById('langBtn');
  const playerNameInput = document.getElementById('playerName');
  const tText = document.getElementById('tText');
  const tNext = document.getElementById('tNext');
  const tSkip = document.getElementById('tSkip');
  const playerDisplay = document.getElementById('playerDisplay');
  const fragsEl = document.getElementById('frags');
  const energyEl = document.getElementById('energy');
  const plots = document.querySelectorAll('.plot');
  const eveText = document.getElementById('eveText');
  const collectBtn = document.getElementById('collectBtn');

  let lang = 'en';
  let player = { name: null, frags: 10, energy: 5 };
  let tutorialStep = 1;

  // Telegram init (safe)
  function initTelegram(){
    try{
      const tg = window.Telegram.WebApp;
      if(tg){
        tg.ready();
        // optional: auto-fill name from tg user
        const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
        if(user && !localStorage.getItem('cf_name')){
          const candidate = user.first_name || user.username;
          if(candidate) playerNameInput.value = candidate;
        }
      }
    }catch(e){ /* ignore */ }
  }
  initTelegram();

  // Language toggle
  langBtn.addEventListener('click', ()=>{
    lang = (lang==='en'?'ru':'en');
    langBtn.textContent = (lang==='en'?'RU':'EN');
    document.getElementById('subtitle').textContent = (lang==='en'?
      'Hello, traveler. This world is empty, but you can make it bloom again.' :
      'Привет, странник. Этот мир пуст, но ты можешь вернуть в него жизнь.');
    document.getElementById('tTitle').textContent = (lang==='en'?'Tutorial':'Обучение');
    tText.textContent = (lang==='en'?'Tap the first plot to plant seeds.':'Нажми на первую грядку, чтобы посадить семена.');
    tNext.textContent = (lang==='en'?'Next':'Далее');
    tSkip.textContent = (lang==='en'?'Skip':'Пропустить');
    startBtn.textContent = (lang==='en'?'START':'СТАРТ');
  });

  // Start button
  startBtn.addEventListener('click', ()=>{
    const name = (playerNameInput.value || '').trim();
    if(!name){
      playerNameInput.focus();
      playerNameInput.style.border = '1px solid #ff6b6b';
      return;
    }
    player.name = name;
    localStorage.setItem('cf_name', name);
    welcome.classList.add('hidden');
    tutorial.classList.remove('hidden');
    eveSpeak(lang==='en'?'Your neural link is online. Let\'s calibrate your tools.':'Твой нейролинк активен. Начнём калибровку инструментов.');
    updateHUD();
  });

  // Tutorial
  tNext.addEventListener('click', ()=>{
    tutorialStep++;
    if(tutorialStep===2){
      tText.textContent = (lang==='en'?'Collect your first harvest to earn Frags.':'Собери первый урожай, чтобы получить Фраги.');
    } else {
      finishTutorial();
    }
  });
  tSkip.addEventListener('click', finishTutorial);

  function finishTutorial(){
    tutorial.classList.add('hidden');
    dashboard.classList.remove('hidden');
    playerDisplay.textContent = player.name;
    eveSpeak(lang==='en'?'Tutorial complete. Good luck!':'Обучение завершено. Удачи!');
    updateHUD();
  }

  // Plots interaction
  plots.forEach(p=>{
    p.addEventListener('click', ()=>{
      p.textContent = '🌱 Growing...';
      p.style.background = 'linear-gradient(180deg, rgba(120,255,179,0.12), rgba(0,0,0,0.15))';
      setTimeout(()=>{
        p.textContent = '🍃 Ready';
        p.dataset.ready = '1';
        eveSpeak(lang==='en'?'Crop matured. Collect to get rewards.':'Урожай созрел. Собери, чтобы получить награду.');
      }, 3000 + Math.random()*3000);
    });
  });

  // Collect
  collectBtn.addEventListener('click', ()=>{
    let gained = 0;
    plots.forEach(p=>{
      if(p.dataset.ready==='1'){
        gained += 5;
        p.dataset.ready = '';
        p.textContent = 'Plot';
        p.style.background = '';
      }
    });
    if(gained>0){
      player.frags += gained;
      player.energy = Math.max(0, player.energy - 1);
      eveSpeak((lang==='en'?'Collected '+gained+' Frags.':'Собрано '+gained+' Фрагов.'));
      updateHUD();
    } else {
      eveSpeak((lang==='en'?'Nothing to collect yet.':'Нечего собирать.'));
    }
  });

  function updateHUD(){
    fragsEl.textContent = player.frags;
    energyEl.textContent = player.energy;
  }

  function eveSpeak(text){
    eveText.textContent = text;
  }

  // load saved name
  const saved = localStorage.getItem('cf_name');
  if(saved){ playerNameInput.value = saved; }
})();
