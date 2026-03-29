const CACHE='boltdj-v3';
const PRECACHE=['/client','/manifest.json'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(PRECACHE.map(u=>c.add(u).catch(()=>{})))));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||e.request.url.includes('/api/'))return;
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok){const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));}
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('/client')))
  );
});
