export function extractDeliveryAddress(text){
 const lines=String(text||'').split(/\r?\n/).map(line=>line.replace(/[·•]{2,}/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
 const index=lines.findIndex(line=>/\benviar\s*[a2]\b/i.test(line));
 if(index<0)return '';
 let value=lines.slice(index,index+3).join(' ').replace(/^.*?\benviar\s*[a2]\b\s*[.:\s-]*/i,'').replace(/\b(?:barrio|parrio|observaciones|fecha\s*y\s*horario|datos\s*de)\b.*$/i,'');
 value=value.replace(/[—_=]{2,}/g,' ').replace(/[^\p{L}\p{N},.\-\/ ]/gu,' ')
  .replace(/\b(?:P\s*[-/]?\s*P[BE2]|PB)\s*(?:D\s*[-/]?\s*\d+)?\b/ig,' ')
  .replace(/\b\d{4}\s*\/\s*0\s*[-–]\s*/g,', ')
  .replace(/\b\d{4}\s*[-–]\s*/g,', ')
  .replace(/[.]{2,}/g,' ').replace(/\b([A-ZÁÉÍÓÚÑ]{5,})\s+[A-ZÁÉÍÓÚÑ]\s+[a-z]{1,2}\s+([A-ZÁÉÍÓÚÑ])\b/g,'$1$2')
  .replace(/\s*,\s*/g,', ').replace(/\s+/g,' ').trim();
 return /\b\d{1,5}\b/.test(value)&&/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(value)?value.slice(0,250):'';
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
   const result=await worker.recognize(canvas);return extractDeliveryAddress(result.data.text);
  }
  finally{await worker.terminate();canvas.width=0;canvas.height=0;}
 }finally{bitmap.close();}
}
