// routes/game.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// простой middleware аутентификации по JWT (Authorization: Bearer <token>)
async function auth(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({ error: 'no auth' });
  const token = h.split(' ')[1];
  try{
    const data = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(data.id);
    if(!user) return res.status(401).json({ error: 'user not found' });
    req.user = user;
    next();
  }catch(e){
    return res.status(401).json({ error: 'invalid token' });
  }
}

router.get('/state', auth, async (req,res)=>{
  const user = req.user;
  user.ensurePlots();
  await user.save();
  res.json({ user });
});

// plant on plot index
router.post('/plant', auth, async (req,res)=>{
  const { index } = req.body;
  const user = req.user;
  user.ensurePlots();
  if(index<0 || index>=user.plots.length) return res.status(400).json({ error: 'invalid index' });
  const plot = user.plots[index];
  if(plot.status !== 'empty') return res.status(400).json({ error: 'not empty' });
  plot.status = 'growing';
  plot.plantedAt = Date.now();
  await user.save();
  res.json({ ok:true, user });
});

// collect matured
router.post('/collect', auth, async (req,res)=>{
  const user = req.user;
  user.ensurePlots();
  let gained=0;
  const now = Date.now();
  for(const p of user.plots){
    if(p.status === 'growing' && (now - p.plantedAt) > 3000){ // 3s grow (configurable)
      p.status = 'grown';
    }
    if(p.status === 'grown'){
      gained += 5;
      p.status = 'empty';
      p.plantedAt = 0;
    }
  }
  user.frags += gained;
  await user.save();
  res.json({ ok:true, gained, user });
});

// daily bonus
router.post('/daily', auth, async (req,res)=>{
  const user = req.user;
  const today = new Date().toDateString();
  if(user.lastDaily && new Date(user.lastDaily).toDateString() === today) {
    return res.json({ ok:false, msg:'already claimed' });
  }
  // simple reward progression
  user.frags += 3;
  user.lastDaily = new Date();
  await user.save();
  res.json({ ok:true, reward:3, user });
});

export default router;
