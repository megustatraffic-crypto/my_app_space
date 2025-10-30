// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/shop', shopRoutes);

// health
app.get('/', (req,res)=> res.send('Cosmic Farm backend is up'));

const PORT = process.env.PORT || 3000;
connectDB().then(()=>{
  app.listen(PORT, ()=> console.log('Server started on', PORT));
});
