// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import gameRoutes from "./routes/game.js";
import shopRoutes from "./routes/shop.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/auth", authRoutes);
app.use("/game", gameRoutes);
app.use("/shop", shopRoutes);

// test
app.get("/", (req, res) => res.send("Cosmic Farm Backend Running ✅"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("✅ Backend running on", PORT));
