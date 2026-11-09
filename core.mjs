export function routeCost(order,matrix,roundTrip=false){let sum=0,prev=0;for(const i of order){sum+=matrix[prev][i];prev=i;}return sum+(roundTrip&&order.length?matrix[prev][0]:0);}
export function optimize(matrix,roundTrip=false){
 const n=matrix.length;
 if(!n||matrix.some(row=>row.length!==n||row.some(v=>!Number.isFinite(v)||v<0)))throw Error('Hay puntos sin conexión por calles. Revisá las ubicaciones.');
 let best=[],bestCost=Infinity;
 // Try each first stop; full route costs preserve asymmetric one-way streets.
 for(let first=1;first<n;first++){
  let order=[first],pending=new Set(Array.from({length:n-1},(_,i)=>i+1));pending.delete(first);
  while(pending.size){let last=order.at(-1),next=[...pending].reduce((a,b)=>matrix[last][a]<=matrix[last][b]?a:b);order.push(next);pending.delete(next);}
  let cost=routeCost(order,matrix,roundTrip),changed=true,passes=0;
  while(changed&&passes++<40){changed=false;for(let i=0;i<order.length-1;i++)for(let j=i+1;j<order.length;j++){let candidate=[...order.slice(0,i),...order.slice(i,j+1).reverse(),...order.slice(j+1)];let c=routeCost(candidate,matrix,roundTrip);if(c+0.01<cost){order=candidate;cost=c;changed=true;}}}
  if(cost<bestCost){best=order;bestCost=cost;}
 }
 return best;
}
export function blocks(stops,size=4){let result=[];for(let i=0;i<stops.length;i+=size)result.push(stops.slice(i,i+size));return result;}
export function shortAddress(stop){
 if(typeof stop.shortAddress==='string'&&stop.shortAddress.trim())return stop.shortAddress.trim();
 const parts=String(stop.address||'').split(',').map(p=>p.trim()).filter(Boolean),number=parts.findIndex(p=>/^\d+[a-z]?(?:[-/]\d+)?$/i.test(p));
 if(number>=0){const street=parts[number+1]||parts[number-1];if(street)return `${street} ${parts[number]}`;}
 return parts.find(p=>/^(?:(?:avenida|av\.?|calle|pasaje|ruta|camino|boulevard)\s+|\d+\s*-\s*\S)/i.test(p))||parts[0]||'Sin dirección';
}
export function navigationPlan(stops,app='maps',{returnPoint=null,limit=4,origin=null}={}){
 const pending=stops.filter(s=>!s.done),destinations=[...pending,...(returnPoint?[returnPoint]:[])];
 const capacity=app==='waze'?1:Math.max(1,Math.min(10,limit));
 const sent=destinations.slice(0,capacity),remaining=destinations.length-sent.length;
 const url=!sent.length?null:app==='waze'?`https://waze.com/ul?ll=${sent[0].lat}%2C${sent[0].lon}&navigate=yes`:mapsURL(sent,origin);
 return {url,sent,remaining,pending:pending.length,total:destinations.length};
}
export function mapsURL(stops,origin){const url=new URL('https://www.google.com/maps/dir/');url.searchParams.set('api','1');url.searchParams.set('travelmode','driving');url.searchParams.set('dir_action','navigate');if(origin)url.searchParams.set('origin',`${origin.lat},${origin.lon}`);const coord=p=>`${p.lat},${p.lon}`;url.searchParams.set('destination',coord(stops.at(-1)));if(stops.length>1)url.searchParams.set('waypoints',stops.slice(0,-1).map(coord).join('|'));return url.href;}
export const BUENOS_AIRES={lat:-34.6037,lon:-58.3816};
export function distanceKm(a,b){const r=Math.PI/180,h=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));}
export function addressSearch(query,origin,scope='nearby'){
 const center=origin||BUENOS_AIRES,radiusKm=100,url=new URL('https://nominatim.openstreetmap.org/search');
 url.search=new URLSearchParams({q:query.trim(),format:'jsonv2',limit:'10','accept-language':'es',addressdetails:'1',countrycodes:'ar'});
 if(scope!=='argentina'){
  const dy=radiusKm/111,dx=radiusKm/(111*Math.max(.1,Math.cos(center.lat*Math.PI/180)));
  url.searchParams.set('viewbox',`${center.lon-dx},${center.lat+dy},${center.lon+dx},${center.lat-dy}`);url.searchParams.set('bounded','1');
 }
 return {url,center,radiusKm,scope,key:'address-local-v1:'+url.href};
}
export function localAddressResults(results,search){
 return results.filter(result=>{
  const lat=Number(result.lat),lon=Number(result.lon);
  return result.address?.country_code?.toLowerCase()==='ar'&&Number.isFinite(lat)&&Math.abs(lat)<=90&&Number.isFinite(lon)&&Math.abs(lon)<=180&&(search.scope==='argentina'||distanceKm(search.center,{lat,lon})<=search.radiusKm);
 }).sort((a,b)=>distanceKm(search.center,{lat:Number(a.lat),lon:Number(a.lon)})-distanceKm(search.center,{lat:Number(b.lat),lon:Number(b.lon)}));
}
