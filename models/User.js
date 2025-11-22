// models/User.js
import db from '../db.js';

function now(){ return Date.now(); }

const defaultUser = (telegramId, name) => ({
  telegramId: String(telegramId),
  name: name || `u${telegramId}`,
  resources: {
    R1_1: 0,
    R1_2: 0,
    R1_3: 0,
    C1: 0,
    P1: 0
  },
  modules: {
    extractor: { level: 1, running: false, lastTick: now(), baseRate: 1 },
    smelter:   { level: 1, running: false, lastTick: now(), baseRate: 0.25 },
    pump:      { level: 1, running: false, lastTick: now(), baseRate: 0.5 }
  },
  upgrades: { extractorSpeed:0, smelterSpeed:0, pumpSpeed:0 },
  stars: 0,
  vip: false,
  offlineBoostUntil: 0,
  lastSeen: now(),
  createdAt: now(),
  updatedAt: now()
});

export default class User {
  static findByTelegram(id){
    return db.data.users.find(u => u.telegramId === String(id));
  }

  static async create(data){
    db.data.users.push(data);
    await db.write();
    return data;
  }

  static async save(id, newData){
    const idx = db.data.users.findIndex(u => u.telegramId === String(id));
    if (idx === -1) return null;
    db.data.users[idx] = newData;
    await db.write();
    return db.data.users[idx];
  }

  static async ensure(telegramId, name){
    let user = User.findByTelegram(telegramId);
    if (!user) {
      user = defaultUser(telegramId, name);
      await User.create(user);
    }
    return user;
  }
}
