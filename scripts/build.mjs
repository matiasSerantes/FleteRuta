import {mkdir,copyFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),dist=new URL('../dist/',import.meta.url);
const files=['index.html','app.js','app.css','core.mjs','planner.mjs','trip.js','cloud-sync.js','address-list.js','camera-address.mjs','profile.js','admin.html','admin.js','login.html','login.js','apps.html','apps.js','notifications-sw.js','estado-proyecto.html','estado-proyecto.js'];
async function copy(name){await mkdir(path.dirname(fileURLToPath(new URL(name,dist))),{recursive:true});await copyFile(new URL(name,root),new URL(name,dist));}
await mkdir(dist,{recursive:true});
for(const file of files)await copy(file);
for(const entry of await readdir(new URL('vendor/leaflet/',root),{recursive:true,withFileTypes:true})){if(!entry.isFile())continue;const parent=entry.parentPath||entry.path;const rel=path.relative(fileURLToPath(new URL('vendor/leaflet/',root)),parent);await copy('vendor/leaflet/'+path.join(rel,entry.name).replaceAll('\\','/'));}
for(const entry of await readdir(new URL('vendor/ocr/',root),{withFileTypes:true})){if(entry.isFile())await copy('vendor/ocr/'+entry.name);}
console.log('Assets preparados: interfaz, mapa y OCR local. Sin .private, servidor, tests ni configuración.');
