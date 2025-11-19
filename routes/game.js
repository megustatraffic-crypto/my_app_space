// routes/game.js
import express from "express";
import User from "../models/User.js";
const router = express.Router();

function now() { return Date.now(); }

// apply production since lastTick for each running module
function applyProduction(user) {
  const cur = now();

  // extractor -> produces R1_1 (iron) and R1_2 (charcoal) slightly
  const ex = user.modules.extractor;
  if (!ex.lastTick) ex.lastTick = cur;
  if (ex.running) {
    const dt = (cur - ex.lastTick) / 1000; // seconds
    const rate = ex.baseRate * Math.pow(1.15, ex.level - 1); // growth per level
    const amount = Math.floor(rate * dt);
    if (amount > 0) {
      user.resources.R1_1 += amount;
      // small charcoal from extractor
      user.resources.R1_2 += Math.floor(amount * 0.2);
      ex.lastTick = cur;
    }
  } else {
    ex.lastTick = cur;
  }

  const pump = user.modules.pump;
  if (!pump.lastTick) pump.lastTick = cur;
  if (pump.running) {
    const dt = (cur - pump.lastTick) / 1000;
    const rate = pump.baseRate * Math.pow(1.12, pump.level - 1);
    const amount = Math.floor(rate * dt);
    if (amount > 0) {
      user.resources.R1_3 += amount;
      pump.lastTick = cur;
    }
  } else pump.lastTick = cur;

  // smelter: consumes R1_1+R1_2 to produce C1 over time
  const sm = user.modules.smelter;
  if (!sm.lastTick) sm.lastTick = cur;
  if (sm.running) {
    const dt = (cur - sm.lastTick) / 1000;
    const rate = sm.baseRate * Math.pow(1.1, sm.level - 1); // C/sec
    const amount = Math.floor(rate * dt);
    // check if enough input resources exist, each C requires e.g. 5 iron + 2 charcoal
    const perC_iron = 5;
    const perC_char = 2;
    const maxPossible = Math.min(
      Math.floor(user.resources.R1_1 / perC_iron),
      Math.floor(user.resources.R1_2 / perC_char)
    );
    const produce = Math.min(amount, maxPossible);
    if (produce > 0) {
      user.resources.R1_1 -= produce * perC_iron;
      user.resources.R1_2 -= produce * perC_char;
      user.resources.C1 += produce;
      sm.lastTick = cur;
    } else {
      // nothing produced, still advance lastTick to avoid infinite loop
      sm.lastTick = cur;
    }
  } else sm.lastTick = cur;

  user.updatedAt = cur;
  return user;
}

// get full state (applies production)
router.get("/:telegramId", async (req, res) => {
  const tid = req.params.telegramId;
  const user = await User.ensure(tid, `u${tid}`);
  applyProduction(user);
  await User.save(tid, user);
  res.json({ success: true, user });
});

// tap: give one resource (manual tap on currently selected resource)
router.post("/tap", async (req, res) => {
  const { telegramId, resource } = req.body;
  if (!telegramId || !resource) return res.json({ error: "bad request" });
  const user = await User.ensure(telegramId, `u${telegramId}`);
  applyProduction(user);
  // manual tap gives small bonus, scale with extractor level
  const bonus = 1 + Math.floor(user.modules.extractor.level * 0.5);
  if (!(resource in user.resources)) return res.json({ error: "bad resource" });
  user.resources[resource] += bonus;
  user.updatedAt = now();
  await User.save(telegramId, user);
  res.json({ success: true, resources: user.resources });
});

// toggle module start/stop
router.post("/module/toggle", async (req, res) => {
  const { telegramId, module } = req.body;
  if (!telegramId || !module) return res.json({ error: "bad request" });
  const user = await User.ensure(telegramId, `u${telegramId}`);
  applyProduction(user);
  if (!user.modules[module]) return res.json({ error: "no such module" });
  user.modules[module].running = !user.modules[module].running;
  user.modules[module].lastTick = now();
  await User.save(telegramId, user);
  res.json({ success: true, module: user.modules[module] });
});

// upgrade module (cost simple: C1 or resources)
router.post("/module/upgrade", async (req, res) => {
  const { telegramId, module } = req.body;
  if (!telegramId || !module) return res.json({ error: "bad request" });
  const user = await User.ensure(telegramId, `u${telegramId}`);
  applyProduction(user);
  // example cost: C1 * (level * 10)
  const curLevel = user.modules[module].level;
  const cost = (curLevel) * 10;
  if ((user.resources.C1 || 0) < cost)
    return res.json({ error: "not enough components", need: cost });
  user.resources.C1 -= cost;
  user.modules[module].level += 1;
  user.updatedAt = now();
  await User.save(telegramId, user);
  res.json({ success: true, module: user.modules[module], resources: user.resources });
});

// craft final P1 from resources: require R1_1+R1_2+R1_3
router.post("/craft/p1", async (req, res) => {
  const { telegramId } = req.body;
  const user = await User.ensure(telegramId, `u${telegramId}`);
  applyProduction(user);
  const need = { R1_1: 20, R1_2: 10, R1_3: 5 }; // example recipe
  for (const k of Object.keys(need)) {
    if ((user.resources[k] || 0) < need[k]) return res.json({ error: "not enough resources", need });
  }
  for (const k of Object.keys(need)) user.resources[k] -= need[k];
  user.resources.P1 = (user.resources.P1 || 0) + 1;
  user.updatedAt = now();
  await User.save(telegramId, user);
  res.json({ success: true, resources: user.resources });
});

export default router;
