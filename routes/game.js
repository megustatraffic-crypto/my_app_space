// routes/game.js
import express from 'express';
import db from '../db.js';
import UserModel from '../models/User.js';
import fs from 'fs';
import path from 'path';
const router = express.Router();

const CONFIG_FILE = path.join(process.cwd(), 'data', 'planet_config.json');
let PLANET_CFG = null;
if (fs.existsSync(CONFIG_FILE)) {
  PLANET_CFG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
} else {
  console.warn('planet_config.json not found at', CONFIG_FILE);
}

function now(){ return Date.now(); }

async function processUpgradesAndProduction(user) {
  // complete finished upgrades
  if (user.upgradesInProgress && user.upgradesInProgress.length) {
    const finished = [];
    for (const job of [...user.upgradesInProgress]) {
      if (job.endsAt <= now()) {
        const mod = user.modules[job.module];
        if (mod) mod.level = Math.max(mod.level, job.toLevel);
        user.upgradesInProgress = user.upgradesInProgress.filter(j => j !== job);
        finished.push(job);
      }
    }
    if (finished.length) {
      user.lastSeen = now();
    }
  }

  const cur = now();

  // extractor
  const ex = user.modules.extractor;
  if (!ex.lastTick) ex.lastTick = cur;
  if (ex.running && (!user.upgradesInProgress || !user.upgradesInProgress.find(j=>j.module==='extractor'))) {
    const dt = (cur - ex.lastTick) / 1000;
    const rate = (ex.baseRate || 0.8) * Math.pow(1.15, (ex.level || 1) - 1);
    const amount = Math.floor(rate * dt);
    if (amount > 0) {
      user.resources.R1_1 = (user.resources.R1_1 || 0) + amount;
      user.resources.R1_2 = (user.resources.R1_2 || 0) + Math.floor(amount * 0.18);
      ex.lastTick = cur;
    }
  } else ex.lastTick = cur;

  // pump
  const pump = user.modules.pump;
  if (!pump.lastTick) pump.lastTick = cur;
  if (pump.running && (!user.upgradesInProgress || !user.upgradesInProgress.find(j=>j.module==='pump'))) {
    const dt = (cur - pump.lastTick) / 1000;
    const rate = (pump.baseRate || 0.5) * Math.pow(1.12, (pump.level || 1) - 1);
    const amount = Math.floor(rate * dt);
    if (amount > 0) {
      user.resources.R1_3 = (user.resources.R1_3 || 0) + amount;
      pump.lastTick = cur;
    }
  } else pump.lastTick = cur;

  // smelter
  const sm = user.modules.smelter;
  if (!sm.lastTick) sm.lastTick = cur;
  if (sm.running && (!user.upgradesInProgress || !user.upgradesInProgress.find(j=>j.module==='smelter'))) {
    const dt = (cur - sm.lastTick) / 1000;
    const rate = (sm.baseRate || 0.25) * Math.pow(1.10, (sm.level || 1) - 1);
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

  // autoclicker simulation (server-side tick)
  if (user.autoclickUntil && user.autoclickUntil > now()) {
    // produce tap-equivalents since lastTick
    user._autoLast = user._autoLast || now();
    const dt = Math.floor((cur - user._autoLast)/1000);
    if (dt > 0) {
      const taps = dt * 1; // conservative 1 tap/sec to avoid abuse
      // apply taps to selected resource (fallback R1_1)
      const target = 'R1_1';
      user.resources[target] = (user.resources[target] || 0) + taps;
      user._autoLast = cur;
    }
  } else {
    user._autoLast = now();
  }

  // energy regen
  if (!user._energyLast) user._energyLast = cur;
  const interval = (user.energyRegenIntervalSec || 8) * 1000;
  if (cur - user._energyLast >= interval) {
    const times = Math.floor((cur - user._energyLast) / interval);
    user.energy = Math.min(user.energyMax, (user.energy || 0) + times);
    user._energyLast += times * interval;
  }

  user.lastSeen = cur;
  user.updatedAt = cur;

  await UserModel.save(user);
  return user;
}

// GET state
router.get('/:telegramId', async (req,res) => {
  const tid = req.params.telegramId;
  if (!tid) return res.status(400).json({ error: 'missing id' });
  const user = await UserModel.ensure(tid, `u${tid}`);
  await processUpgradesAndProduction(user);
  return res.json({ success: true, user });
});

// TAP
router.post('/tap', async (req,res) => {
  const { telegramId, resource, gain } = req.body;
  if (!telegramId || !resource) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  await processUpgradesAndProduction(user);
  if ((user.energy || 0) <= 0) return res.status(400).json({ error: 'no_energy' });
  const bonus = 1 + Math.floor(((user.modules?.extractor?.level || 1) - 1) * 0.1);
  const actualGain = (typeof gain === 'number' ? gain : 1) * bonus;
  const map = { R1_1:'R1_1', R1_2:'R1_2', R1_3:'R1_3', iron:'R1_1', charcoal:'R1_2', water:'R1_3' };
  const key = map[resource] || resource;
  if (!(key in user.resources)) return res.status(400).json({ error: 'bad_resource' });
  user.resources[key] = (user.resources[key] || 0) + actualGain;
  user.energy = Math.max(0, (user.energy||0) - (user.energyCostPerTap || 1));
  await UserModel.save(user);
  return res.json({ success:true, resources: user.resources, energy: user.energy });
});

// toggle module
router.post('/module/toggle', async (req,res) => {
  const { telegramId, module } = req.body;
  if (!telegramId || !module) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  await processUpgradesAndProduction(user);
  if (!user.modules[module]) return res.status(400).json({ error: 'no module' });
  if (user.upgradesInProgress && user.upgradesInProgress.find(j=>j.module===module)) {
    return res.status(400).json({ error: 'module_upgrading' });
  }
  user.modules[module].running = !user.modules[module].running;
  user.modules[module].lastTick = now();
  await UserModel.save(user);
  return res.json({ success:true, module: user.modules[module] });
});

// start upgrade
router.post('/module/upgrade', async (req,res) => {
  const { telegramId, module } = req.body;
  if (!telegramId || !module) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  await processUpgradesAndProduction(user);
  if (!user.modules[module]) return res.status(400).json({ error: 'no module' });
  const curLvl = user.modules[module].level || 1;
  const MAX = (PLANET_CFG?.global?.maxModuleLevel) || 10;
  if (curLvl >= MAX) return res.status(400).json({ error: 'max_level' });
  const baseCost = (user.modules[module].baseCost || 200);
  const cfgMul = PLANET_CFG?.global?.upgrade?.cost_multiplier || 2.4;
  const cost = Math.floor(baseCost * Math.pow(cfgMul, curLvl - 1));
  if ((user.resources.C1 || 0) < cost) return res.status(400).json({ error: 'not_enough_components', need: cost });
  user.resources.C1 -= cost;
  const baseTime = PLANET_CFG?.global?.upgrade?.time_base_sec || 30;
  const timeMul = PLANET_CFG?.global?.upgrade?.time_multiplier || 3;
  const durationSec = Math.round(baseTime * Math.pow(timeMul, curLvl - 1));
  const endsAt = now() + durationSec * 1000;
  user.upgradesInProgress = user.upgradesInProgress || [];
  user.upgradesInProgress.push({ module, fromLevel: curLvl, toLevel: curLvl + 1, endsAt });
  user.modules[module].running = false;
  await UserModel.save(user);
  return res.json({ success:true, module: module, endsAt, durationSec });
});

// finish upgrade using stars
router.post('/module/finish_upgrade', async (req,res) => {
  const { telegramId, module } = req.body;
  if (!telegramId || !module) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  await processUpgradesAndProduction(user);
  user.upgradesInProgress = user.upgradesInProgress || [];
  const job = user.upgradesInProgress.find(j => j.module === module);
  if (!job) return res.status(400).json({ error: 'no_upgrade_in_progress' });
  const remainingSec = Math.max(0, Math.ceil((job.endsAt - now()) / 1000));
  const starsCost = Math.max(1, Math.ceil(remainingSec / 30));
  if ((user.stars || 0) < starsCost) return res.status(400).json({ error: 'not_enough_stars', need: starsCost });
  user.stars -= starsCost;
  const mod = user.modules[job.module];
  if (mod) mod.level = Math.max(mod.level, job.toLevel);
  user.upgradesInProgress = user.upgradesInProgress.filter(j => j !== job);
  await UserModel.save(user);
  return res.json({ success:true, starsSpent: starsCost, module: job.module, newLevel: mod.level, stars: user.stars });
});

// craft P1
router.post('/craft/p1', async (req,res) => {
  const { telegramId } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  await processUpgradesAndProduction(user);
  const cfg = PLANET_CFG?.planets?.find(p => p.id === 'P1');
  const recipe = cfg?.crafts?.P1?.recipe || { R1_1: 100, R1_2: 60, R1_3: 40 };
  for (const k of Object.keys(recipe)) {
    if ((user.resources[k] || 0) < recipe[k]) return res.status(400).json({ error: 'not_enough_resources', need: recipe });
  }
  for (const k of Object.keys(recipe)) user.resources[k] -= recipe[k];
  user.planetCores = user.planetCores || {};
  user.planetCores.P1 = (user.planetCores.P1 || 0) + 1;
  await UserModel.save(user);
  return res.json({ success:true, planetCores: user.planetCores, resources: user.resources });
});

// list upgrades
router.get('/upgrades/:telegramId', async (req,res) => {
  const tid = req.params.telegramId;
  if (!tid) return res.status(400).json({ error: 'missing id' });
  const user = await UserModel.ensure(tid, `u${tid}`);
  await processUpgradesAndProduction(user);
  return res.json({ success:true, upgrades: user.upgradesInProgress || [] });
});

// unlock next planet using cores
router.post('/unlock_next', async (req,res) => {
  const { telegramId } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'bad request' });
  const user = await UserModel.ensure(telegramId, `u${telegramId}`);
  await processUpgradesAndProduction(user);
  user.unlockedPlanets = user.unlockedPlanets || ['P1'];
  const currentIndex = user.unlockedPlanets.length;
  const nextPlanet = PLANET_CFG?.planets?.find(p => p.index === currentIndex + 1);
  if (!nextPlanet) return res.status(400).json({ error: 'no_more_planets' });
  const reqs = nextPlanet.unlock?.toNextPlanetRequires || {};
  for (const k of Object.keys(reqs)) {
    const need = reqs[k];
    if (k.startsWith('P')) {
      const have = user.planetCores?.[k] || 0;
      if (have < need) return res.status(400).json({ error: 'not_enough_cores', need });
    } else {
      const have = user.resources?.[k] || 0;
      if (have < need) return res.status(400).json({ error: 'not_enough_resource', need });
    }
  }
  for (const k of Object.keys(reqs)) {
    const need = reqs[k];
    if (k.startsWith('P')) {
      user.planetCores = user.planetCores || {};
      user.planetCores[k] = (user.planetCores[k] || 0) - need;
    } else {
      user.resources[k] = (user.resources[k] || 0) - need;
    }
  }
  user.unlockedPlanets.push(nextPlanet.id);
  await UserModel.save(user);
  return res.json({ success:true, unlocked: nextPlanet.id, unlockedPlanets: user.unlockedPlanets });
});

export default router;
