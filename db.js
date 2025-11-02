// db.js — стабильная версия для Render

import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ЧТОБЫ ИСПРАВИТЬ ОШИБКУ: нельзя использовать process.cwd() на Render
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, "db.json");

// создаём файл, если его нет
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ users: [] }, null, 2));
}

const adapter = new JSONFile(dbFile);

// ВАЖНО: в lowdb v6 нельзя использовать await сверху.
// Делаем функцию initDB:
let db;

export async function initDB() {
  if (!db) {
    db = new Low(adapter, { users: [] });
    await db.read();
    if (!db.data) db.data = { users: [] };
    await db.write();
  }
  return db;
}

export default db;
