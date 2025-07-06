# Discord Code Explain Bot

このBotはDiscord上でプログラムコードを受け取り、OpenAIのGPTモデルを使ってコードの意味や動作をわかりやすく解説します。

---

## 機能

- `!explain` コマンドでコードを送信すると、そのコードの解説を返します  
- 複数行のコードやトリプルバッククオートで囲まれたコードも対応可能  
- GPT-4o や GPT-3.5-turbo モデルに対応（設定で切替可能）  

---

## 使い方

1. DiscordサーバーにBotを招待し、起動します。  

2. チャット欄に以下のように入力してください。

````plaintext
!explain
```python
print("Hello, world!")



3. Botがコードの解説を返信します。

---

## 環境構築とセットアップ

### 事前準備

- Python 3.10以上がインストールされていること  
- Discord Botトークン（Discord Developer Portalで取得）  
- OpenAI APIキー（[OpenAIアカウント](https://platform.openai.com/)から取得）  

### 必要なライブラリのインストール

```bash
pip install -r requirements.txt
```

`requirements.txt` の中身例:

```
discord.py
openai
python-dotenv
```

### `.env` ファイルの作成

```
DISCORD_BOT_TOKEN=あなたのDiscordBotトークン
OPENAI_API_KEY=あなたのOpenAI APIキー
```

### Botの起動

```bash
python bot.py
```

---

## モデル切り替え

`bot.py` 内の以下の部分を編集してモデルを切り替えます。

```python
response = openai_client.chat.completions.create(
    model="gpt-4o",  # または "gpt-3.5-turbo"
    ...
)
```

---

## 注意事項

- OpenAI APIの利用は課金が必要な場合があります。無料枠や料金プランは公式サイトでご確認ください。  
- BotのトークンやAPIキーは外部に漏らさないようご注意ください。  

---

## ライセンス

MIT License

---

## 作者

LIAR　Mail　im.spr.noob@gmail.com

---

何か質問や要望があればお気軽にIssueを立ててください！
```



