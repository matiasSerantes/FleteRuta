// Local browser check with fictional stops and simulated login/GPS. Never contacts Auth.
import {createServer} from 'node:http';
import {readFile,mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const browserPath=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile=await mkdtemp(path.join(tmpdir(),'fleteruta-browser-'));
let authFormTest=false,signupWrites=0;
const server=createServer(async(req,res)=>{
 if(req.url==='/auth/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(authFormTest?{authenticated:false,configured:true,backend:'supabase'}:{authenticated:true}));return;}
 if(req.url==='/auth/signup'&&authFormTest){signupWrites++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,pendingApproval:true}));return;}
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=spawn(browserPath,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try{
 let port;for(let i=0;i<100;i++){try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await new Promise(r=>setTimeout(r,100));}}
 if(!port)throw Error('Chrome did not start');
 const targets=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(10000)}).then(r=>r.json());socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Browser connection timed out')),10000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Browser connection failed'));},{once:true});});
 let id=0;const pending=new Map();socket.addEventListener('message',e=>{const message=JSON.parse(e.data);if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const request=++id,timer=setTimeout(()=>{pending.delete(request);reject(Error('Browser timeout: '+method));},10000);pending.set(request,{resolve(value){clearTimeout(timer);resolve(value);},reject(error){clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id:request,method,params}));});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 await send('Page.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['*router.project-osrm.org*','*tile.openstreetmap.org*']});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('fleteruta-test-v1',JSON.stringify({stops:[{id:'demo1',address:'Av. Corrientes 1234, CABA',lat:-34.604,lon:-58.39,done:false,recipient:'Cliente de prueba',notes:'Portón azul'},{id:'demo2',address:'Av. Santa Fe 2500, CABA',lat:-34.59,lon:-58.40,done:false}]}));Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok){ok({timestamp:Date.now(),coords:{latitude:-34.6037,longitude:-58.3816,accuracy:10}})},watchPosition(){return 1},clearWatch(){}}});`});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
 for(let i=0;i<100;i++){if(await evaluate(`document.querySelectorAll('#stops tr').length===2 && document.getElementById('gps-label').textContent==='Ubicación actual lista'`))break;await new Promise(r=>setTimeout(r,100));}
 const mobile=await evaluate(`({width:innerWidth,content:document.documentElement.scrollWidth,rows:document.querySelectorAll('#stops tr').length,rowDisplay:getComputedStyle(document.querySelector('#stops tr')).display,actions:[...document.querySelectorAll('#stops .actions button')].filter(b=>b.getBoundingClientRect().height>0).map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})),list:!!document.getElementById('list-load')})`);
 assert.equal(mobile.rows,2);assert.equal(mobile.rowDisplay,'block');assert.ok(mobile.content<=mobile.width,JSON.stringify(mobile));assert.ok(mobile.actions.every(b=>b.height>=44));assert.ok(mobile.list);
 assert.equal(await evaluate(`document.querySelectorAll('a[href*="google.com/maps/dir"],a[href*="waze.com/ul"]').length`),1);
 for(const width of [360,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:true});
  await evaluate(`window.scrollTo(0,0)`);
  const readability=await evaluate(`({width:innerWidth,content:document.documentElement.scrollWidth,buttonSize:parseFloat(getComputedStyle(document.getElementById('trip-go')).fontSize),targetSize:parseFloat(getComputedStyle(document.getElementById('trip-target')).fontSize),nav:document.querySelector('.bottom-nav').getBoundingClientRect().toJSON(),navigation:document.getElementById('trip-go').getBoundingClientRect().toJSON()})`);
  assert.ok(readability.content<=width,JSON.stringify(readability));assert.ok(readability.buttonSize>=18);assert.ok(readability.targetSize>=20);assert.ok(readability.navigation.bottom<=readability.nav.top,'Main navigation must be visible above the bottom bar');
  await mkdir(path.join(root,'.private'),{recursive:true});await writeFile(path.join(root,'.private',`home-${width}.png`),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  for(const name of ['clients','account','route']){
   await evaluate(`document.querySelector('.bottom-nav [data-view-target="${name}"]').click()`);
   assert.equal(await evaluate(`document.getElementById('view-${name}').hidden`),false);
   assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'Overflow in '+name);
  }
 }
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await mkdir(path.join(root,'.private'),{recursive:true});await evaluate(`document.querySelector('.trip-panel').scrollIntoView()`);
 await writeFile(path.join(root,'.private','navigation-390.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await mkdir(path.join(root,'.private'),{recursive:true});await evaluate(`document.querySelector('.deliveries-panel').scrollIntoView()`);
 await writeFile(path.join(root,'.private','mobile-390.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 const desktop=await evaluate(`({width:innerWidth,content:document.documentElement.scrollWidth,rowDisplay:getComputedStyle(document.querySelector('#stops tr')).display})`);assert.equal(desktop.rowDisplay,'table-row');assert.ok(desktop.content<=desktop.width);
 console.log(JSON.stringify({mobile,desktop,screenshot:'.private/mobile-390.png'},null,2));
 authFormTest=true;await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/login.html`});
 for(let i=0;i<100;i++){if(await evaluate(`!!document.getElementById('toggle-signup') && !document.getElementById('toggle-signup').hidden`))break;await new Promise(r=>setTimeout(r,50));}
 await evaluate(`document.getElementById('toggle-signup').click();document.getElementById('full-name').value='Persona de prueba';document.getElementById('username').value='fake@example.com';document.getElementById('password').value='12345678';document.getElementById('confirm-password').value='12345678';document.getElementById('login-form').requestSubmit()`);
 assert.equal(signupWrites,0);assert.equal(await evaluate(`document.getElementById('auth-feedback').open`),true);assert.match(await evaluate(`document.getElementById('feedback-text').textContent`),/8 caracteres.*al menos 12/);
 assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));await writeFile(path.join(root,'.private','signup-short-password.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await evaluate(`document.getElementById('feedback-close').click();document.getElementById('password').value='fake-password-long-2026';document.getElementById('confirm-password').value='fake-password-long-2026';document.getElementById('login-form').requestSubmit()`);
 for(let i=0;i<100;i++){if(await evaluate(`document.getElementById('feedback-title').textContent==='Revisá tu correo'`))break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(signupWrites,1);assert.equal(await evaluate(`document.getElementById('auth-feedback').open`),true);assert.match(await evaluate(`document.getElementById('feedback-text').textContent`),/Solicitud recibida/);await writeFile(path.join(root,'.private','signup-success.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 console.log('Chrome signup: short password blocked with visible dialog; simulated success shows email instructions. No emails sent.');
}finally{socket?.close();browser.kill();server.close();}
