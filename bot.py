import os
import threading
from flask import Flask
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://huquq-on.onrender.com")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kb = [[
        InlineKeyboardButton(
            "⚖️ HuquqONni ochish",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    ]]

    await update.message.reply_text(
        "HuquqON — huquqni tushunish va amalda qo‘llash platformasi.",
        reply_markup=InlineKeyboardMarkup(kb)
    )

server = Flask(__name__)

@server.route("/")
def home():
    return "HuquqON bot ishlayapti"

def run_server():
    port = int(os.environ.get("PORT", 10000))
    server.run(host="0.0.0.0", port=port)

threading.Thread(target=run_server, daemon=True).start()

app = Application.builder().token(os.environ["BOT_TOKEN"]).build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
