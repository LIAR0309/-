from fastapi import FastAPI
from pydantic import BaseModel
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

class CommandRequest(BaseModel):
    text: str
    player_id: str
    player_pos: list
    look_pos: list

@app.post("/command")
async def generate_command(req: CommandRequest):
    prompt = (
    f"プレイヤー（ID: {req.player_id}）が次の発言をしました: 「{req.text}」\n"
    f"・「ここ」はプレイヤー自身の現在座標 {req.player_pos} を意味します。\n"
    f"・「あそこ」や「あれ」はプレイヤーの視線先ブロックの座標 {req.look_pos} を意味します。\n"
    "この発言を元に、適切なMinecraftコマンドを1行で作成してください。\n"
    f"例: /tp {req.player_id} 123 64 -45\n"
    "出力:"
)


    try:
        res = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        command = res.choices[0].message.content.strip()
        return {"command": command}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e), "type": type(e).__name__}



