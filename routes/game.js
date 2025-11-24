// routes/game.js
import express from 'express';
import UserModel from '../models/User.js';
const router = express.Router();

function now(){ return Date.now(); }

// apply production + energy regen
function applyProductionAndEnergy(user) {
  const cur = now();

  // extractor
  const ex = user.modules.extractor;
  if (!ex.lastTick) ex.lastTick = cur;
  if (ex.running) {
    const dt = (cur - ex.lastTick) / 1000;
    const rate = ex.baseRate * Math.pow(1.15, ex.level - 1);
    const amount = Math.floor(rate * dt);
    if (amount > 0) {
      user.resources.R1_1 = (user.resources.R1_1 || 0) + amount;
      user.resources.R1_2 = (user.resources.R1_2 || 0) + Math.floor(amount * 0.18);
      ex.lastTick = cur;
    }
  } else ex.lastTick = cur;

  // pump -> water
  const pump = user.modules.pump;
  if (!pump.lastTick) pump.lastTick = cur;
  if (pump.running) {
    const dt = (cur - pump.lastTick) / 1000;
    const rate = pump.baseRate * Math.pow(1.12, pump.level - 1);
    const amount = Math.floor(rate * dt);
    if (amount > 0) {
      user.resources.R1_3 = (user.resources.R1_3 || 0) + amount;
      pump.lastTick = cur;
    }
  } else pump.lastTick = cur;

  // smelter (consumes iron + charcoal -> C1)
  const sm = user.modules.smelter;
  if (!sm.lastTick) sm.lastTick = cur;
  if (sm.running) {
    const dt = (cur - sm.lastTick) / 1000;
    const rate = sm.baseRate * Math.pow(1.1, sm.level - 1);
    const amount = Math.floor(rate * dt);
    const perC_iron = 5, perC_char = 2;
    const maxPossible = Math.min(Math.floor((user.resources.R1_1||0)/perC_iron), Math.floor((user.resources.R1_2||0)/perC_char));
    const produce = Math.min(amount, maxPossible);
    if (produce > 0) {
      user.resources.R1_1 -= produce * perC_iron;
      user.resources.R1_2 -= produce * perC_char;
      user.resources.C1 = (user.resources.C1 || 0) + produce;
      sm.lastTick = cur;
    } else sm.lastTick = cur;
  } else sm.lastTick = cur;

  // energy regen (1 per interval)
  if (!user._energyLast) user._energyLast = cur;
  const interval = (user.energyRegenIntervalSec || 8) * 1000;
  if (cur - user._energyLast >= interval) {
    const times = Math.floor((cur - user._energyLast) / interval);
    user.energy = Math.min(user.energyMax, (user.energy || 0) + times);
    user._energyLast += times * interval;
  }

  user.lastSeen = cur;
  user.updatedAt = cur;
  return user;
}

// GET /game/:telegramId
router.get('/:telegramId', async (req,res) => {
  const tid = req.params.telegramId;
  if (!tid) return res.status(400).json({ error: 'missing id' });
  const user = await UserModel.ensure(tid, `u${tid}`);
  applyProductionAndEnergy(user);
  await UserModel.save(user);
  return res.json({ success: true, user });
});

// POST /game/tap -> { telegramId, resource, gain }
router.post('/tap', async (req,res) => {
  const { telegramId, resource, gain } = req.body;
  if (!telegramId || !resource) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  applyProductionAndEnergy(user);
  // check energy
  if ((user.energy || 0) <= 0) return res.status(400).json({ error: 'no_energy' });
  const bonus = 1 + Math.floor((user.modules.extractor.level - 1) * 0.1);
  const actualGain = (typeof gain === 'number' ? gain : 1) * bonus;
  const map = { R1_1: 'R1_1', R1_2: 'R1_2', R1_3: 'R1_3', iron:'R1_1', charcoal:'R1_2', water:'R1_3' };
  const key = map[resource] || resource;
  if (!(key in user.resources)) return res.status(400).json({ error: 'bad_resource' });
  user.resources[key] = (user.resources[key] || 0) + actualGain;
  // consume energy
  user.energy = Math.max(0, (user.energy||0) - 1);
  await UserModel.save(user);
  return res.json({ success: true, resources: user.resources, energy: user.energy });
});

// POST /game/module/toggle
router.post('/module/toggle', async (req,res) => {
  const { telegramId, module } = req.body;
  if (!telegramId || !module) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  applyProductionAndEnergy(user);
  if (!user.modules[module]) return res.status(400).json({ error: 'no module' });
  user.modules[module].running = !user.modules[module].running;
  user.modules[module].lastTick = now();
  await UserModel.save(user);
  return res.json({ success: true, module: user.modules[module] });
});

// POST /game/module/upgrade
router.post('/module/upgrade', async (req,res) => {
  const { telegramId, module } = req.body;
  if (!telegramId || !module) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  applyProductionAndEnergy(user);
  if (!user.modules[module]) return res.status(400).json({ error: 'no module' });
  const lvl = user.modules[module].level;
  let cost = 300 * lvl;
  if (module === 'pump') cost = 200 * lvl;
  if (module === 'smelter') cost = 250 * lvl;
  if ((user.resources.C1 || 0) < cost) return res.status(400).json({ error: 'not_enough_components', need: cost });
  user.resources.C1 -= cost;
  user.modules[module].level += 1;
  await UserModel.save(user);
  return res.json({ success: true, module: user.modules[module], resources: user.resources });
});

// POST /game/craft/p1
router.post('/craft/p1', async (req,res) => {
  const { telegramId } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  applyProductionAndEnergy(user);
  const need = { R1_1: 20, R1_2: 10, R1_3: 5 };
  for (const k of Object.keys(need)) if ((user.resources[k]||0) < need[k]) return res.status(400).json({ error: 'not_enough_resources', need });
  for (const k of Object.keys(need)) user.resources[k] -= need[k];
  user.resources.P1 = (user.resources.P1 || 0) + 1;
  await UserModel.save(user);
  return res.json({ success: true, resources: user.resources });
});

export default router;
    
