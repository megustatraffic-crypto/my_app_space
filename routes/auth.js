// routes/auth.js
import express from "express";
import User from "../models/User.js";
const router = express.Router();

router.post("/telegram", async (req, res) => {
  const { telegram_id, name } = req.body;

  let user = User.findByTelegram(telegram_id);
  if (!user) {
    user = {
      telegramId: telegram_id,
      name,
      frags: 10,
      level: 1,
      drones: 0,
      fields: Array(9).fill({ state: "empty", plantedAt: null }),
      quests: { harvested: 0, dronesBought: 0 }
    };
    await User.create(user);
  }

  res.json({ success: true, user });
});

export default router;
