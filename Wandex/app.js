// ========================================
// app.js - ウォーキングルート生成ツール
// ========================================
// 全モジュールを1ファイルにまとめたメインロジック
console.log('[app.js] スクリプト読み込み開始');

// ===== グローバル状態 =====
let currentRoute = null;      // 生成されたルートデータ
let mapInstance = null;        // Leaflet地図インスタンス
let routeLayer = null;         // 地図上のルート描画レイヤー
let abortGeneration = false;   // ルート生成中断フラグ

// ===== 定数 =====
const EARTH_RADIUS = 6371000; // 地球半径(m)
const ALLOWED_HIGHWAYS = ['residential', 'service', 'footway', 'path', 'living_street', 'pedestrian', 'track', 'tertiary', 'unclassified'];
const MAX_HISTORY = 10;       // 保存する過去ルート数
const MAX_RETRIES = 8;        // ルート再生成の最大試行回数（増加）
const OVERLAP_THRESHOLD = 0.3; // 重複率の閾値(30%)
const WALKING_SPEED_KMH = 4.5; // 平均歩行速度(km/h)

// ========================================
// 1. UIヘルパー
// ========================================

/** スライダーの値を画面に反映 */
const distSlider = document.getElementById('distance-slider');
const distValue = document.getElementById('distance-value');
if (distSlider && distValue) {
  distSlider.addEventListener('input', () => {
    distValue.textContent = parseFloat(distSlider.value).toFixed(1);
  });
}

/** ローディング表示の制御 */
function showLoading(text, step) {
  const el = document.getElementById('loading');
  document.getElementById('loading-text').textContent = text || 'ルートを生成中...';
  document.getElementById('loading-step').textContent = step || '';
  el.classList.add('active');
}
function hideLoading() {
  document.getElementById('loading').classList.remove('active');
}

/** トースト通知 */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 3000);
}

/** ボタンの有効/無効を切り替え */
function setButtonEnabled(enabled) {
  document.getElementById('btn-generate').disabled = !enabled;
}

// ========================================
// 2. 位置情報取得
// ========================================

