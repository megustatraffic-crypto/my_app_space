// db.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';
import fs from 'fs';

const file = join(process.cwd(), 'db.json');

// если файла нет — создаём
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({ users: [] }, null, 2));
}

// создаём адаптер и базу
const adapter = new JSONFile(file);
const db = new Low(adapter);

// читаем базу
await db.read();

// если структура пустая — создаём
if (!db.data) db.data = { users: [] };

export default db;
