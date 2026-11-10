export function extractDeliveryAddress(text){
 const lines=String(text||'').split(/\r?\n/).map(line=>line.replace(/[·•]{2,}/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
 const clean=value=>value.replace(/\b(?:barrio|parrio|observaciones|fecha\s*y\s*horario|datos\s*de)\b.*$/i,'')
  .replace(/[—_=]{2,}/g,' ').replace(/[^\p{L}\p{N},.\-\/ ]/gu,' ')
  .replace(/\b(?:P\s*[-/]?\s*P[BE2]|PB)\s*(?:D\s*[-/]?\s*\d+)?\b/ig,' ')
  .replace(/\b\d{4}\s*\/\s*0\s*[-–]\s*/g,', ')
  .replace(/\b\d{4}\s*[-–]\s*/g,', ')
  .replace(/[.]{2,}/g,' ').replace(/\b([A-ZÁÉÍÓÚÑ]{5,})\s+[A-ZÁÉÍÓÚÑ]\s+[a-z]{1,2}\s+([A-ZÁÉÍÓÚÑ])\b/g,'$1$2')
  .replace(/\s*,\s*/g,', ').replace(/\s+/g,' ').trim();
 const hasStreetAndNumber=value=>/\b\d{1,5}\b/.test(value)&&(/[\p{L}]{3,}(?:\s+[\p{L}]{2,})+/u.test(value)||/\b(?:calle|avenida|av\.?|ruta|dr\.?)\s+[\p{L}]{3,}/iu.test(value));
 const index=lines.findIndex(line=>/\benviar\s*[a2]\b/i.test(line));
 if(index>=0){
  const value=clean(lines.slice(index,index+3).join(' ').replace(/^.*?\benviar\s*[a2]\b\s*[.:\s-]*/i,''));
  if(hasStreetAndNumber(value))return value.slice(0,250);
 }
 const blocked=/\b(?:factura|comprobante|env[ií]o\s+n[uú]mero|carga|nro|n[uú]mero|tel[eé]fono|fecha|horario|cliente|dni|cuit|art[ií]culos|precio|total|venta|pago)\b/i;
 for(let i=0;i<lines.length;i++){
  if(blocked.test(lines[i]))continue;
  const candidate=clean([lines[i],lines[i+1]&&!blocked.test(lines[i+1])?lines[i+1]:''].join(' ').replace(/^\s*(?:direcci[oó]n|domicilio|dom)\s*[.:\-]+\s*/i,''));
  if(!hasStreetAndNumber(candidate))continue;
  const postal=/\bB\s?\d{4}(?:[A-Z]{3})?\b/i.test(candidate);
  const number=candidate.match(/\b\d{1,5}\b/);const before=candidate.slice(0,number.index),after=candidate.slice(number.index+number[0].length);
  const locality=/\b[\p{L}]{3,}\b/u.test(after.replace(/\bB\s?\d{4}(?:[A-Z]{3})?\b/ig,''))&&/\b[\p{L}]{3,}\b/u.test(before)
   ||/^\s*\d{1,5}\b/.test(candidate)&&/\b[\p{L}]{3,}(?:\s+[\p{L}]{3,}){2,}\b/u.test(after);
  if(postal||locality)return candidate.slice(0,250);
 }
 return '';
}

export async function readAddressPhoto(file,onProgress=()=>{}){
 if(!file?.type?.startsWith('image/'))throw Error('Elegí una foto del comprobante.');
 if(file.size>20*1024*1024)throw Error('La foto es demasiado grande. Elegí una de hasta 20 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  const {default:{createWorker}}=await import('./vendor/ocr/tesseract.esm.min.js');
  const worker=await createWorker('spa',1,{workerPath:'/vendor/ocr/worker.min.js',corePath:'/vendor/ocr',langPath:'/vendor/ocr',logger:event=>{if(event.status==='recognizing text')onProgress(Math.round(event.progress*100));}});
  try{
   const crop=document.createElement('canvas');crop.width=canvas.width;crop.height=Math.round(canvas.height*.22);
   crop.getContext('2d').drawImage(canvas,0,Math.round(canvas.height*.30),canvas.width,crop.height,0,0,crop.width,crop.height);
   const first=await worker.recognize(crop);crop.width=0;crop.height=0;
   const found=extractDeliveryAddress(first.data.text);if(found)return found;
   const full=extractDeliveryAddress((await worker.recognize(canvas)).data.text);if(full)return full;
   for(const clockwise of [true,false]){
    const turned=document.createElement('canvas');turned.width=canvas.height;turned.height=canvas.width;
    const context=turned.getContext('2d');context.translate(clockwise?turned.width:0,clockwise?0:turned.height);context.rotate(clockwise?Math.PI/2:-Math.PI/2);context.drawImage(canvas,0,0);
    const middle=document.createElement('canvas');middle.width=turned.width;middle.height=Math.round(turned.height*.22);
    middle.getContext('2d').drawImage(turned,0,Math.round(turned.height*.30),turned.width,middle.height,0,0,middle.width,middle.height);
    const cropped=extractDeliveryAddress((await worker.recognize(middle)).data.text);middle.width=0;middle.height=0;
    if(cropped){turned.width=0;turned.height=0;return cropped;}
    const result=extractDeliveryAddress((await worker.recognize(turned)).data.text);turned.width=0;turned.height=0;
    if(result)return result;
   }
   return '';
  }
  finally{await worker.terminate();canvas.width=0;canvas.height=0;}
 }finally{bitmap.close();}
}
