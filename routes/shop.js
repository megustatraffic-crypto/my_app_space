// routes/shop.js
import express from "express";
import User from "../models/User.js";
const router = express.Router();

router.post("/buy/drone", async (req, res) => {
  const { telegramId } = req.body;
  const user = User.findByTelegram(telegramId);

  if (user.frags < 10)
    return res.json({ error: "Not enough frags" });

  user.frags -= 10;
  user.drones += 1;
  user.quests.dronesBought++;

  await User.save(telegramId, user);
  res.json({ success: true, drones: user.drones, frags: user.frags });
});

export default router;
