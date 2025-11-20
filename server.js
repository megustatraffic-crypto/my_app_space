import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";

import gameRoutes from "./routes/game.js";
import shopRoutes from "./routes/shop.js";
import extraRoutes from "./routes/game_extra.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Serve static frontend if you place frontend folder in the same repo
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "frontend")));

app.use("/game", gameRoutes);
app.use("/shop", shopRoutes);
app.use("/game_extra", extraRoutes);

// health
app.get("/", (req, res) => res.json({ ok: true, msg: "Cosmic Farm Backend Running ✅" }));

// 404 JSON handler (important — prevents HTML 'Not Found' responses)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "server_error", message: err.message || String(err) });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("✅ Backend running on", PORT));
