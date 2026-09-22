import os
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes
WEBAPP_URL=os.environ.get('WEBAPP_URL','https://YOUR-DOMAIN.example')
async def start(update:Update,context:ContextTypes.DEFAULT_TYPE):
    kb=[[InlineKeyboardButton('⚖️ HuquqONni ochish',web_app=WebAppInfo(url=WEBAPP_URL))]]
    await update.message.reply_text('HuquqON — huquqni tushunish va amalda qo‘llash platformasi.',reply_markup=InlineKeyboardMarkup(kb))
app=Application.builder().token(os.environ['BOT_TOKEN']).build();app.add_handler(CommandHandler('start',start));app.run_polling()
