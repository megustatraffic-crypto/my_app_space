// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './db.js';
import UserModel, { defaultUser } from './models/User.js';
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';
import extraRoutes from './routes/game_extra.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// mounts
app.use('/game', gameRoutes);
app.use('/shop', shopRoutes);
app.use('/game_extra', extraRoutes);

// simple health
app.get('/', (req,res)=> res.json({ ok: true, ts: Date.now() }));

// 404 json
app.use((req,res)=> res.status(404).json({ error: 'Not Found', path: req.originalUrl }));

// error handler
app.use((err, req, res, next)=> {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: 'server_error', message: err.message || String(err) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
