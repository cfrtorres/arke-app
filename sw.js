const V="arke-v49-202610131234";
const SHELL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  /* red primero para recibir versiones nuevas; si no hay internet, usa la copia guardada */
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res;}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));
});

/* ---- avisos de pendientes (celular) ---- */
function pdOpen(){return new Promise((res,rej)=>{const r=indexedDB.open("arke_pend",1);r.onupgradeneeded=()=>r.result.createObjectStore("s");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function pdGet(k){const db=await pdOpen();return new Promise(res=>{const q=db.transaction("s").objectStore("s").get(k);q.onsuccess=()=>{db.close();res(q.result);};q.onerror=()=>{db.close();res(null);};});}
async function pdPut(k,v){const db=await pdOpen();return new Promise(res=>{const tx=db.transaction("s","readwrite");tx.objectStore("s").put(v,k);tx.oncomplete=()=>{db.close();res();};tx.onerror=()=>{db.close();res();};});}
const pdIso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
async function pdCheck(force){
  try{
    const s=await pdGet("snap");if(!s||s.on===false)return;
    if(Date.now()-(s.ts||0)>45*864e5)return;
    const last=await pdGet("last");if(!force&&last&&Date.now()-last<4*3600*1000)return;
    const hoy=pdIso(new Date()),en7=pdIso(new Date(Date.now()+7*864e5));
    const T=s.tareas||[],ven=T.filter(t=>t.f&&t.f<hoy).length,hy=T.filter(t=>t.f===hoy).length;
    const R=(s.reu||[]).filter(r=>r.d>=hoy&&r.d<=en7),rh=R.filter(r=>r.d===hoy).length;
    if(!T.length&&!R.length)return;
    const p=[];if(ven)p.push(ven+" tarea"+(ven>1?"s":"")+" vencida"+(ven>1?"s":""));if(hy)p.push(hy+" vence"+(hy>1?"n":"")+" hoy");if(rh)p.push(rh+" reunión"+(rh>1?"es":"")+" hoy");else if(R.length)p.push(R.length+" reunión"+(R.length>1?"es":"")+" esta semana");
    if(!p.length)p.push(T.length+" tarea"+(T.length>1?"s":"")+" pendiente"+(T.length>1?"s":""));
    await pdPut("last",Date.now());
    await self.registration.showNotification("Tus pendientes",{body:p.join(" · "),icon:"icons/icon-192.png",badge:"icons/icon-192.png",tag:"arke-pend",renotify:true,data:{u:"./"}});
  }catch(_){}
}
self.addEventListener("periodicsync",e=>{if(e.tag==="arke-pend")e.waitUntil(pdCheck(false));});
self.addEventListener("message",e=>{if(e.data==="pend-check")e.waitUntil(pdCheck(true));});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>l.length?l[0].focus():self.clients.openWindow("./")));});
