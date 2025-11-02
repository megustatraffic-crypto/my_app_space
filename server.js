// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';
import authRoutes from './routes/auth.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/game', gameRoutes);
app.use('/shop', shopRoutes);
app.use('/auth', authRoutes);

app.get('/', (req,res)=> res.send('Cosmic Farm backend is up'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('✅ Cosmic Farm backend started on', PORT));
