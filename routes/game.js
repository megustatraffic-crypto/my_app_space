// routes/game.js
import express from "express";
import User from "../models/User.js";
const router = express.Router();

// GET FARM
router.get("/:telegramId", (req, res) => {
    const user = User.findByTelegram(req.params.telegramId);
    if (!user) return res.json({ error: "user not found" });
    res.json(user);
});

// PLANT
router.post("/plant", async (req, res) => {
    const { telegramId, index } = req.body;
    const user = User.findByTelegram(telegramId);
    user.fields[index] = { state: "growing", plantedAt: Date.now() };
    await User.save(telegramId, user);
    res.json({ success: true });
});

// HARVEST
router.post("/harvest", async (req, res) => {
    const { telegramId, index } = req.body;
    const user = User.findByTelegram(telegramId);
    user.fields[index] = { state: "empty", plantedAt: null };
    user.frags += 1;
    user.quests.harvested++;
    await User.save(telegramId, user);
    res.json({ success: true, frags: user.frags });
});

export default router;
