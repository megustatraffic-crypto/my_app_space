// models/User.js
import db from '../db.js';

export default class User {
    static findByTelegram(id) {
        return db.data.users.find(u => u.telegramId === id);
    }

    static create(data) {
        db.data.users.push(data);
        return db.write();
    }

    static save(id, newData) {
        let u = db.data.users.find(u => u.telegramId === id);
        if (!u) return;
        Object.assign(u, newData);
        return db.write();
    }
}
