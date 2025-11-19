// models/User.js
import db from '../db.js';

function now() { return Date.now(); }

const defaultUser = (telegramId, name) => ({
  telegramId,
  name,
  resources: {
    R1_1: 0, // iron ore
    R1_2: 0, // charcoal
    R1_3: 0, // water
    C1: 0,
    P1: 0
  },
  modules: {
    extractor: { level: 1, running: false, lastTick: now(), baseRate: 1 }, // R/sec
    smelter:   { level: 1, running: false, lastTick: now(), baseRate: 0.25 }, // converts R->C
    pump:      { level: 1, running: false, lastTick: now(), baseRate: 0.5 } // R/sec (water)
  },
  upgrades: {},
  createdAt: now(),
  updatedAt: now()
});

export default class User {
  static findByTelegram(id) {
    return db.data.users.find(u => u.telegramId === id);
  }

  static async create(data) {
    db.data.users.push(data);
    await db.write();
    return data;
  }

  static async save(id, newData) {
    const idx = db.data.users.findIndex(u => u.telegramId === id);
    if (idx === -1) return null;
    db.data.users[idx] = newData;
    await db.write();
    return db.data.users[idx];
  }

  // helper: ensure user exists
  static async ensure(telegramId, name) {
    let user = User.findByTelegram(telegramId);
    if (!user) {
      user = defaultUser(telegramId, name || ('u' + telegramId));
      await User.create(user);
    }
    return user;
  }
}
