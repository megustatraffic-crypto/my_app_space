// db.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';
import fs from 'fs';

const file = join(process.cwd(), 'db.json');
if(!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ users: [] }, null, 2));
const adapter = new JSONFile(file);
const db = new Low(adapter, { users: [] });
await db.read();
if(!db.data) db.data = { users: [] };
export default db;
