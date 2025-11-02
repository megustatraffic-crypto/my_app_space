// routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "SECRET";

router.post('/telegram', async (req,res)=>{
  const { telegramId, name } = req.body;

  let user = await User.findOne({ telegramId });
  if(!user){
    user = await User.create({
      telegramId,
      name,
      frags: 0,
      drones: 0,
      tiles: Array(9).fill('empty'),
      quest: { harvested: 0 }
    });
  }

  const token = jwt.sign({ telegramId }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

export default router;
