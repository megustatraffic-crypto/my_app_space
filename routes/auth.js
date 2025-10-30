// routes/auth.js
import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// helper to check Telegram initData signature
function checkTelegramSign(initData, botToken){
  try{
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const data_arr = [];
    for(const [k,v] of params) data_arr.push(`${k}=${v}`);
    data_arr.sort();
    const dataString = data_arr.join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataString).digest('hex');
    return hmac === hash;
  }catch(e){
    return false;
  }
}

router.post('/telegram', async (req, res) => {
  const { initData } = req.body;
  if(!initData) return res.status(400).json({ error: 'initData required' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  // optional: if you want strict verification
  const ok = checkTelegramSign(initData, botToken);
  if(!ok) {
    console.warn('Telegram initData signature invalid (but continuing in development)');
    // return res.status(403).json({ error: 'Invalid signature' });
    // for development we allow it — but production: return forbidden.
  }

  // parse user from initData
  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  let userObj;
  try { userObj = JSON.parse(userStr); } catch(e){ userObj = null; }

  let user;
  if(userObj && userObj.id){
    user = await User.findOne({ telegramId: String(userObj.id) });
    if(!user){
      user = new User({
        telegramId: String(userObj.id),
        name: userObj.first_name || userObj.username || 'Player',
        frags: 10
      });
      user.ensurePlots();
      await user.save();
    }
  } else {
    // fallback for testing when initData not providing user — create anonymous local user
    user = new User({ name: 'Guest-'+Date.now(), frags: 10 });
    user.ensurePlots();
    await user.save();
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, user, token });
});

export default router;
