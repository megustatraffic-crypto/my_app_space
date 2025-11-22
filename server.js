// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';
import extraRoutes from './routes/game_extra.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// serve static frontend if you keep it in "frontend" folder (optional)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/', express.static(path.join(__dirname, 'frontend')));

app.use('/game', gameRoutes);
app.use('/shop', shopRoutes);
app.use('/game_extra', extraRoutes);

// 404 JSON handler
app.use((req,res)=> {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'server_error', message: err.message || String(err) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server listening on', PORT));
