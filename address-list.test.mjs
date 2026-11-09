import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {parseAddressList,mountAddressList} from './address-list.js';

test('lista acepta Excel y saltos de línea, valida capacidad sin truncar clientes',()=>{
 assert.deepEqual(parseAddressList('\uFEFFCorrientes 1234, CABA\tAna\tTimbre 2\r\n\nMaipu 2500, Olivos'),[
  {address:'Corrientes 1234, CABA',recipient:'Ana',notes:'Timbre 2'},
  {address:'Maipu 2500, Olivos',recipient:'',notes:''}
 ]);
 assert.throws(()=>parseAddressList(''),/al menos/);
 assert.throws(()=>parseAddressList('abc'),/línea 1/);
 assert.throws(()=>parseAddressList('Calle 123\tNombre\tNota\tExtra'),/línea 1/);
 assert.throws(()=>parseAddressList('Calle 123\nCalle 456',1),/quedan 1/);
 assert.throws(()=>parseAddressList(Array(41).fill('Calle 123').join('\n')),/40 entregas/);
});

test('lista sobrevive reapertura y solo avanza al confirmar su dirección',()=>{
 const window=new Window();window.document.body.innerHTML='<textarea id="address-list"></textarea><p id="list-progress"></p><button id="list-load"></button><button id="list-next"></button><button id="list-cancel"></button>';
 const previous={document:globalThis.document,localStorage:globalThis.localStorage};
 Object.defineProperty(globalThis,'document',{value:window.document,writable:true,configurable:true});Object.defineProperty(globalThis,'localStorage',{value:window.localStorage,writable:true,configurable:true});
 const fills=[],options={storageKey:'test-list',getCapacity:()=>30,isBusy:()=>false,onFill:item=>fills.push(item),message(){}};
 try{
  let list=mountAddressList(options);window.document.getElementById('address-list').value='Calle 123\tAna\nCalle 456';window.document.getElementById('list-load').click();assert.equal(list.pending,2);assert.equal(fills[0].recipient,'Ana');
  list.confirmed('Otra calle');assert.equal(list.pending,2);
  list.confirmed('Calle 123');assert.equal(list.pending,1);assert.equal(fills.at(-1).address,'Calle 456');
  list=mountAddressList(options);assert.equal(list.pending,1);window.document.getElementById('list-next').click();assert.equal(fills.at(-1).address,'Calle 456');
  list.confirmed('Calle 456');assert.equal(list.pending,0);assert.deepEqual(JSON.parse(localStorage.getItem('test-list')),[]);
 }finally{Object.assign(globalThis,previous);window.close();}
});
