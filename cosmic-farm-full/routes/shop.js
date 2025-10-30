// routes/shop.js
import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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

// shop list (could be static)
const shopItems = [
  { id:'fert', name:'Fertilizer', price:5, description:'Speeds growth x2 for next plant', type:'consumable' },
  { id:'drone', name:'Water Drone', price:20, description:'Automatically water all plots for 1 minute', type:'consumable' },
  { id:'slot', name:'Extra Slot', price:30, description:'Increase farm grid size (applies on purchase)', type:'upgrade' },
  { id:'seedsX', name:'Super Seeds', price:50, description:'+3 Frags per harvest', type:'consumable' }
];

router.get('/items', (req,res)=> res.json({ items: shopItems }));

router.post('/buy', auth, async (req,res)=>{
  const { itemId } = req.body;
  const user = req.user;
  const item = shopItems.find(i=>i.id===itemId);
  if(!item) return res.status(400).json({ error:'no item' });
  if(user.frags < item.price) return res.status(400).json({ error:'not enough frags' });

  user.frags -= item.price;

  if(item.type === 'upgrade' && item.id==='slot') {
    user.farmSize = Math.min(6, user.farmSize + 1); // cap at 6
    user.ensurePlots();
  } else {
    // consumable: add to inventory
    const cur = user.inventory.get(itemId) || 0;
    user.inventory.set(itemId, cur + 1);
  }

  await user.save();
  res.json({ ok:true, item, user });
});

export default router;
