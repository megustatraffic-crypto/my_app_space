// db.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

// seed basic db if missing
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    users: []
  }, null, 2));
}

const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter);
await db.read();
db.data ||= { users: [] };

export default db;
