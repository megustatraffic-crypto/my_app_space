// routes/shop.js
import express from 'express';
import db from '../db.js';
const router = express.Router();

const items = {
  "burst_100": { price: 100, type: "offline_boost", hours: 8 },
  "vip_500": { price: 500, type: "vip_permanent" },
  "instant_pack": { price: 50, type: "instant_pack", grant: { R1_1: 200, R1_2: 100, R1_3: 50 } }
};

function getUser(tid){
  return db.data.users.find(u => u.telegramId === String(tid));
}

router.post('/buy', async (req,res) => {
  const { telegramId, item } = req.body;
  if (!telegramId || !item) return res.status(400).json({ error: 'bad request' });
  const user = getUser(telegramId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const it = items[item];
  if (!it) return res.status(400).json({ error: 'unknown item' });

  const balance = user.stars || 0;
  if (balance < it.price) return res.status(400).json({ error: 'not_enough_stars', need: it.price });

  user.stars = balance - it.price;

  if (it.type === 'offline_boost') {
    const base = Math.max(Date.now(), user.offlineBoostUntil || 0);
    user.offlineBoostUntil = base + it.hours * 3600 * 1000;
  } else if (it.type === 'vip_permanent') {
    user.vip = true;
  } else if (it.type === 'instant_pack') {
    for (const k in it.grant) user.resources[k] = (user.resources[k] || 0) + it.grant[k];
  }

  await db.write();
  return res.json({ success: true, user });
});

export default router;
