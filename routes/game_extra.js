// routes/game_extra.js
import express from 'express';
import UserModel from '../models/User.js';
const router = express.Router();

function now(){ return Date.now(); }

router.post('/start_all', async (req,res) => {
  const { telegramId } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  Object.keys(user.modules).forEach(k => {
    user.modules[k].running = true;
    user.modules[k].lastTick = now();
  });
  await UserModel.save(user);
  return res.json({ success: true, modules: user.modules });
});

router.post('/claim_offline', async (req,res) => {
  const { telegramId } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  const last = user.lastSeen || now();
  const secs = Math.floor((now() - last) / 1000);
  const maxSecs = Math.min(secs, (user.offlineMaxHours||12) * 3600);
  const ex = user.modules.extractor; const pump = user.modules.pump;
  const exRate = (ex.baseRate || 0.8) * Math.pow(1.15, (ex.level || 1) - 1);
  const pumpRate = (pump.baseRate || 0.5) * Math.pow(1.12, (pump.level || 1) - 1);
  let gainedIron = Math.floor(exRate * maxSecs);
  let gainedWater = Math.floor(pumpRate * maxSecs);
  let gainedChar = Math.floor(gainedIron * 0.18);
  if (user.offlineBoostUntil && user.offlineBoostUntil > now()) { gainedIron *= 3; gainedWater *= 3; gainedChar *= 3; }
  user.resources.R1_1 = (user.resources.R1_1 || 0) + gainedIron;
  user.resources.R1_2 = (user.resources.R1_2 || 0) + gainedChar;
  user.resources.R1_3 = (user.resources.R1_3 || 0) + gainedWater;
  user.lastSeen = now();
  await UserModel.save(user);
  return res.json({ success: true, gained: { iron: gainedIron, charcoal: gainedChar, water: gainedWater }, resources: user.resources });
});

export default router;
