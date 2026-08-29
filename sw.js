// 多绮爱服饰工序成本工具 - Service Worker
const CACHE_NAME = 'duoqi-ai-tool-v1.0.0';
const CACHE_VERSION = 'v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/labor-cost/',
    '/labor-cost/index.html',
    '/labor-cost/manifest.json',
    '/labor-cost/cloud-sync.js',
    '/labor-cost/app.js',
    '/labor-cost/style.css',
    '/labor-cost/style-extra.css',
    '/labor-cost/xlsx.full.min.js'
];

// 安装Service Worker
self.addEventListener('install', function(event) {
    console.log('[PWA] Service Worker 安装中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[PWA] 缓存静态资源...');
            // 缓存核心资源，不强制缓存所有资源（避免跨域问题）
            return cache.addAll([
                '/labor-cost/',
                '/labor-cost/index.html',
                '/labor-cost/manifest.json'
            ]).catch(function(error) {
                console.log('[PWA] 缓存部分资源失败:', error);
            });
        }).then(function() {
            console.log('[PWA] Service Worker 安装完成');
            return self.skipWaiting();
        })
    );
});

// 激活Service Worker
self.addEventListener('activate', function(event) {
    console.log('[PWA] Service Worker 激活中...');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[PWA] 删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            console.log('[PWA] Service Worker 激活完成');
            return self.clients.claim();
        })
    );
});

// 拦截网络请求
self.addEventListener('fetch', function(event) {
    // 只处理GET请求
    if (event.request.method !== 'GET') {
        return;
    }
    
    // 跳过跨域请求（如Supabase API、CDN资源）
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(function(cachedResponse) {
            // 如果缓存中有，直接返回缓存
            if (cachedResponse) {
                console.log('[PWA] 从缓存加载:', event.request.url);
                return cachedResponse;
            }
            
            // 否则从网络获取，并缓存
            return fetch(event.request).then(function(networkResponse) {
                // 只缓存成功的响应
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseToCache);
                        console.log('[PWA] 缓存新资源:', event.request.url);
                    });
                }
                return networkResponse;
            }).catch(function(error) {
                console.log('[PWA] 网络请求失败，尝试离线回退:', error);
                // 离线时返回首页
                if (event.request.mode === 'navigate') {
                    return caches.match('/labor-cost/index.html');
                }
                return new Response('离线状态，请检查网络连接', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            });
        })
    );
});

// 监听推送通知（如果需要）
self.addEventListener('push', function(event) {
    console.log('[PWA] 收到推送通知:', event);
    // 可以在这里处理推送通知
});

// 监听通知点击
self.addEventListener('notificationclick', function(event) {
    console.log('[PWA] 通知点击:', event);
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/labor-cost/')
    );
});

// 监听消息（用于与前端通信）
self.addEventListener('message', function(event) {
    console.log('[PWA] 收到消息:', event.data);
    
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data === 'GET_VERSION') {
        event.source.postMessage({
            type: 'VERSION',
            version: CACHE_VERSION,
            cacheName: CACHE_NAME
        });
    }
    
    if (event.data === 'CLEAR_CACHE') {
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        }).then(function() {
            event.source.postMessage({ type: 'CACHE_CLEARED' });
        });
    }
});

console.log('[PWA] Service Worker 脚本已加载');
