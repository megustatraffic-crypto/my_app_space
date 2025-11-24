// models/User.js
import db from '../db.js';
import { nanoid } from 'nanoid';

function now(){ return Date.now(); }

export function defaultUser(telegramId, name){
  return {
    id: nanoid(),
    telegramId: String(telegramId),
    name: name || `u${telegramId}`,
    resources: {
      R1_1: 0, R1_2: 0, R1_3: 0, C1: 0, P1: 0
    },
    modules: {
      extractor: { level: 1, running: false, lastTick: now(), baseRate: 0.8 },
      smelter: { level: 1, running: false, lastTick: now(), baseRate: 0.25 },
      pump: { level: 1, running: false, lastTick: now(), baseRate: 0.5 }
    },
    energy: 180,
    energyMax: 180,
    energyRegenIntervalSec: 8, // +1 energy every 8 seconds
    stars: 0,
    vip: false,
    offlineBoostUntil: 0,
    autoclickUntil: 0,
    lastSeen: now(),
    createdAt: now(),
    updatedAt: now()
  };
}

export default class UserModel {
  static findByTelegram(tid){ return db.data.users.find(u => u.telegramId === String(tid)); }

  static async ensure(telegramId, name){
    let u = UserModel.findByTelegram(telegramId);
    if (!u) {
      u = defaultUser(telegramId, name);
      db.data.users.push(u);
      await db.write();
    }
    return u;
  }

  static async save(user){
    const idx = db.data.users.findIndex(x => x.telegramId === String(user.telegramId));
    if (idx === -1) db.data.users.push(user);
    else db.data.users[idx] = user;
    await db.write();
    return user;
  }
}
