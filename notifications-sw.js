// Notifications only. No offline caching, background GPS or delivery confirmation.
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows)if(new URL(client.url).origin===self.location.origin&&new URL(client.url).pathname==='/')return client.focus();
  return self.clients.openWindow('/');
 })());
});
