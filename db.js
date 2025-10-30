import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node' // не трогаем — lowdb 3+ корректно подхватит
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const file = join(__dirname, 'db.json')

// если файла нет — создаём с базовой структурой
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({ users: [] }, null, 2))
}

// создаём адаптер и базу
const adapter = new JSONFile(file)
const db = new Low(adapter, { users: [] })

// читаем базу
await db.read()
if (!db.data) db.data = { users: [] }

export default db
