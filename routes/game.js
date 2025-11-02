// routes/game.js
import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET /game/state?user_id=...
router.get('/state', async (req,res)=>{
  const user_id = req.query.user_id;
  if(!user_id) return res.json({ ok:false, error:"user_id required" });
  let user = await User.findOne({ user_id });
  if(!user){
    user = await User.create({ user_id, name:"Guest" });
  }
  return res.json({ ok:true, user });
});

// POST /game/save
// body: { user_id, frags, level, drones, farm, profile, quests }
router.post('/save', async (req,res)=>{
  const body = req.body;
  if(!body || !body.user_id) return res.json({ ok:false, error:"user_id required" });
  const update = {
    frags: body.frags ?? 0,
    level: body.level ?? 1,
    drones: body.drones ?? 0,
    farm: Array.isArray(body.farm) ? body.farm : Array(15).fill({status:"empty"}),
    profile: body.profile ?? {},
    quests: body.quests ?? {}
  };
  let user = await User.findOneAndUpdate({ user_id: body.user_id }, update);
  if(!user){
    user = await User.create(Object.assign({ user_id: body.user_id }, update));
  }
  res.json({ ok:true, user });
});

// GET /game/leaderboard
router.get('/leaderboard', async (req,res)=>{
  const all = await User.all();
  const list = all.map(u => ({ user_id: u.user_id, name: u.profile?.name || u.name, frags: u.frags || 0 }))
                  .sort((a,b)=>b.frags - a.frags)
                  .slice(0,50);
  res.json({ ok:true, leaders: list });
});

export default router;
