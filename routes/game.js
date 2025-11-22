// routes/game.js
import express from 'express';
import User from '../models/User.js';
import db from '../db.js';
const router = express.Router();

function now(){ return Date.now(); }

// advance production for a user (tick)
function applyProduction(user) {
  const cur = now();

  // EXTRACTOR -> iron & small charcoal
  const ex = user.modules.extractor;
  if (!ex.lastTick) ex.lastTick = cur;
  if (ex.running) {
    const dt = (cur - ex.lastTick) / 1000;
    const rate = ex.baseRate * Math.pow(1.15, ex.level - 1);
    const amount = Math.floor(rate * dt);
    if (amount > 0) {
      user.resources.R1_1 = (user.resources.R1_1 || 0) + amount;
      user.resources.R1_2 = (user.resources.R1_2 || 0) + Math.floor(amount * 0.2);
      ex.lastTick = cur;
    }
  } else ex.lastTick = cur;

  // PUMP -> water
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

  // SMELTER -> consumes iron + charcoal -> produces C1
  const sm = user.modules.smelter;
  if (!sm.lastTick) sm.lastTick = cur;
  if (sm.running) {
    const dt = (cur - sm.lastTick) / 1000;
    const rate = sm.baseRate * Math.pow(1.1, sm.level - 1); // C/sec
    const amount = Math.floor(rate * dt);
    const perC_iron = 5;
    const perC_char = 2;
    const maxPossible = Math.min(
      Math.floor((user.resources.R1_1 || 0) / perC_iron),
      Math.floor((user.resources.R1_2 || 0) / perC_char)
    );
    const produce = Math.min(amount, maxPossible);
    if (produce > 0) {
      user.resources.R1_1 -= produce * perC_iron;
      user.resources.R1_2 -= produce * perC_char;
      user.resources.C1 = (user.resources.C1 || 0) + produce;
      sm.lastTick = cur;
    } else {
      sm.lastTick = cur;
    }
  } else sm.lastTick = cur;

  user.updatedAt = cur;
  user.lastSeen = cur;
  return user;
}

// GET user by id, apply production
router.get('/:telegramId', async (req,res) => {
  try {
    const tid = req.params.telegramId;
    if (!tid) return res.status(400).json({ error: 'missing id' });
    const user = await User.ensure(tid, `u${tid}`);
    applyProduction(user);
    await User.save(tid, user);
    return res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /game/tap
router.post('/tap', async (req,res) => {
  try {
    const { telegramId, resource, gain } = req.body;
    if (!telegramId || !resource) return res.status(400).json({ error: 'bad request' });
    const user = await User.ensure(telegramId, `u${telegramId}`);
    applyProduction(user);

    const bonus = Math.max(1, 1 + Math.floor(user.modules.extractor.level * 0.2));
    const actualGain = (typeof gain === 'number' ? gain : 1) * bonus;

    const map = {
      iron: 'R1_1',
      charcoal: 'R1_2',
      water: 'R1_3',
      R1_1: 'R1_1',
      R1_2: 'R1_2',
      R1_3: 'R1_3'
    };
    const key = map[resource] || resource;
    if (!(key in user.resources)) return res.status(400).json({ error: 'bad resource' });

    user.resources[key] = (user.resources[key] || 0) + actualGain;
    user.updatedAt = now();
    await User.save(telegramId, user);

    return res.json({ success: true, resources: user.resources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// module toggle
router.post('/module/toggle', async (req,res) => {
  try {
    const { telegramId, module } = req.body;
    if (!telegramId || !module) return res.status(400).json({ error: 'bad request' });
    const user = await User.ensure(telegramId, `u${telegramId}`);
    applyProduction(user);
    if (!user.modules[module]) return res.status(400).json({ error: 'no such module' });
    user.modules[module].running = !user.modules[module].running;
    user.modules[module].lastTick = now();
    await User.save(telegramId, user);
    return res.json({ success: true, module: user.modules[module] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// module upgrade
router.post('/module/upgrade', async (req,res) => {
  try {
    const { telegramId, module } = req.body;
    if (!telegramId || !module) return res.status(400).json({ error: 'bad request' });
    const user = await User.ensure(telegramId, `u${telegramId}`);
    applyProduction(user);
    if (!user.modules[module]) return res.status(400).json({ error: 'no such module' });
    const lvl = user.modules[module].level;
    let cost = 300 * lvl;
    if (module === 'pump') cost = 200 * lvl;
    if (module === 'smelter') cost = 250 * lvl;

    const availableC = user.resources.C1 || 0;
    if (availableC < cost) return res.status(400).json({ error: 'not enough components', need: cost });

    user.resources.C1 -= cost;
    user.modules[module].level += 1;
    user.updatedAt = now();
    await User.save(telegramId, user);
    return res.json({ success: true, module: user.modules[module], resources: user.resources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// craft P1
router.post('/craft/p1', async (req,res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'bad request' });
    const user = await User.ensure(telegramId, `u${telegramId}`);
    applyProduction(user);
    const need = { R1_1: 20, R1_2: 10, R1_3: 5 };
    for (const k of Object.keys(need)) {
      if ((user.resources[k] || 0) < need[k]) return res.status(400).json({ error: 'not enough resources', need });
    }
    for (const k of Object.keys(need)) user.resources[k] -= need[k];
    user.resources.P1 = (user.resources.P1 || 0) + 1;
    user.updatedAt = now();
    await User.save(telegramId, user);
    return res.json({ success: true, resources: user.resources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

export default router;
