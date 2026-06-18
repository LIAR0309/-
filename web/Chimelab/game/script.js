/* ========================================
   Jump Runner - 8-bit Endless Run Game
   ======================================== */

// ===== Firebase 初期化 =====
const firebaseConfig = {
  apiKey: "AIzaSyBPDT08i94iJgctYHCvR3O_qG5-RrrrxiQ",
  authDomain: "chimelab-game.firebaseapp.com",
  projectId: "chimelab-game",
  storageBucket: "chimelab-game.firebasestorage.app",
  messagingSenderId: "351372638574",
  appId: "1:351372638574:web:edfaf1104db3d519cc697f",
  measurementId: "G-GFBF8L65MZ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rankingsRef = db.collection('rankings');

// ===== DOM要素の取得 =====
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const rankingScreen = document.getElementById('ranking-screen');
const hud = document.getElementById('hud');
const currentScoreEl = document.getElementById('current-score');
const finalScoreEl = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');
const rankingListEl = document.getElementById('ranking-list');
const rankingForm = document.getElementById('ranking-form');
const playerNameInput = document.getElementById('player-name');
const btnStart = document.getElementById('btn-start');
const btnRanking = document.getElementById('btn-ranking');
const btnRestart = document.getElementById('btn-restart');
const btnTitle = document.getElementById('btn-title');
const btnHome = document.getElementById('btn-home');
const gameoverButtons = document.getElementById('gameover-buttons');
const btnBack = document.getElementById('btn-back');
const btnRegister = document.getElementById('btn-register');
const btnSkip = document.getElementById('btn-skip');

// ===== モバイル判定 =====
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || ('ontouchstart' in window && window.innerWidth <= 768);

// ===== ゲーム定数（モバイル時は高速化） =====
const GRAVITY = isMobile ? 0.75 : 0.6;             // 重力加速度
const JUMP_FORCE = isMobile ? -14 : -12;            // ジャンプ力（負の値で上方向）
const INITIAL_SPEED = isMobile ? 7 : 5;             // 初期スクロール速度
const SPEED_INCREMENT = isMobile ? 0.002 : 0.001;   // フレーム毎の加速度
const GROUND_RATIO = 0.85;     // 地面の高さ（canvas高さに対する比率）
const MIN_OBSTACLE_GAP = 60;   // 障害物生成の最小間隔（フレーム数）
const MAX_OBSTACLE_GAP = 120;  // 障害物生成の最大間隔（フレーム数）
const STORAGE_KEY = 'jumprunner_ranking'; // localStorageキー（フォールバック用）

// ===== ゲーム状態 =====
let gameState = 'start';  // 'start' | 'playing' | 'gameover'
let score = 0;
let highScore = 0;
let speed = INITIAL_SPEED;
let frameCount = 0;
let nextObstacleFrame = 0;
let lastTimestamp = 0;
let animationId = null;
let currentDisplayScore = -1;

// ===== 地面の高さ（リサイズ時に更新） =====
let groundY = 0;

// ===== プレイヤーオブジェクト =====
const player = {
  x: 0,
  y: 0,
  width: 30,
  height: 36,
  vy: 0,         // 垂直方向の速度
  isJumping: false,
  // 8bit風キャラの色
  bodyColor: '#e74c3c',
  eyeColor: '#fff',
  pupilColor: '#222',
};

// ===== 障害物配列 =====
let obstacles = [];

// ===== 背景装飾（地面のドット、雲） =====
let clouds = [];
let groundDots = [];

// ===== Canvasサイズ調整 =====
function resizeCanvas() {
  const wrapper = document.getElementById('game-wrapper');
  if (canvas.width === wrapper.clientWidth && canvas.height === wrapper.clientHeight) {
    return;
  }
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
  groundY = canvas.height * GROUND_RATIO;

  // プレイヤー位置更新
  player.x = canvas.width * 0.15;
  if (!player.isJumping) {
    player.y = groundY - player.height;
  }

  // 背景装飾を再生成
  generateClouds();
  generateGroundDots();
}

// 雲を生成
function generateClouds() {
  clouds = [];
  const numClouds = Math.floor(canvas.width / 200) + 2;
  for (let i = 0; i < numClouds; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: 20 + Math.random() * (groundY * 0.3),
      width: 40 + Math.random() * 30,
      height: 15 + Math.random() * 10,
      speed: 0.3 + Math.random() * 0.5,
    });
  }
}

