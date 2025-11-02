// models/User.js
import db from '../db.js';

function shallowMatch(obj, query){
  return Object.keys(query).every(k => String(obj[k]) === String(query[k]));
}

class User {
  static async findOne(query){
    await db.read();
    return db.data.users.find(u => shallowMatch(u, query)) || null;
  }

  static async create(obj){
    await db.read();
    const toCreate = Object.assign({
      user_id: (obj.user_id || obj.telegramId || ("u"+Date.now())),
      name: obj.name || "Guest",
      frags: 0, level:1, drones:0, farm: Array(15).fill({status:"empty"}),
      profile: obj.profile || { name: obj.name || "Guest", avatar: obj.avatar || "" },
      quests: obj.quests || {}
    }, obj);
    db.data.users.push(toCreate);
    await db.write();
    return toCreate;
  }

  static async findOneAndUpdate(query, update){
    await db.read();
    const u = db.data.users.find(x => shallowMatch(x, query));
    if(!u) return null;
    Object.assign(u, update);
    await db.write();
    return u;
  }

  static async all(){
    await db.read();
    return db.data.users;
  }
}

export default User;
