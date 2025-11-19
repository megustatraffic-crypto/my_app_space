// db.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'db.json');

if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({
    users: []
  }, null, 2));
}

const adapter = new JSONFile(file);
const db = new Low(adapter);

await db.read();
db.data ||= { users: [] };

export default db;