// 地面のドットパターンを生成
function generateGroundDots() {
  groundDots = [];
  for (let x = 0; x < canvas.width; x += 12) {
    if (Math.random() > 0.5) {
      groundDots.push({
        x: x,
        y: groundY + 5 + Math.random() * (canvas.height - groundY - 10),
        size: 1 + Math.random() * 2,
      });
    }
  }
}

// ===== 描画関数群 =====

// 背景を描画
function drawBackground() {
  // 背景クリア（fillRectより高速）
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 雲を描画
  ctx.fillStyle = '#eee';
  clouds.forEach(cloud => {
    // ピクセル風の雲（角丸なしの四角形組み合わせ）
    const cx = Math.floor(cloud.x);
    const cy = Math.floor(cloud.y);
    const cw = Math.floor(cloud.width);
    const ch = Math.floor(cloud.height);
    ctx.fillRect(cx, cy, cw, ch);
    ctx.fillRect(cx + Math.floor(cw * 0.2), cy - Math.floor(ch * 0.4), Math.floor(cw * 0.6), Math.floor(ch * 0.4));
    ctx.fillRect(cx - Math.floor(cw * 0.1), cy + Math.floor(ch * 0.2), Math.floor(cw * 0.3), Math.floor(ch * 0.3));
  });

  // 地面ライン
  ctx.fillStyle = '#333';
  ctx.fillRect(0, Math.floor(groundY), canvas.width, 2);

  // 地面のドット
  ctx.fillStyle = '#ccc';
  groundDots.forEach(dot => {
    ctx.fillRect(Math.floor(dot.x), Math.floor(dot.y), Math.floor(dot.size), Math.floor(dot.size));
  });
}

// プレイヤーを描画（8bit風キャラクター）
function drawPlayer() {
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  const pw = Math.floor(player.width);
  const ph = Math.floor(player.height);

  // 体（メインカラー）
  ctx.fillStyle = player.bodyColor;
  ctx.fillRect(px, py, pw, ph);

  // 目（白部分）
  const eyeSize = 8;
  const eyeX = px + pw - eyeSize - 4;
  const eyeY = py + 6;
  ctx.fillStyle = player.eyeColor;
  ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize);

  // 瞳
  const pupilSize = 4;
  ctx.fillStyle = player.pupilColor;
  ctx.fillRect(eyeX + eyeSize - pupilSize, eyeY + eyeSize - pupilSize, pupilSize, pupilSize);

  // 足（走るアニメーション）
  const legOffset = Math.floor(frameCount / 6) % 2;
  ctx.fillStyle = '#c0392b';
  if (!player.isJumping) {
    // 走るモーション（左右の足を交互に）
    if (legOffset === 0) {
      ctx.fillRect(px + 2, py + ph, 8, 4);
      ctx.fillRect(px + pw - 10, py + ph - 2, 8, 2);
    } else {
      ctx.fillRect(px + 2, py + ph - 2, 8, 2);
      ctx.fillRect(px + pw - 10, py + ph, 8, 4);
    }
  } else {
    // ジャンプ中は足を縮める
    ctx.fillRect(px + 4, py + ph, 6, 2);
    ctx.fillRect(px + pw - 10, py + ph, 6, 2);
  }
}

