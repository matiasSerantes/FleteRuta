export function parseAddressList(text, capacity=30){
 const rows=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim()).map((line,index)=>{
  const fields=line.split('\t').map(value=>value.trim());
  if(fields.length>3||fields[0].length<4||fields[0].length>250||(fields[1]?.length||0)>150||(fields[2]?.length||0)>300)throw Error(`Revisá la línea ${index+1}: dirección de 4 a 250 caracteres y hasta tres columnas.`);
  return {address:fields[0],recipient:fields[1]||'',notes:fields[2]||''};
 });
 if(!rows.length)throw Error('Pegá al menos una dirección, con su localidad.');
 if(rows.length>capacity)throw Error(`Hay ${rows.length} direcciones y quedan ${capacity} lugares. Se admiten hasta 30 entregas por reparto.`);
 return rows;
}

export function mountAddressList({storageKey,getCapacity,isBusy,onFill,message}){
 const $=id=>document.getElementById(id);let rows=[];
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify(rows));}catch{message('No se pudo guardar la lista pendiente en este navegador. Conservá una copia.',true);}}
 function render(){
  $('list-progress').textContent=rows.length?`${rows.length} direcciones por confirmar. Buscá y confirmá la primera para continuar.`:'Pegá una dirección por renglón. También podés copiar hasta tres columnas de Excel: dirección, destinatario y observaciones.';
  $('list-next').hidden=!rows.length;$('list-cancel').hidden=!rows.length;$('list-load').hidden=!!rows.length;$('address-list').hidden=!!rows.length;
 }
 function fill(){if(rows.length)onFill({...rows[0]});}
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved)&&saved.length&&saved.length<=30){const parsed=parseAddressList(saved.map(s=>[s.address,s.recipient||'',s.notes||''].join('\t')).join('\n'));rows=parsed;}}catch{}
 $('list-load').onclick=()=>{if(isBusy())return;try{const parsed=parseAddressList($('address-list').value,getCapacity());rows=parsed;persist();render();fill();message('Lista preparada. Buscá la dirección y confirmá su ubicación antes de pasar a la siguiente.');}catch(error){message(error.message,true);}};
 $('list-next').onclick=()=>{if(!isBusy())fill();};
 $('list-cancel').onclick=()=>{if(!isBusy()&&confirm('¿Descartar la lista pendiente? Las entregas ya confirmadas se conservan.')){rows=[];persist();render();}};
 render();
 return {confirmed(query){if(!rows.length||rows[0].address!==query)return;rows.shift();persist();render();if(rows.length)fill();else message('Lista completada. Todas las direcciones confirmadas están en el mapa.');},clear(){rows=[];persist();render();},get pending(){return rows.length;}};
}
