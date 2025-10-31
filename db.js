import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const file = join(__dirname, 'db.json')

// если файла нет — создаём с начальными данными
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({ users: [], farms: [], shop: [] }, null, 2))
}

const adapter = new JSONFile(file)
const db = new Low(adapter, { users: [], farms: [], shop: [] })

// читаем базу
await db.read()
if (!db.data) db.data = { users: [], farms: [], shop: [] }

export default db