// 障害物を描画（8bit風ブロック）
function drawObstacles() {
  obstacles.forEach(obs => {
    const ox = Math.floor(obs.x);
    const oy = Math.floor(obs.y);
    const ow = Math.floor(obs.width);
    const oh = Math.floor(obs.height);

    // メイン
    ctx.fillStyle = '#222';
    ctx.fillRect(ox, oy, ow, oh);

    // ハイライト（左上に明るい線）
    ctx.fillStyle = '#555';
    ctx.fillRect(ox, oy, ow, 3);
    ctx.fillRect(ox, oy, 3, oh);

    // 影（右下に暗い線）
    ctx.fillStyle = '#000';
    ctx.fillRect(ox + ow - 2, oy, 2, oh);
    ctx.fillRect(ox, oy + oh - 2, ow, 2);

    // 模様（ピクセルパターン）
    ctx.fillStyle = '#444';
    const patternSize = 4;
    for (let py = oy + 8; py < oy + oh - 8; py += patternSize * 2) {
      for (let px = ox + 6; px < ox + ow - 6; px += patternSize * 2) {
        ctx.fillRect(px, py, patternSize, patternSize);
      }
    }
  });
}

// ===== ゲームロジック =====

// プレイヤーの更新
function updatePlayer() {
  // 重力を適用
  player.vy += GRAVITY;
  player.y += player.vy;

  // 地面判定
  if (player.y >= groundY - player.height) {
    player.y = groundY - player.height;
    player.vy = 0;
    player.isJumping = false;
  }
}

// ジャンプ処理
function jump() {
  if (!player.isJumping && gameState === 'playing') {
    player.vy = JUMP_FORCE;
    player.isJumping = true;
  }
}

// 障害物の生成
function spawnObstacle() {
  const minW = 20;
  const maxW = 40;
  const minH = 30;
  const maxH = 60;
  const width = minW + Math.random() * (maxW - minW);
  const height = minH + Math.random() * (maxH - minH);

  obstacles.push({
    x: canvas.width + 10,
    y: groundY - height,
    width: width,
    height: height,
  });
}

// 障害物の更新
function updateObstacles() {
  // 移動
  obstacles.forEach(obs => {
    obs.x -= speed;
  });

  // 画面外の障害物を削除
  obstacles = obstacles.filter(obs => obs.x + obs.width > -10);

  // 新しい障害物を生成
  frameCount++;
  if (frameCount >= nextObstacleFrame) {
    spawnObstacle();
    // 次の生成タイミング（速度が上がると間隔が短くなる）
    const gapReduction = Math.min(speed * 2, 40);
    const minGap = Math.max(MIN_OBSTACLE_GAP - gapReduction, 30);
    const maxGap = Math.max(MAX_OBSTACLE_GAP - gapReduction, 50);
    nextObstacleFrame = frameCount + minGap + Math.random() * (maxGap - minGap);
  }
}

// 雲の更新
function updateClouds() {
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed;
    if (cloud.x + cloud.width < 0) {
      cloud.x = canvas.width + Math.random() * 100;
      cloud.y = 20 + Math.random() * (groundY * 0.3);
    }
  });
}

// 地面ドットの更新（スクロール）
function updateGroundDots() {
  groundDots.forEach(dot => {
    dot.x -= speed;
    if (dot.x < 0) {
      dot.x = canvas.width + Math.random() * 20;
      dot.y = groundY + 5 + Math.random() * (canvas.height - groundY - 10);
    }
  });
}

// 当たり判定（AABB）
function checkCollision() {
  // プレイヤーの当たり判定を少し小さくして優しめに
  const margin = 4;
  const px = player.x + margin;
  const py = player.y + margin;
  const pw = player.width - margin * 2;
  const ph = player.height - margin * 2;

  for (const obs of obstacles) {
    if (
      px < obs.x + obs.width &&
      px + pw > obs.x &&
      py < obs.y + obs.height &&
      py + ph > obs.y
    ) {
      return true;
    }
  }
  return false;
}

// スコア更新
function updateScore() {
  score += speed * 0.1;
  const displayScore = Math.floor(score);
  if (displayScore !== currentDisplayScore) {
    currentScoreEl.textContent = 'Score: ' + displayScore;
    currentDisplayScore = displayScore;
  }
}

// スピード増加
function updateSpeed() {
  speed += SPEED_INCREMENT;
}

