// indexBot.js
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const WEBAPP_URL = "https://my-app-space-frontend.onrender.com";

bot.start((ctx) => {
    ctx.reply(
      "🌌 Welcome to Cosmic Farm!\nClick to play:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🚀 Open Game", web_app: { url: WEBAPP_URL } }
            ]
          ]
        }
      }
    );
});

bot.launch();
console.log("✅ Telegram Bot Started");
