// models/User.js
import db from '../db.js';

class UserModel {
  static async findOne(query) {
    const keys = Object.keys(query);
    return db.data.users.find(u => keys.every(k => u[k] == query[k])) || null;
  }

  static async create(obj) {
    db.data.users.push(obj);
    await db.write();
    return obj;
  }

  static async findOneAndUpdate(query, update) {
    const keys = Object.keys(query);
    const user = db.data.users.find(u => keys.every(k => u[k] == query[k]));
    if (!user) return null;

    Object.assign(user, update);
    await db.write();
    return user;
  }
}

export default UserModel;
