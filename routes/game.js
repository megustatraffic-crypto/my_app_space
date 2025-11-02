// routes/game.js
import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.post('/state', async (req,res)=>{
  const { telegramId } = req.body;
  let user = await User.findOne({ telegramId });

  if(!user){
    user = await User.create({
      telegramId,
      frags: 0,
      tiles: Array(9).fill('empty'),
      drones: 0,
      quest: { harvested: 0 },
    });
  }

  res.json({ user });
});

router.post('/save', async (req,res)=>{
  const { telegramId, frags, tiles, drones } = req.body;

  const user = await User.findOneAndUpdate(
    { telegramId },
    { frags, tiles, drones }
  );

  res.json({ success: true, user });
});

export default router;
