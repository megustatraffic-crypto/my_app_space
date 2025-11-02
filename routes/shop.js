// routes/shop.js (simple server-side hook - does not validate payments)
import express from 'express';
import User from '../models/User.js';
const router = express.Router();

router.post('/buy', async (req,res)=>{
  const { user_id, itemId } = req.body;
  if(!user_id || !itemId) return res.json({ ok:false, error:"user_id and itemId required" });
  const user = await User.findOne({ user_id });
  if(!user) return res.json({ ok:false, error:"user not found" });

  // simple server-side apply
  if(itemId === 'drone_1'){
    user.drones = (user.drones||0) + 1;
    await User.findOneAndUpdate({ user_id }, user);
    return res.json({ ok:true, user });
  }
  if(itemId === 'farm_up'){
    user.level = Math.min(5, (user.level||1)+1);
    await User.findOneAndUpdate({ user_id }, user);
    return res.json({ ok:true, user });
  }
  // other items...
  res.json({ ok:false, error:"unknown item" });
});

export default router;
