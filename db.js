import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'database.json');
const adapter = new JSONFile(dbFile);

const defaultData = {
  users: [],
  planets: {},
  stats: {}
};

const db = new Low(adapter);

// Ensure DB file exists (avoid race on first write on Render)
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2));
}

await db.read();
db.data ||= defaultData;
await db.write();

export default db;
