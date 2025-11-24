// routes/shop.js
import express from 'express';
import db from '../db.js';
const router = express.Router();

const items = {
  energy_50: { price: 5, type: 'energy', amount: 50 },
  energy_200: { price: 15, type: 'energy', amount: 200 },
  autoclick_30: { price: 10, type: 'autoclick', minutes: 30 },
  overdrive_10: { price: 3, type: 'overdrive', minutes: 10 }
};

function findUser(tid){ return db.data.users.find(u => u.telegramId === String(tid)); }

router.post('/buy', async (req,res) => {
  const { telegramId, item } = req.body;
  if (!telegramId || !item) return res.status(400).json({ error: 'bad request' });
  const user = findUser(telegramId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const it = items[item];
  if (!it) return res.status(400).json({ error: 'unknown item' });

  // check stars balance (we assume internal stars)
  const balance = user.stars || 0;
  if (balance < it.price) return res.status(400).json({ error: 'not_enough_stars', need: it.price });

  user.stars = balance - it.price;

  if (it.type === 'energy') {
    user.energy = Math.min(user.energyMax, (user.energy || 0) + it.amount);
  } else if (it.type === 'autoclick') {
    user.autoclickUntil = (user.autoclickUntil || 0) > Date.now() ? user.autoclickUntil + it.minutes*60000 : Date.now() + it.minutes*60000;
  } else if (it.type === 'overdrive') {
    user.offlineBoostUntil = (user.offlineBoostUntil || 0) > Date.now() ? user.offlineBoostUntil + it.minutes*60000 : Date.now() + it.minutes*60000;
  }
  await db.write();
  return res.json({ success: true, user });
});

export default router;
