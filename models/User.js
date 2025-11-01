// models/User.js
import db from '../db.js';

class User {
  constructor(obj) {
    this.id = obj.id || Date.now().toString();
    this.telegramId = obj.telegramId || null;
    this.name = obj.name || 'Player';
    this.frags = obj.frags || 0;
    this.plots = obj.plots || [];
  }

  static async findOne(query) {
    await db.read();
    return db.data.users.find(u =>
      Object.keys(query).every(k => u[k] == query[k])
    ) || null;
  }

  async save() {
    await db.read();
    const existing = db.data.users.find(u => u.id === this.id);
    if (existing) {
      Object.assign(existing, this);
    } else {
      db.data.users.push(this);
    }
    await db.write();
  }

  ensurePlots() {
    if (!this.plots.length) this.plots = [ { id: 1, crop: null, ready: false } ];
  }
}

export default User;
