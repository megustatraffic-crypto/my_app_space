import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import db from './db.js';   // загружаем базу

import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// маршруты
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/shop', shopRoutes);

// health
app.get('/', (req,res)=> res.send('Cosmic Farm backend is up'));

const PORT = process.env.PORT || 3000;

// просто ждём пока lowdb прочитается, потом запускаем
await db.read();
app.listen(PORT, () => console.log('✅ Cosmic Farm backend started on', PORT));
