// routes/game_extra.js
import express from 'express';
import db from '../db.js';
const router = express.Router();

function now(){ return Date.now(); }
function findUser(tid){ return db.data.users.find(u => u.telegramId === String(tid)); }

// POST /game_extra/start_all { telegramId }
router.post('/start_all', async (req,res) => {
  const { telegramId } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'bad request' });
  const user = findUser(telegramId);
  if (!user) return res.status(404).json({ error: 'no user' });
  Object.keys(user.modules).forEach(k => {
    user.modules[k].running = true;
    user.modules[k].lastTick = now();
  });
  await db.write();
  return res.json({ success: true, modules: user.modules });
});

// POST /game_extra/claim_offline { telegramId }
router.post('/claim_offline', async (req,res) => {
  const { telegramId } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'bad request' });
  const user = findUser(telegramId);
  if (!user) return res.status(404).json({ error: 'no user' });

  const lastSeen = user.lastSeen || now();
  const secs = Math.floor((now() - lastSeen) / 1000);
  // approximate rates
  const ex = user.modules.extractor;
  const pump = user.modules.pump;
  const exRate = ex.baseRate * Math.pow(1.15, ex.level - 1);
  const pumpRate = pump.baseRate * Math.pow(1.12, pump.level - 1);
  let gainedIron = Math.floor(exRate * secs);
  let gainedWater = Math.floor(pumpRate * secs);
  let gainedChar = Math.floor(gainedIron * 0.2);

  // offline boost
  if (user.offlineBoostUntil && user.offlineBoostUntil > now()) {
    const mult = 3;
    gainedIron *= mult;
    gainedWater *= mult;
    gainedChar *= mult;
  }
  // vip passive
  if (user.vip) {
    gainedIron += Math.floor(secs * 0.2);
  }

  user.resources.R1_1 = (user.resources.R1_1 || 0) + gainedIron;
  user.resources.R1_2 = (user.resources.R1_2 || 0) + gainedChar;
  user.resources.R1_3 = (user.resources.R1_3 || 0) + gainedWater;
  user.lastSeen = now();
  await db.write();
  return res.json({ success: true, gained: { iron: gainedIron, charcoal: gainedChar, water: gainedWater }, resources: user.resources });
});

export default router;
