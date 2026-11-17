'use strict';
const PREFIX = 'dss-aicrop-installable-';
const CURRENT = PREFIX + 'v8-20261117';
const ROOT = new URL(self.registration.scope);
const INDEX = new URL('index.html', ROOT).href;
const ASSETS = [
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.png'
].map(file => new URL(file, ROOT).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CURRENT);
    const response = await fetch(INDEX, {cache: 'reload'});
    if (!response.ok) throw new Error('Halaman utama belum tersedia.');
    await cache.put(INDEX, response);
    await Promise.allSettled(ASSETS.map(url => cache.add(new Request(url, {cache:'reload'}))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CURRENT).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const key = url.origin + url.pathname;
  const isIndex = key === ROOT.href || key === INDEX;
  if (req.mode !== 'navigate' || !isIndex) {
    if (ASSETS.includes(key)) {
      event.respondWith((async () => {
        const cache = await caches.open(CURRENT);
        return (await cache.match(key)) || fetch(req);
      })());
    }
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CURRENT);
    try {
      const response = await fetch(req, {cache:'no-store'});
      if (response.ok) {
        await cache.put(INDEX, response.clone()).catch(() => {});
        return response;
      }
      return (await cache.match(INDEX)) || response;
    } catch (_) {
      return (await cache.match(INDEX)) || new Response('Aplikasi belum tersimpan untuk penggunaan luring.', {
        status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}
      });
    }
  })());
});
