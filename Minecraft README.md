Minecraft Forge MOD + FastAPI 連携プロジェクト
概要
このプロジェクトは、Minecraft Forge MODからPythonのFastAPIサーバーにプレイヤーのチャット発言や座標情報を送信し、AI（OpenAI GPT-3.5 Turbo）で生成したMinecraftコマンドをMODが受け取ってゲーム内で実行する仕組みです。

構成
FastAPIサーバー（Python）

OpenAI APIと連携してチャット内容と座標情報を受け取り、Minecraftコマンドを生成する。

/command エンドポイントにJSON形式のPOSTリクエストを受け付ける。

Minecraft Forge MOD（Java）

プレイヤーのチャットイベントを検知し、チャット内容・プレイヤーID・座標・視線座標をFastAPIサーバーに送信。

返ってきたコマンドをMinecraft内で実行。

使い方
FastAPIサーバー
Python 3.10以上推奨

openaiパッケージ最新版をインストール

環境変数 OPENAI_API_KEY にOpenAIのAPIキーを設定

FastAPIアプリ（main.py）を起動

bash
Copy
Edit
uvicorn main:app --reload
Forge MOD
Forge開発環境を構築（対応バージョン例：1.16.5）

MODのチャットイベントでプレイヤー情報を取得

HTTPクライアントでFastAPIサーバーの/commandにJSONでPOST

レスポンスのコマンドをゲーム内で実行

FastAPI 例: /command エンドポイント
python
Copy
Edit
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
Forge MOD イベント例 (Java)
java
Copy
Edit
@SubscribeEvent
public void onPlayerChat(ServerChatEvent event) {
    EntityPlayer player = event.getPlayer();
    String message = event.getMessage();
    BlockPos pos = player.getPosition();
    Vec3d lookVec = player.getLookVec();

    // JSON作成とHTTP送信処理（省略）

    // FastAPIから返ったコマンドをゲーム内で実行
    server.getCommandManager().handleCommand(server.getCommandSource(), command);
}
注意点
FastAPIサーバーはMODより先に起動しておくこと

ネットワーク接続（localhostなど）が確立されていること

Python・Javaそれぞれのバージョンや依存関係に注意

非同期処理やエラー処理は実装に応じて拡張推奨

今後の予定
MODの非同期HTTP通信実装

プレイヤーIDリスト管理による複数プレイヤー対応

GUIでサーバー状態やコマンドログの表示

セキュリティ対策とパフォーマンス最適化