// ===== ゲームメインループ =====
function gameLoop(timestamp) {
  if (gameState !== 'playing') return;

  // deltaTimeで速度を安定化（オプション：シンプルさのため固定フレームに近い形で）
  updatePlayer();
  updateObstacles();
  updateClouds();
  updateGroundDots();
  updateSpeed();
  updateScore();

  // 衝突チェック
  if (checkCollision()) {
    gameOver();
    return;
  }

  // 描画
  drawBackground();
  drawObstacles();
  drawPlayer();

  // 次フレーム
  animationId = requestAnimationFrame(gameLoop);
}

// ===== ゲーム状態管理 =====

// ゲーム開始
function startGame() {
  gameState = 'playing';
  score = 0;
  speed = INITIAL_SPEED;
  frameCount = 0;
  nextObstacleFrame = 60; // 最初の障害物は少し後に
  obstacles = [];

  // プレイヤー位置リセット
  player.y = groundY - player.height;
  player.vy = 0;
  player.isJumping = false;
  currentDisplayScore = -1;

  // UI切り替え
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  rankingScreen.classList.add('hidden');
  hud.classList.remove('hidden');

  // ハイスコア読み込み（非同期、バックグラウンドで取得）
  getHighScore().then(hs => { highScore = hs; }).catch(() => { });

  // ループ開始
  animationId = requestAnimationFrame(gameLoop);
}

// ゲームオーバー
async function gameOver() {
  gameState = 'gameover';
  cancelAnimationFrame(animationId);

  const finalScore = Math.floor(score);

  // UI表示（まず即座に表示）
  finalScoreEl.textContent = finalScore;
  highScoreEl.textContent = '...';
  hud.classList.add('hidden');
  gameoverScreen.classList.remove('hidden');

  // ランキング登録フォーム表示
  rankingForm.classList.remove('hidden');
  gameoverButtons.classList.add('hidden');
  playerNameInput.value = '';
  playerNameInput.focus();

  // Firestoreからハイスコアを非同期で取得して更新
  try {
    highScore = await getHighScore();
    if (finalScore > highScore) {
      highScore = finalScore;
    }
    highScoreEl.textContent = highScore;
  } catch (e) {
    console.warn('ハイスコア取得に失敗:', e);
    highScoreEl.textContent = '-';
  }
}

// ===== ランキング機能（Firebase Firestore） =====

// ランキングデータを取得（TOP10、スコア降順）
async function getRanking() {
  try {
    const snapshot = await rankingsRef
      .orderBy('score', 'desc')
      .limit(10)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (e) {
    console.warn('ランキング取得に失敗（Firestore）:', e);
    // フォールバック: localStorage
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e2) {
      return [];
    }
  }
}

// ハイスコアを取得
async function getHighScore() {
  try {
    const snapshot = await rankingsRef
      .orderBy('score', 'desc')
      .limit(1)
      .get();
    if (snapshot.empty) return 0;
    return snapshot.docs[0].data().score;
  } catch (e) {
    console.warn('ハイスコア取得に失敗:', e);
    return 0;
  }
}

// ランキングにスコアを登録（同一名は最高記録のみ保持）
async function registerScore(name, scoreValue) {
  const playerName = name || 'ANONYMOUS';
  const dateStr = new Date().toLocaleDateString('ja-JP');

  try {
    // 同じ名前の既存レコードを検索
    const existing = await rankingsRef
      .where('name', '==', playerName)
      .get();

    if (!existing.empty) {
      // 既存レコードがある場合、最高スコアのみ更新
      const doc = existing.docs[0];
      const currentScore = doc.data().score;
      if (scoreValue > currentScore) {
        await doc.ref.update({
          score: scoreValue,
          date: dateStr
        });
      }
      // 既に高いスコアが登録済みなら何もしない
    } else {
      // 新規登録
      await rankingsRef.add({
        name: playerName,
        score: scoreValue,
        date: dateStr
      });
    }
  } catch (e) {
    console.warn('スコア登録に失敗（Firestore）:', e);
    // フォールバック: localStorage
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const ranking = data ? JSON.parse(data) : [];
      ranking.push({ name: playerName, score: scoreValue, date: dateStr });
      ranking.sort((a, b) => b.score - a.score);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ranking.slice(0, 10)));
    } catch (e2) {
      console.warn('localStorageへのフォールバックも失敗:', e2);
    }
  }
}

