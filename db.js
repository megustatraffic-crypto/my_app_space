import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'database.json');
const adapter = new JSONFile(dbFile);

// ОБЯЗАТЕЛЬНО: дефолтные данные
const defaultData = {
  users: {},
  planets: {},
  stats: {},
};

const db = new Low(adapter, defaultData);

await db.read();

// Если файл пустой — заполнить дефолтными данными
db.data ||= defaultData;

await db.write();

export default db;
