import {optimize,distanceKm} from './core.mjs';

export function orderedStops(stops, origin, roundTrip, distances) {
 const pending=stops.filter(stop=>!stop.done);
 const finishLast=items=>[...items.filter(s=>!s.returnPoint),...items.filter(s=>s.returnPoint),...stops.filter(s=>s.done)];
 if(!origin||!pending.length)return finishLast(pending);
 const points=[origin,...pending];
 const matrix=distances||points.map(a=>points.map(b=>{
  const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));
 }));
 if(matrix.length!==points.length)throw Error('La matriz no coincide con las entregas pendientes.');
 return finishLast(optimize(matrix,roundTrip).map(index=>pending[index-1]));
}

// Only the latest snapshot may update the table, markers and route.
export function createRouteQueue({delay=700,calculate,onResult,onError}) {
 let revision=0,timer,controller;
 const cancel=()=>{revision++;clearTimeout(timer);controller?.abort();};
 const schedule=snapshot=>{
  cancel();const current=revision;controller=new AbortController();const signal=controller.signal;
  timer=setTimeout(async()=>{
   try{const result=await calculate(snapshot,signal);if(current===revision&&!signal.aborted)onResult(result,snapshot);}
   catch(error){if(current===revision&&!signal.aborted)onError(error,snapshot);}
  },delay);
 };
 return {schedule,cancel};
}
export function createArrivalDetector({radiusMeters=100,maxAccuracyMeters=60,dwellMs=8000}={}){
 let key=null,since=null,lastTimestamp=0,announced=false,snoozedUntil=0;
 const reset=()=>{key=null;since=null;lastTimestamp=0;announced=false;snoozedUntil=0;};
 return {reset,snooze(now=Date.now()){announced=false;since=null;snoozedUntil=now+60000;},
  sample(position,target,now=Date.now()){
   if(!target)return {arrived:false};
   const targetKey=`${target.id}:${target.lat}:${target.lon}`;
   if(key!==targetKey){reset();key=targetKey;}
   const c=position?.coords,timestamp=position?.timestamp;
   if(!c||!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||!Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>maxAccuracyMeters||!Number.isFinite(timestamp)||now-timestamp>20000||timestamp-now>5000||timestamp<=lastTimestamp){since=null;return {arrived:false,poorSignal:true};}
   if(lastTimestamp&&timestamp-lastTimestamp>30000)since=null;
   lastTimestamp=timestamp;
   const distance=distanceKm({lat:c.latitude,lon:c.longitude},target)*1000;
   if(distance>radiusMeters||(Number.isFinite(c.speed)&&c.speed>3)){since=null;return {arrived:false,distance};}
   if(now<snoozedUntil||announced)return {arrived:false,distance};
   since??=timestamp;
   if(timestamp-since<dwellMs)return {arrived:false,distance,settling:true};
   announced=true;return {arrived:true,distance};
  }
 };
}