// ランキング画面を描画
async function renderRankingList() {
  rankingListEl.innerHTML = '<p class="ranking-empty">LOADING...</p>';

  const ranking = await getRanking();

  rankingListEl.innerHTML = '';

  if (ranking.length === 0) {
    rankingListEl.innerHTML = '<p class="ranking-empty">NO DATA</p>';
    return;
  }

  ranking.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'ranking-item';
    item.innerHTML = `
      <span class="rank-number">${index + 1}.</span>
      <span class="rank-name">${escapeHtml(entry.name)}</span>
      <span class="rank-score">${entry.score}</span>
    `;
    rankingListEl.appendChild(item);
  });
}

// HTMLエスケープ（XSS対策）
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== 画面遷移 =====

// ランキング画面を表示
async function showRankingScreen() {
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  rankingScreen.classList.remove('hidden');
  await renderRankingList();
}

// スタート画面に戻る
function showStartScreen() {
  gameState = 'start';
  rankingScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');

  // 背景を描画しておく
  drawBackground();
}

// ===== イベントリスナー =====

// Startボタン
btnStart.addEventListener('click', () => {
  startGame();
});

// Rankingボタン
btnRanking.addEventListener('click', () => {
  showRankingScreen();
});

// Backボタン
btnBack.addEventListener('click', () => {
  showStartScreen();
});

// Restartボタン
btnRestart.addEventListener('click', () => {
  startGame();
});

// ランキング登録ボタン
btnRegister.addEventListener('click', async () => {
  const name = playerNameInput.value.trim();
  const finalScore = Math.floor(score);
  btnRegister.disabled = true;
  btnRegister.textContent = '...';
  await registerScore(name, finalScore);
  btnRegister.disabled = false;
  btnRegister.textContent = '登録';
  rankingForm.classList.add('hidden');
  gameoverButtons.classList.remove('hidden');
});

// スキップボタン
btnSkip.addEventListener('click', () => {
  rankingForm.classList.add('hidden');
  gameoverButtons.classList.remove('hidden');
});

// Homeボタン（スタート画面）
const btnStartHome = document.getElementById('btn-start-home');
if (btnStartHome) {
  btnStartHome.addEventListener('click', () => {
    window.location.href = '../index.html';
  });
}

// Titleボタン（タイトル画面に戻る）
if (btnTitle) {
  btnTitle.addEventListener('click', () => {
    showStartScreen();
  });
}

// Homeボタン（ホームページに戻る） -> Removed from Gameover, but kept just in case
if (btnHome) {
  btnHome.addEventListener('click', () => {
    window.location.href = '../index.html';
  });
}

// キーボード操作（PC）
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();

    if (gameState === 'playing') {
      jump();
    } else if (gameState === 'start') {
      startGame();
    }
  }
});

// タッチ操作（スマホ）
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameState === 'playing') {
    jump();
  }
}, { passive: false });

// クリック操作（canvas上）
canvas.addEventListener('click', () => {
  if (gameState === 'playing') {
    jump();
  }
});

// Enterキーで名前登録
playerNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnRegister.click();
  }
});

// ウィンドウリサイズ
window.addEventListener('resize', () => {
  resizeCanvas();
});

// 画面回転時のリサイズ対応（モバイル）
window.addEventListener('orientationchange', () => {
  // 回転アニメーション完了後にリサイズ
  setTimeout(() => {
    resizeCanvas();
  }, 200);
});

// ===== 初期化 =====
async function init() {
  resizeCanvas();
  drawBackground();
  try {
    highScore = await getHighScore();
  } catch (e) {
    highScore = 0;
  }
}

// ページ読み込み完了後に初期化
init();
