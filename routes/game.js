// routes/game.js
import express from 'express'
import User from '../models/User.js'
const router = express.Router()

// GET → получить игровое состояние
router.get('/state', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.json({ ok: false, msg: "No user ID" })

  let user = await User.findOne({ tgId: user_id })
  if (!user) {
    user = await User.create({
      tgId: user_id,
      frags: 0,
      farm: Array(9).fill("empty"),
      inventory: []
    })
  }

  res.json({
    ok: true,
    frags: user.frags,
    farm: user.farm,
    inventory: user.inventory
  })
})

// POST → сохранить состояние
router.post('/save', async (req, res) => {
  const { user_id, frags, farm, inventory } = req.body
  if (!user_id) return res.json({ ok: false })

  await User.findOneAndUpdate(
    { tgId: user_id },
    { frags, farm, inventory },
    { upsert: true }
  )

  res.json({ ok: true })
})

export default router
