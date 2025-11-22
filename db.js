import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// путь к базе
const adapter = new JSONFile('./db.json')
const db = new Low(adapter, {
  users: [],
  planetProgress: {},
  resources: {},
  factories: {},
  settings: { version: 1 }
})

await db.read()
await db.write()

export default db
