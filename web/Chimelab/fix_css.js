const fs = require('fs');
const file = 'c:/Users/imspr/Documents/Chimelab/assets/css/styles.css';
let content = fs.readFileSync(file, 'utf8');

const startStr = '.button-primary:hover {\r\n  transform: translateY(-3px);\r\n  box-shadow: 0 12px 25px rgba(108, 92, 231, 0.4);\r\n    transform: rotate(0deg);\r\n  }\r\n\r\n  100% {\r\n    transform: rotate(360deg);\r\n  }\r\n  border: 1px solid rgba(108, 92, 231, 0.1);\r\n}\r\n\r\n  padding: 30px;\r\n  text-decoration: none;\r\n  color: var(--text-dark);\r\n  background: rgba(255, 255, 255, 0.75);\r\n  backdrop-filter: blur(10px);\r\n  -webkit-backdrop-filter: blur(10px);\r\n  border-radius: var(--radius-lg);\r\n  border: 1px solid rgba(108, 92, 231, 0.15);\r\n  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);\r\n  position: relative;\r\n  overflow: hidden;\r\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);\r\n}\r\n\r\n.news-card-item:hover {';

const replacement = `.button-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(108, 92, 231, 0.4);
}

.button-secondary {
  background: white;
  color: var(--primary-purple);
  border: 2px solid var(--primary-purple);
}

.button-secondary:hover {
  background: var(--bg-light);
}

/* === Sections === */
.section {
  padding: 100px 0;
  position: relative;
  overflow: hidden;
}

/* セクション背景にも動きを */
.section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.02) 0%, transparent 70%);
  animation: rotateBg 30s linear infinite;
  z-index: -1;
  pointer-events: none;
}

@keyframes rotateBg {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.section h2 {
  font-size: clamp(20px, 3.5vw + 10px, 32px);
  text-align: center;
  margin-bottom: 16px;
}

.section-desc {
  text-align: center;
  color: var(--text-light);
  margin-bottom: 60px;
  font-size: clamp(14px, 1.5vw + 8px, 1.1rem);
  text-wrap: pretty;
}

/* === Cards === */
.about-box,
.feature-card,
.liver-card,
.recruiting-item,
.support-card,
.flow-section,
.apply-box,
.liver-detail-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
  border: 1px solid rgba(108, 92, 231, 0.1);
}

.about-box:hover,
.feature-card:hover,
.recruiting-item:hover,
.support-card:hover,
.liver-card:hover {
  box-shadow: 0 15px 35px rgba(108, 92, 231, 0.15);
  transform: translateY(-8px) scale(1.01);
  border-color: var(--primary-purple);
}

.features-section,
.recruiting-section,
.support-section {
  background: transparent;
}

.guidelines-section {
  position: relative;
  overflow: hidden;
  padding: 80px 0;
}

.guidelines-section .container {
  position: relative;
  z-index: 2;
}

.guidelines-section .features-grid {
  display: flex;
  justify-content: center;
  /* Center since there's only one card now */
}

.guidelines-section .feature-card {
  max-width: 500px;
  width: 100%;
  background: white;
  border: 1px solid rgba(108, 92, 231, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transform: translateY(0);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.guidelines-section .feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(108, 92, 231, 0.15);
  border-color: rgba(108, 92, 231, 0.3);
}

/* 活動状態バッジ */
.infomation {
  display: inline-block;
  background: rgba(180, 180, 180, 0.15);
  color: #888;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(180, 180, 180, 0.4);
  margin-top: 4px;
  letter-spacing: 0.03em;
}

/* === News Slider System === */
.news-slider-container {
  position: relative;
  max-width: 850px; /* PC版では大きく表示 */
  margin: 0 auto 40px;
  padding: 0 60px; /* 左右矢印が被らないように十分な余白を確保 */
  transition: all 0.3s ease;
}

.news-slider {
  overflow: hidden;
  border-radius: var(--radius-lg); /* 角丸を大きめにして柔らかくモダンに */
  box-shadow: 0 20px 40px rgba(108, 92, 231, 0.15); /* シャドウをより豊かに */
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(108, 92, 231, 0.2);
}

.news-slider-track {
  display: flex;
  transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  width: 400%; /* スライド4枚分 */
}

.news-slider-slide {
  width: 25%; /* 1枚当たり */
  flex-shrink: 0;
  padding: 10px;
}

/* ニュースカード全体 (PC版スプリットレイアウト) */
.news-card-item {
  display: flex;
  flex-direction: row;
  gap: 30px;
  align-items: center;
  padding: 30px;
  text-decoration: none;
  color: var(--text-dark);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(108, 92, 231, 0.15);
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.news-card-item:hover {`;

// Standardize line endings just in case
const normalize = (str) => str.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
content = normalize(content);
const target = normalize(startStr);
const newText = normalize(replacement);

if (content.includes(target)) {
  content = content.replace(target, newText);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Successfully fixed styles.css");
} else {
  console.log("Could not find the target string. Looking for partial match...");
  const partial = '.button-primary:hover {\\n  transform: translateY(-3px);\\n  box-shadow: 0 12px 25px rgba(108, 92, 231, 0.4);';
  const endPartial = '.news-card-item:hover {';
  const startIdx = content.indexOf(partial);
  const endIdx = content.indexOf(endPartial, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + newText + content.substring(endIdx + endPartial.length);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Fixed via partial match.");
  } else {
    console.log("Failed to fix.");
  }
}
