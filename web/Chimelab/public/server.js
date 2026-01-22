const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// 静的ファイルの配信設定
app.use(express.static(__dirname));

// ルーティング設定
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/secret", (req, res) => {
  res.sendFile(path.join(__dirname, "secret.html"));
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  Chimelab Local Server is running!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
