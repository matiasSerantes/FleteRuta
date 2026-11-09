import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderedStops,createRouteQueue,createArrivalDetector} from './planner.mjs';
const origin={lat:0,lon:0},stop=(id,lon,done=false)=>({id,lon,lat:0,done});
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
test('punto de carga permanece al final del orden automático',()=>{
 const loading={...stop('carga',.001),returnPoint:true},customer=stop('cliente',.2);
 assert.deepEqual(orderedStops([loading,customer],origin,false).map(s=>s.id),['cliente','carga']);
 assert.deepEqual(orderedStops([loading,customer],null,false).map(s=>s.id),['cliente','carga']);
});
test('cada nueva dirección reacomoda el recorrido, sin cambiar la identidad de las entregas',()=>{
 let stops=[stop('lejana',.3)];stops=orderedStops(stops,origin,false);
 stops=orderedStops([...stops,stop('cercana',.1)],origin,false);assert.deepEqual(stops.map(s=>s.id),['cercana','lejana']);
 stops=orderedStops([...stops,stop('intermedia',.2)],origin,false);assert.deepEqual(stops.map(s=>s.id),['cercana','intermedia','lejana']);
});
test('el orden por calles puede corregir la cercanía y deja las entregadas al final',()=>{
 const stops=[stop('cercana',.1),stop('lejana',.3),stop('hecha',.01,true)];
 const result=orderedStops(stops,origin,false,[[0,100,1],[1,0,100],[1,1,0]]);
 assert.deepEqual(result.map(s=>s.id),['lejana','cercana','hecha']);assert.equal(result[2].done,true);
});
test('sin GPS conserva las direcciones sin inventar un punto de partida',()=>{const stops=[stop('b',.3),stop('a',.1)];assert.deepEqual(orderedStops(stops,null,false),stops);});
test('borrar o cambiar el estado conserva solo pendientes en la optimización',()=>{
 const stops=[stop('a',.1,true),stop('b',.2),stop('c',.3)];
 assert.deepEqual(orderedStops(stops.filter(s=>s.id!=='b'),origin,true).map(s=>s.id),['c','a']);
 assert.throws(()=>orderedStops(stops,origin,false,[[0,1],[1,0]]));
});
test('una respuesta vieja nunca reemplaza las últimas direcciones',async()=>{
 const pending=[],results=[],errors=[];
 const queue=createRouteQueue({delay:0,calculate:(snapshot,signal)=>new Promise((resolve,reject)=>pending.push({snapshot,signal,resolve,reject})),onResult:(result)=>results.push(result),onError:e=>errors.push(e)});
 queue.schedule('anterior');await tick();queue.schedule('nueva');await tick();assert.equal(pending[0].signal.aborted,true);
 pending[1].resolve('nueva');await tick();pending[0].resolve('anterior');await tick();assert.deepEqual(results,['nueva']);assert.deepEqual(errors,[]);queue.cancel();
});
test('vaciar el reparto cancela resultados y errores pendientes',async()=>{
 let reject,errors=0,results=0;const queue=createRouteQueue({delay:0,calculate:()=>new Promise((_,r)=>reject=r),onResult:()=>results++,onError:()=>errors++});
 queue.schedule({});await tick();queue.cancel();reject(Error('resultado fuera de fecha'));await tick();assert.equal(errors,0);assert.equal(results,0);
});
test('las cargas seguidas se agrupan en un solo cálculo',async()=>{
 const results=[];const queue=createRouteQueue({delay:0,calculate:async snapshot=>snapshot,onResult:value=>results.push(value),onError:()=>assert.fail()});
 queue.schedule(1);queue.schedule(2);queue.schedule(3);await tick();assert.deepEqual(results,[3]);queue.cancel();
});
const target={id:'entrega-a',lat:-34.6,lon:-58.4};
const gps=(time,extra={})=>({timestamp:time,coords:{latitude:target.lat,longitude:target.lon,accuracy:10,speed:0,...extra}});
test('avisa una sola vez después de permanecer cerca y no completa la entrega',()=>{
 const detector=createArrivalDetector();assert.equal(detector.sample(gps(100000),target,100000).arrived,false);
 assert.equal(detector.sample(gps(109000),target,109000).arrived,true);assert.equal(detector.sample(gps(120000),target,120000).arrived,false);assert.equal(target.done,undefined);
});
test('no detecta llegada con GPS antiguo, impreciso, lejano o en movimiento',()=>{
 const detector=createArrivalDetector();for(const sample of [gps(70000),gps(100000,{accuracy:200}),gps(100000,{longitude:-59}),gps(100000,{speed:12})])assert.equal(detector.sample(sample,target,100000).arrived,false);
 assert.equal(detector.sample(gps(101000),target,101000).arrived,false);assert.equal(detector.sample(gps(110000),target,110000).arrived,true);
});
test('posponer no repite el aviso durante un minuto y exige nueva permanencia',()=>{
 const detector=createArrivalDetector();detector.sample(gps(100000),target,100000);assert.equal(detector.sample(gps(109000),target,109000).arrived,true);detector.snooze(109000);
 assert.equal(detector.sample(gps(130000),target,130000).arrived,false);assert.equal(detector.sample(gps(170000),target,170000).arrived,false);assert.equal(detector.sample(gps(179000),target,179000).arrived,true);
});
test('cambiar la próxima entrega reinicia la detección aunque comparta ubicación',()=>{
 const detector=createArrivalDetector();detector.sample(gps(100000),target,100000);assert.equal(detector.sample(gps(109000),target,109000).arrived,true);
 const next={...target,id:'otra-entrega'};assert.equal(detector.sample(gps(110000),next,110000).arrived,false);assert.equal(detector.sample(gps(119000),next,119000).arrived,true);
});
