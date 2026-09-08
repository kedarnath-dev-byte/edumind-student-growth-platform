/* Cache only public static assets. Never cache accounts, API responses or uploads. */
const CACHE = 'edumind-static-v1'
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html','/icons/icon-192.png','/icons/icon-512.png']))))
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key=>key.startsWith('edumind-static-') && key!==CACHE).map(key=>caches.delete(key))))))
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')))
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(event.request).then(hit=>hit || fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}
      return response
    })))
  }
})
