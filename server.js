// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import db from './db.js'; // ensures db loaded
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';
import extraRoutes from './routes/game_extra.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// serve frontend static
const frontendPath = path.join(__dirname, 'frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

// API mounts
app.use('/game', gameRoutes);
app.use('/shop', shopRoutes);
app.use('/game_extra', extraRoutes);

// planet config endpoint
app.get('/planet_config', (req,res)=>{
  const file = path.join(process.cwd(), 'data', 'planet_config.json');
  if (fs.existsSync(file)) {
    try {
      const txt = fs.readFileSync(file,'utf8');
      return res.json(JSON.parse(txt));
    } catch(e){
      return res.status(500).json({ error: 'bad_config', message: e.message });
    }
  }
  return res.status(404).json({ error: 'no_config' });
});

// health
app.get('/', (req,res)=> res.json({ ok:true, ts: Date.now() }));

// 404 JSON handler
app.use((req,res)=> res.status(404).json({ error: 'Not Found', path: req.originalUrl }));

// error handler
app.use((err, req, res, next)=> {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: 'server_error', message: err.message || String(err) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
