// ========================================
// Service Worker - ウォーキングルート生成PWA
// ========================================
// キャッシュを使ってオフラインでもアプリを表示できるようにする

const CACHE_NAME = 'walkroute-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

// インストール時: 静的アセットをキャッシュに保存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting()) // 即座にアクティブ化
  );
});

// アクティベート時: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // 即座にページを制御
  );
});

// フェッチ時: ネットワーク優先、失敗時キャッシュ（Network First戦略）
self.addEventListener('fetch', (event) => {
  // APIリクエストやPOSTリクエストはService Workerを介さずブラウザに委譲
  if (event.request.method !== 'GET' || event.request.url.includes('overpass') || event.request.url.includes('/api/interpreter')) {
    return;
  }

  // 全てのGETリクエストに対してNetwork First戦略を使用
  // これにより、コード更新時に古いキャッシュが返される問題を防ぐ
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // ネットワーク成功: キャッシュを更新して返す
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // ネットワーク失敗: キャッシュから返す（オフライン対応）
        return caches.match(event.request);
      })
  );
});