/**
 * 現在のGPS座標を取得する
 * @returns {Promise<{lat: number, lng: number}>}
 */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('位置情報がサポートされていません'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msgs = {
          1: '位置情報の使用が許可されていません。設定を確認してください。',
          2: '位置情報を取得できませんでした。',
          3: '位置情報の取得がタイムアウトしました。'
        };
        reject(new Error(msgs[err.code] || '位置情報エラー'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

// ========================================
// 3. 数学ユーティリティ
// ========================================

/** 度 → ラジアン */
function toRad(deg) { return deg * Math.PI / 180; }
/** ラジアン → 度 */
function toDeg(rad) { return rad * 180 / Math.PI; }

/**
 * 2点間の距離を計算（ハーサイン式）
 * @returns {number} メートル単位の距離
 */
function haversine(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 基点から指定距離・方角の地点を計算
 */
function destinationPoint(lat, lng, distM, bearingDeg) {
  const brng = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const d = distM / EARTH_RADIUS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

/**
 * 2点間の方角を計算（度数, 0=北, 時計回り）
 */
function bearing(lat1, lng1, lat2, lng2) {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * 2つの方角の差を計算（0〜180度）
 */
function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// ========================================
// 4. Overpass API通信
// ========================================

/**
 * 指定座標周辺の道路データをOverpass APIから取得する
 */
async function fetchRoadData(lat, lng, radiusM) {
  // セッションキャッシュを確認
  const cacheKey = `osm_${lat.toFixed(4)}_${lng.toFixed(4)}_${radiusM}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    console.log('[fetchRoadData] セッションキャッシュからデータ取得');
    return JSON.parse(cached);
  }

  // Overpass QLクエリ
  const query = `
    [out:json][timeout:45];
    (
      way["highway"~"^(${ALLOWED_HIGHWAYS.join('|')})$"](around:${radiusM},${lat},${lng});
    );
    out body;
    >;
    out skel qt;
  `;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.osm.ch/api/interpreter'
  ];

  let data = null;
  let lastError = null;

  for (const url of endpoints) {
    if (abortGeneration) throw new Error('生成がキャンセルされました');
    try {
      console.log(`[fetchRoadData] ${url} に接続中... (半径${radiusM}m)`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const fullUrl = url + '?data=' + encodeURIComponent(query);
      const resp = await fetch(fullUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!resp.ok) {
        lastError = new Error(`Overpass API エラー: ${resp.status}`);
        console.warn(`${url}: HTTP ${resp.status}`);
        continue;
      }
      
      data = await resp.json();
      console.log(`[fetchRoadData] 成功: ${url}, elements=${data.elements?.length}`);
      break;
    } catch (e) {
      console.warn(`${url}: ${e.message}`);
      lastError = e;
    }
  }

  if (!data) {
    throw lastError || new Error('Overpass API との通信に失敗しました');
  }

  if (!data.elements || data.elements.length === 0) {
    throw new Error('周辺に歩行可能な道路が見つかりませんでした');
  }

  try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch(e) {}
  return data;
}

// ========================================
// 5. グラフ構築
// ========================================

/**
 * OSMデータからグラフ構造を構築する
 */
function buildGraph(osmData) {
  const nodes = new Map();
  const adj = new Map();
  const edges = new Map();

  for (const el of osmData.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  }

  let edgeCount = 0;
  for (const el of osmData.elements) {
    if (el.type !== 'way' || !el.nodes || el.nodes.length < 2) continue;

    for (let i = 0; i < el.nodes.length - 1; i++) {
      const fromId = el.nodes[i];
      const toId = el.nodes[i + 1];
      const fromNode = nodes.get(fromId);
      const toNode = nodes.get(toId);
      if (!fromNode || !toNode) continue;

      const dist = haversine(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
      const brng = bearing(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
      const edgeId = `${el.id}_${i}`;

      edges.set(edgeId, { from: fromId, to: toId, dist, wayId: el.id, segIdx: i });

      if (!adj.has(fromId)) adj.set(fromId, []);
      if (!adj.has(toId)) adj.set(toId, []);

      adj.get(fromId).push({ to: toId, edgeId, dist, bearing: brng });
      adj.get(toId).push({
        to: fromId, edgeId, dist,
        bearing: (brng + 180) % 360
      });
      edgeCount++;
    }
  }

  console.log(`[buildGraph] グラフ構築完了: ノード ${nodes.size}, エッジ ${edgeCount}`);
  return { nodes, edges, adj };
}

/**
 * 指定座標に最も近いノードを見つける
 */
function findNearestNode(nodes, lat, lng) {
  let nearest = null, minDist = Infinity;
  for (const [id, node] of nodes) {
    const d = haversine(lat, lng, node.lat, node.lng);
    if (d < minDist) { minDist = d; nearest = id; }
  }
  return nearest;
}

// ========================================
// 6. ルート生成エンジン（ループ型）
// ========================================
// 戦略: 「行き」と「帰り」の2本のダイクストラルートで大きなループを形成
// 1. ランダムな方角を選び、目標距離の約1/3の地点にある中間ノードを特定
// 2. スタート → 中間ノード（行き）のルートをダイクストラで計算
// 3. 中間ノード → スタート（帰り）のルートを、行きで使った道を避けてダイクストラで計算
// 4. 行き + 帰り ≒ 目標距離 の大きなループが完成

/**
 * A*風ダイクストラで最短経路を計算
 * costMultiplier で特定エッジのコストを上げてルートを変化させる
 */
async function findPath(graph, fromId, toId, costMultiplier, timeoutMs) {
  const { nodes, adj } = graph;
  const startTime = Date.now();
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  // A*ヒューリスティック用のゴール座標
  const toNode = nodes.get(toId);
  const queue = [{ id: fromId, d: 0, f: 0 }];
  dist.set(fromId, 0);

  const maxSteps = Math.max(200000, nodes.size * 4); // ノード数に応じたステップ上限
  let step = 0;
  while (queue.length > 0) {
    step++;

    if (step % 500 === 0) {
      if (Date.now() - startTime > timeoutMs) {
        console.warn(`[findPath] タイムアウト (${step}ステップ)`);
        break;
      }
      if (abortGeneration) return null;
      await new Promise(r => setTimeout(r, 0));
    }

    if (step > maxSteps) {
      console.warn(`[findPath] 最大ステップ数到達 (${maxSteps})`);
      break;
    }

    // 最小f値のノードを取り出す
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].f < queue[minIdx].f) minIdx = i;
    }
    const { id: current, d: currentDist } = queue[minIdx];
    queue.splice(minIdx, 1);

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === toId) break;

    const neighbors = adj.get(current);
    if (!neighbors) continue;

    for (const n of neighbors) {
      if (visited.has(n.to)) continue;

      // コスト計算
      let cost = n.dist;
      if (costMultiplier) {
        const mul = costMultiplier(n.edgeId);
        cost *= mul;
      }

      const newDist = currentDist + cost;

      if (!dist.has(n.to) || newDist < dist.get(n.to)) {
        dist.set(n.to, newDist);
        prev.set(n.to, { from: current, edgeId: n.edgeId, dist: n.dist });
        // A*ヒューリスティック: ゴールまでの直線距離を追加
        let h = 0;
        if (toNode) {
          const nNode = nodes.get(n.to);
          if (nNode) h = haversine(nNode.lat, nNode.lng, toNode.lat, toNode.lng);
        }
        queue.push({ id: n.to, d: newDist, f: newDist + h });
      }
    }
  }

  // パスを復元
  if (!prev.has(toId) && fromId !== toId) return null;
  if (fromId === toId) return { path: [fromId], usedEdges: new Set(), dist: 0 };

  const path = [];
  const usedEdges = new Set();
  let totalDist = 0;
  let current = toId;

  while (current !== fromId) {
    path.unshift(current);
    const p = prev.get(current);
    if (!p) return null;
    usedEdges.add(p.edgeId);
    totalDist += p.dist;
    current = p.from;
  }
  path.unshift(fromId);

  return { path, usedEdges, dist: totalDist };
}

/**
 * メインのルート生成関数 — ループ型
 * 「行き」と「帰り」のダイクストラ2本で大きなループを作る
 */
async function generateLoopRoute(graph, startNodeId, targetDistM, pastEdges) {
  const { nodes, adj } = graph;
  const startNode = nodes.get(startNodeId);
  if (!startNode) return null;

  // ランダムな方角を選ぶ
  const direction = Math.random() * 360;

  // 目標距離から中間地点までの概算直線距離を計算
  // ループの場合、直線距離 ≈ 目標距離 / π (円周の直径関係)
  // 少し余裕を持って 目標距離の 1/3 をターゲット直線距離にする
  const targetStraightDist = targetDistM / 3;

  // 中間地点の座標を計算
  const midPoint = destinationPoint(startNode.lat, startNode.lng, targetStraightDist, direction);

  // 中間地点に最も近いノードを見つける
  const midNodeId = findNearestNode(nodes, midPoint.lat, midPoint.lng);
  if (!midNodeId || midNodeId === startNodeId) return null;

  const midNode = nodes.get(midNodeId);
  const actualMidDist = haversine(startNode.lat, startNode.lng, midNode.lat, midNode.lng);
  console.log(`[generateLoopRoute] 方角=${direction.toFixed(0)}°, 中間地点距離=${(actualMidDist/1000).toFixed(2)}km`);

  // 中間地点が近すぎる場合はスキップ（グラフが十分に広くない）
  if (actualMidDist < targetDistM * 0.08) {
    console.warn('[generateLoopRoute] 中間地点が近すぎる');
    return null;
  }

  // 「行き」のルートを計算（少し遠回りさせるためランダムコスト付き）
  const timeoutMs = Math.max(8000, targetDistM / 1000 * 3000); // 距離に応じたタイムアウト
  
  const outboundRoute = await findPath(graph, startNodeId, midNodeId, (edgeId) => {
    let mul = 1;
    // 過去ルートのエッジは少しペナルティ
    if (pastEdges.has(edgeId)) mul *= 1.5;
    // ランダム性を加える（1.0〜2.0倍のランダムコスト）
    mul *= (1 + Math.random() * 1.0);
    return mul;
  }, timeoutMs);

  if (!outboundRoute) {
    console.warn('[generateLoopRoute] 行きルートが見つからない');
    return null;
  }

  console.log(`[generateLoopRoute] 行きルート: ${(outboundRoute.dist/1000).toFixed(2)}km, ${outboundRoute.path.length}ノード`);

  if (abortGeneration) return null;

  // 「帰り」のルートを計算（行きで使ったエッジを大幅にペナルティ）
  const returnRoute = await findPath(graph, midNodeId, startNodeId, (edgeId) => {
    let mul = 1;
    // 行きで使ったエッジは大幅ペナルティ（別の道を通らせる）
    if (outboundRoute.usedEdges.has(edgeId)) mul *= 20;
    // 過去ルートも少しペナルティ
    if (pastEdges.has(edgeId)) mul *= 1.5;
    // ランダム性を加える
    mul *= (1 + Math.random() * 1.0);
    return mul;
  }, timeoutMs);

  if (!returnRoute) {
    console.warn('[generateLoopRoute] 帰りルートが見つからない');
    return null;
  }

  console.log(`[generateLoopRoute] 帰りルート: ${(returnRoute.dist/1000).toFixed(2)}km, ${returnRoute.path.length}ノード`);

  // パスを結合
  const fullPath = [...outboundRoute.path];
  for (let i = 1; i < returnRoute.path.length; i++) {
    fullPath.push(returnRoute.path[i]);
  }

  const allUsedEdges = new Set([...outboundRoute.usedEdges, ...returnRoute.usedEdges]);
  const totalDist = outboundRoute.dist + returnRoute.dist;

  return { path: fullPath, usedEdges: allUsedEdges, totalDist };
}

/**
 * 距離調整のため中間地点の距離を変えながら複数回試行する
 */
async function generateRouteWithDistanceAdjust(graph, startNodeId, targetDistM, pastEdges, attempt) {
  const { nodes } = graph;
  const startNode = nodes.get(startNodeId);
  if (!startNode) return null;

  // グラフの実質的な範囲を推定（スタートから最も遠いノードまでの距離）
  let maxGraphDist = 0;
  for (const [id, node] of nodes) {
    const d = haversine(startNode.lat, startNode.lng, node.lat, node.lng);
    if (d > maxGraphDist) maxGraphDist = d;
  }
  console.log(`[attempt ${attempt}] グラフ最大半径=${(maxGraphDist/1000).toFixed(2)}km`);

  // ランダムな方角（試行ごとに異なる方角を試す）
  const direction = (Math.random() * 360 + attempt * 72) % 360; // 72度ずつずらす

  // 目標の行き距離を調整（目標の40〜60%を行きに使う）
  const outboundRatio = 0.40 + Math.random() * 0.20;
  const targetOutbound = targetDistM * outboundRatio;

  // 道路ネットワーク上での距離は直線距離の1.3〜1.6倍程度
  const networkFactor = 1.3 + Math.random() * 0.3;
  let targetStraightDist = targetOutbound / networkFactor;

  // グラフ範囲の80%を上限とする（端ギリギリを狙わない）
  const maxReach = maxGraphDist * 0.80;
  if (targetStraightDist > maxReach) {
    console.log(`[attempt ${attempt}] 直線距離をグラフ範囲に制限: ${(targetStraightDist/1000).toFixed(2)}km → ${(maxReach/1000).toFixed(2)}km`);
    targetStraightDist = maxReach;
  }

  // 複数の距離スケールで試行（近い中間地点でもループを作れる）
  const distScales = [1.0, 0.7, 0.5, 0.35];
  
  for (const scale of distScales) {
    const scaledDist = targetStraightDist * scale;
    if (scaledDist < 200) continue; // あまりに近い場合はスキップ

    // 中間地点を計算
    const midPoint = destinationPoint(startNode.lat, startNode.lng, scaledDist, direction);
    const midNodeId = findNearestNode(nodes, midPoint.lat, midPoint.lng);

    if (!midNodeId || midNodeId === startNodeId) continue;

    const midNode = nodes.get(midNodeId);
    const actualMidDist = haversine(startNode.lat, startNode.lng, midNode.lat, midNode.lng);
    console.log(`[attempt ${attempt}] scale=${scale}, 方角=${direction.toFixed(0)}°, 直線距離=${(actualMidDist/1000).toFixed(2)}km, 目標行き距離=${(targetOutbound/1000).toFixed(2)}km`);

    if (actualMidDist < 100) continue;

    const timeoutMs = Math.max(15000, targetDistM / 1000 * 3000);

    // 行きルート（ランダムコストで変化をつける）
    const outbound = await findPath(graph, startNodeId, midNodeId, (edgeId) => {
      let mul = 1;
      if (pastEdges.has(edgeId)) mul *= 1.5;
      mul *= (0.8 + Math.random() * 1.2);
      return mul;
    }, timeoutMs);

    if (!outbound) {
      console.warn(`[attempt ${attempt}] scale=${scale}: 行きルート失敗`);
      continue;
    }
    if (abortGeneration) return null;

    console.log(`[attempt ${attempt}] 行き: ${(outbound.dist/1000).toFixed(2)}km`);

    // 帰りルート（行きのエッジを重くペナルティにして別ルートを通らせる）
    const inbound = await findPath(graph, midNodeId, startNodeId, (edgeId) => {
      let mul = 1;
      if (outbound.usedEdges.has(edgeId)) mul *= 25;
      if (pastEdges.has(edgeId)) mul *= 1.5;
      mul *= (0.8 + Math.random() * 1.2);
      return mul;
    }, timeoutMs);

    if (!inbound) {
      console.warn(`[attempt ${attempt}] scale=${scale}: 帰りルート失敗`);
      continue;
    }

    console.log(`[attempt ${attempt}] 帰り: ${(inbound.dist/1000).toFixed(2)}km`);

    // パスを結合
    const fullPath = [...outbound.path];
    for (let i = 1; i < inbound.path.length; i++) {
      fullPath.push(inbound.path[i]);
    }

    const allEdges = new Set([...outbound.usedEdges, ...inbound.usedEdges]);
    const totalDist = outbound.dist + inbound.dist;

    console.log(`[attempt ${attempt}] 合計: ${(totalDist/1000).toFixed(2)}km (目標: ${(targetDistM/1000).toFixed(1)}km, 比率: ${(totalDist/targetDistM).toFixed(2)})`);

    return { path: fullPath, usedEdges: allEdges, totalDist };
  }

  console.warn(`[attempt ${attempt}] すべてのスケールで失敗`);
  return null;
}

// ========================================
// 7. 被り防止（履歴管理）
// ========================================

/** 過去ルートの使用エッジを取得 */
function getPastEdges() {
  const history = getHistory();
  const allEdges = new Set();
  for (const route of history) {
    if (route.edges) {
      for (const e of route.edges) allEdges.add(e);
    }
  }
  return allEdges;
}

/** 重複率を計算 */
function calcOverlap(newEdges, pastEdges) {
  if (newEdges.size === 0) return 0;
  let overlap = 0;
  for (const e of newEdges) {
    if (pastEdges.has(e)) overlap++;
  }
  return overlap / newEdges.size;
}

/** 履歴を取得 */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('walkroute_history') || '[]');
  } catch { return []; }
}

/** 履歴に追加 */
function saveToHistory(routeData) {
  const history = getHistory();
  history.unshift({
    date: new Date().toISOString(),
    distance: routeData.totalDist,
    edges: Array.from(routeData.usedEdges),
    waypoints: routeData.waypoints
  });
  while (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem('walkroute_history', JSON.stringify(history));
  renderHistory();
}

/** 履歴をクリア */
function clearHistory() {
  if (!confirm('過去のルート履歴をすべて削除しますか？')) return;
  localStorage.removeItem('walkroute_history');
  renderHistory();
  showToast('履歴をクリアしました');
}

/** 履歴を画面に表示 */
function renderHistory() {
  const history = getHistory();
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');

  if (history.length === 0) {
    section.classList.remove('active');
    return;
  }

  section.classList.add('active');
  list.innerHTML = history.map((r, i) => {
    const date = new Date(r.date);
    const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
    const distStr = (r.distance / 1000).toFixed(1) + 'km';
    return `<div class="history-item">
      <span class="history-date">${dateStr}</span>
      <span class="history-dist">${distStr}</span>
      <span>${r.edges ? r.edges.length + 'エッジ' : ''}</span>
    </div>`;
  }).join('');
}

// ========================================
// 8. ウェイポイント選定 & Google Maps連携
// ========================================

/**
 * ルートから均等な経由ポイントを最大3つ選ぶ
 */
function selectWaypoints(path, nodes) {
  if (path.length <= 2) return [];

  const waypoints = [];
  const positions = [0.25, 0.5, 0.75];

  for (const ratio of positions) {
    const idx = Math.floor(path.length * ratio);
    const nodeId = path[Math.min(idx, path.length - 1)];
    const node = nodes.get(nodeId);
    if (node) waypoints.push({ lat: node.lat, lng: node.lng });
  }

  return waypoints;
}

/**
 * Google Maps URLを生成して開く
 */
function openGoogleMaps() {
  if (!currentRoute) {
    showToast('先にルートを生成してください', true);
    return;
  }

  const { startLat, startLng, waypoints } = currentRoute;
  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${startLat},${startLng}`;
  url += `&destination=${startLat},${startLng}`;
  url += `&travelmode=walking`;

  if (waypoints.length > 0) {
    const wpStr = waypoints.map(w => `${w.lat},${w.lng}`).join('%7C');
    url += `&waypoints=${wpStr}`;
  }

  window.open(url, '_blank');
}

// ========================================
// 9. Leaflet.js 地図表示
// ========================================

/**
 * 地図にルートを表示する
 */
function displayRouteOnMap(path, nodes, startLat, startLng) {
  const coords = [];
  for (const nodeId of path) {
    const node = nodes.get(nodeId);
    if (node) coords.push([node.lat, node.lng]);
  }

  if (coords.length === 0) return;

  if (mapInstance) {
    mapInstance.remove();
  }

  mapInstance = L.map('map', {
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(mapInstance);

  // ルートのポリライン
  const routeLine = L.polyline(coords, {
    color: '#667eea',
    weight: 4,
    opacity: 0.9,
    lineJoin: 'round'
  }).addTo(mapInstance);

  // スタート/ゴールマーカー
  const startIcon = L.divIcon({
    className: '',
    html: '<div style="background:#4caf50;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  L.marker([startLat, startLng], { icon: startIcon }).addTo(mapInstance)
    .bindPopup('🏠 スタート/ゴール');

  // ウェイポイントマーカー
  if (currentRoute && currentRoute.waypoints) {
    currentRoute.waypoints.forEach((wp, i) => {
      const wpIcon = L.divIcon({
        className: '',
        html: `<div style="background:#667eea;color:#fff;width:22px;height:22px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${i+1}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(mapInstance);
    });
  }

  mapInstance.fitBounds(routeLine.getBounds().pad(0.1));
}

// ========================================
// 10. メイン生成フロー
// ========================================

/**
 * ルート生成のメインエントリーポイント
 */
async function generateRoute() {
  console.log('[generateRoute] 関数呼び出し開始');
  setButtonEnabled(false);
  abortGeneration = false;

  try {
    // ステップ1: 現在地を取得
    showLoading('現在地を取得中...', 'GPSを使用しています');
    const pos = await getCurrentPosition();
    console.log(`[generateRoute] 現在地: ${pos.lat}, ${pos.lng}`);

    if (abortGeneration) throw new Error('生成がキャンセルされました');

    // ステップ2: 目標距離を取得（km → m）
    const targetDistM = parseFloat(distSlider.value) * 1000;
    // 検索半径: 目標距離に応じて十分広い範囲を取得
    // ループの直径 ≈ 目標距離 / π なので、半径は 目標距離 / (2π) ≈ 0.16
    // 道路の蛇行とルート探索の余裕を考慮して 0.5倍 を検索半径にする
    // 上限を10kmに引き上げ（長距離ルートに対応）
    const searchRadius = Math.max(1500, Math.min(targetDistM * 0.5, 10000));
    console.log(`[generateRoute] 目標距離=${targetDistM}m, 検索半径=${searchRadius}m`);

    // ステップ3: 道路データを取得
    showLoading('周辺の道路データを取得中...', `半径 ${(searchRadius/1000).toFixed(1)}km を検索`);
    const osmData = await fetchRoadData(pos.lat, pos.lng, searchRadius);
    console.log(`[generateRoute] 道路データ取得完了: elements=${osmData.elements?.length}`);

    if (abortGeneration) throw new Error('生成がキャンセルされました');

    // ステップ4: グラフを構築
    showLoading('道路ネットワークを構築中...', 'ノードとエッジを解析');
    await new Promise(r => setTimeout(r, 50));
    const graph = buildGraph(osmData);

    if (graph.nodes.size < 10) {
      throw new Error('周辺の道路データが不足しています。もう少し広い場所で試してください。');
    }

    // ステップ5: スタートノードを特定
    const startNodeId = findNearestNode(graph.nodes, pos.lat, pos.lng);
    if (!startNodeId) throw new Error('最寄りのノードが見つかりませんでした');
    console.log(`[generateRoute] スタートノード=${startNodeId}`);

    // ステップ6: 過去ルート情報を取得
    const pastEdges = getPastEdges();
    console.log(`[generateRoute] 過去エッジ数=${pastEdges.size}`);

    if (abortGeneration) throw new Error('生成がキャンセルされました');

    // ステップ7: ルート生成（複数方角を試行）
    let bestRoute = null;
    let bestOverlap = 1;
    let bestDistError = Infinity; // 目標距離との差

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (abortGeneration) throw new Error('生成がキャンセルされました');

      showLoading(
        'ルートを生成中...',
        `試行 ${attempt + 1} / ${MAX_RETRIES}`
      );
      await new Promise(r => setTimeout(r, 30));

      console.log(`\n--- 試行 ${attempt + 1}/${MAX_RETRIES} ---`);
      const route = await generateRouteWithDistanceAdjust(graph, startNodeId, targetDistM, pastEdges, attempt);
      if (!route) {
        console.log(`[generateRoute] 試行 ${attempt + 1}: 失敗`);
        continue;
      }

      // 距離チェック
      const ratio = route.totalDist / targetDistM;
      const distError = Math.abs(ratio - 1);
      const overlap = calcOverlap(route.usedEdges, pastEdges);

      console.log(`[generateRoute] 試行${attempt+1}: 距離=${(route.totalDist/1000).toFixed(2)}km (${(ratio*100).toFixed(0)}%), 重複率=${(overlap*100).toFixed(0)}%`);

      // ベスト候補の更新（距離の一致度と重複率を総合的に評価）
      const isBetter = !bestRoute ||
        (distError < bestDistError * 0.8) ||  // 距離がかなり改善
        (distError < bestDistError * 1.2 && overlap < bestOverlap); // 距離がほぼ同等で重複率改善

      if (isBetter) {
        bestRoute = route;
        bestOverlap = overlap;
        bestDistError = distError;
      }

      // 距離が±50%以内で重複率が閾値以下なら採用
      if (ratio >= 0.5 && ratio <= 1.5 && overlap < OVERLAP_THRESHOLD) break;
    }

    if (!bestRoute) {
      throw new Error('ルートを生成できませんでした。距離を変更するか、別の場所で試してください。');
    }

    console.log(`[generateRoute] ★ 最終結果: ${(bestRoute.totalDist/1000).toFixed(2)}km, 重複率=${(bestOverlap*100).toFixed(0)}%`);

    // ステップ8: ウェイポイント選定
    const waypoints = selectWaypoints(bestRoute.path, graph.nodes);
    const startNode = graph.nodes.get(startNodeId);

    currentRoute = {
      startLat: startNode.lat,
      startLng: startNode.lng,
      waypoints,
      path: bestRoute.path,
      totalDist: bestRoute.totalDist,
      usedEdges: bestRoute.usedEdges,
      overlap: bestOverlap
    };

    // ステップ9: 結果を表示
    hideLoading();
    showResults(graph.nodes, bestOverlap);

    // ステップ10: 履歴に保存
    saveToHistory({
      totalDist: bestRoute.totalDist,
      usedEdges: bestRoute.usedEdges,
      waypoints
    });

    showToast('ルートを生成しました！ 🎉');

  } catch (err) {
    console.error('[generateRoute] エラー:', err);
    hideLoading();
    if (err.message !== '生成がキャンセルされました') {
      showToast(err.message || 'エラーが発生しました', true);
    } else {
      showToast('生成をキャンセルしました', false);
    }
  } finally {
    setButtonEnabled(true);
    abortGeneration = false;
  }
}

/**
 * ルート生成をキャンセル
 */
function cancelGeneration() {
  abortGeneration = true;
  hideLoading();
}

/**
 * 結果をUIに表示する
 */
function showResults(nodes, overlap) {
  const route = currentRoute;
  if (!route) return;

  const distKm = (route.totalDist / 1000).toFixed(1);
  const timeMin = Math.round(route.totalDist / 1000 / WALKING_SPEED_KMH * 60);
  const overlapPct = Math.round(overlap * 100);

  document.getElementById('stat-distance').textContent = distKm + 'km';
  document.getElementById('stat-time').textContent = timeMin + '分';

  const overlapEl = document.getElementById('stat-overlap');
  overlapEl.textContent = overlapPct + '%';
  overlapEl.style.color = overlapPct < 30 ? '#81c784' : '#ffd54f';

  document.getElementById('result-section').classList.add('active');

  displayRouteOnMap(route.path, nodes, route.startLat, route.startLng);
}

// ========================================
// 初期化
// ========================================
console.log('[app.js] 初期化完了');
renderHistory();
