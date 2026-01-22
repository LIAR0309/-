import discord
from discord.ext import commands
import re
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.command()
async def explain(ctx, *, code):
    # コードブロックを除去
    code = re.sub(r"```(?:\w*\n)?(.*?)```", r"\1", code, flags=re.DOTALL)
    
    prompt = f"以下のコードをわかりやすく解説してください。\n\nコード:\n{code}"
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3,
        )
        await ctx.send(f"コードの解説:\n{response.choices[0].message.content}")
    except Exception as e:
        await ctx.send(f"エラーが発生しました: {e}")

bot.run(os.getenv("DISCORD_BOT_TOKEN"))
