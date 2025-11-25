// routes/shop.js
import express from 'express';
import db from '../db.js';
import path from 'path';
const router = express.Router();

const items = {
  energy_25: { price: 3, type: 'energy', amount: 25 },
  energy_100: { price: 9, type: 'energy', amount: 100 },
  autoclick_30: { price: 6, type: 'autoclick', minutes: 30 },
  overdrive_10: { price: 3, type: 'overdrive', minutes: 10 },
  finish_upgrade: { price: 2, type: 'finish_upgrade' },
  unlock_planet_instant: { price: 150, type: 'unlock_planet' }
};

function findUser(tid){ return db.data.users.find(u => u.telegramId === String(tid)); }

router.get('/items', (req,res) => {
  return res.json({ items });
});

router.post('/buy', async (req,res) => {
  const { telegramId, item } = req.body;
  if (!telegramId || !item) return res.status(400).json({ error: 'bad request' });
  const user = findUser(telegramId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const it = items[item];
  if (!it) return res.status(400).json({ error: 'unknown item' });

  const balance = user.stars || 0;
  if (balance < it.price) return res.status(400).json({ error: 'not_enough_stars', need: it.price });

  user.stars = balance - it.price;

  if (it.type === 'energy') {
    user.energy = Math.min(user.energyMax, (user.energy || 0) + it.amount);
  } else if (it.type === 'autoclick') {
    user.autoclickUntil = (user.autoclickUntil || 0) > Date.now() ? user.autoclickUntil + it.minutes*60000 : Date.now() + it.minutes*60000;
  } else if (it.type === 'overdrive') {
    user.offlineBoostUntil = (user.offlineBoostUntil || 0) > Date.now() ? user.offlineBoostUntil + it.minutes*60000 : Date.now() + it.minutes*60000;
  } else if (it.type === 'unlock_planet') {
    user.unlockedPlanets = user.unlockedPlanets || ['P1'];
    const currentIndex = user.unlockedPlanets.length;
    const planCfg = JSON.parse(fs.readFileSync(path.join(process.cwd(),'data','planet_config.json'),'utf8'));
    const nextPlanet = planCfg.planets.find(p=>p.index === currentIndex + 1);
    if (!nextPlanet) return res.status(400).json({ error: 'no_more_planets' });
    user.unlockedPlanets.push(nextPlanet.id);
  } else if (it.type === 'finish_upgrade') {
    const nowTs = Date.now();
    user.upgradesInProgress = user.upgradesInProgress || [];
    if (!user.upgradesInProgress.length) return res.status(400).json({ error: 'no_upgrades' });
    user.upgradesInProgress.sort((a,b)=> (a.endsAt - nowTs) - (b.endsAt - nowTs));
    const job = user.upgradesInProgress.shift();
    const mod = user.modules[job.module];
    if (mod) mod.level = Math.max(mod.level, job.toLevel);
  }

  await db.write();
  return res.json({ success:true, user });
});

export default router;
