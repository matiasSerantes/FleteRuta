import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const scrypt=promisify(scryptCallback),root=fileURLToPath(new URL('.',import.meta.url));
const SESSION_MS=8*60*60*1000;
export async function passwordHash(password,salt){return (await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024})).toString('hex');}
const digest=value=>createHash('sha256').update(value).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export async function createApp({authPath=path.join(root,'.private','auth.json'),setupToken=randomBytes(32).toString('hex')}={}){
 let user=null;try{user=JSON.parse(await readFile(authPath,'utf8'));if(!user.username||!user.salt||!user.hash)throw Error('Configuración de acceso inválida.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const sessions=new Map(),attempts=new Map();let setupPending=false;
 const dummySalt=randomBytes(16).toString('hex');
 const publicFiles=new Map([['/login','login.html'],['/login.js','login.js'],['/app.css','app.css']]);
 const privateFiles=new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/core.mjs','core.mjs'],['/estado-proyecto.html','estado-proyecto.html']]);
 for(const name of ['cloud-sync.js','address-list.js','profile.js','trip.js','notifications-sw.js','planner.mjs','estado-proyecto.js','INICIAR.md','README.md','VERIFICACION.md'])privateFiles.set('/'+name,name);
 for(const name of ['leaflet.js','leaflet.css','images/layers.png','images/layers-2x.png','images/marker-icon.png','images/marker-icon-2x.png','images/marker-shadow.png'])privateFiles.set('/vendor/leaflet/'+name,'vendor/leaflet/'+name);
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self' https://nominatim.openstreetmap.org https://router.project-osrm.org; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  const redirect=where=>{res.writeHead(303,{Location:where});res.end();};
  try{
   if(!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host||''))return send(403,{error:'Host no permitido. Usá localhost.'});
   const url=new URL(req.url,`http://${req.headers.host}`),now=Date.now();
   // Periodic pruning prevents unbounded state from expired sessions or attempts.
   for(const [key,value] of sessions)if(value.expires<=now)sessions.delete(key);
   for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
   const cookie=(req.headers.cookie||'').split(';').map(p=>p.trim()).find(p=>p.startsWith('fr_session='))?.slice(11);
   const session=cookie?sessions.get(digest(cookie)):null;
   if(req.method==='GET'&&url.pathname==='/auth/status')return send(200,{configured:!!user,authenticated:!!session,username:session?.username});
   if(req.method==='POST'&&url.pathname.startsWith('/auth/')){
    if(req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'Origen no permitido.'});
    if(!(req.headers['content-type']||'').startsWith('application/json'))return send(415,{error:'Se requiere JSON.'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return send(413,{error:'Solicitud demasiado grande.'});}let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'Solicitud inválida.'});}
    if(url.pathname==='/auth/logout'){if(cookie)sessions.delete(digest(cookie));res.setHeader('Set-Cookie','fr_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true});}
    if(!['/auth/login','/auth/setup'].includes(url.pathname))return send(404,{error:'No encontrado.'});
    const ip=req.socket.remoteAddress,limit=attempts.get(ip);if(limit?.count>=6)return send(429,{error:'Demasiados intentos. Esperá 15 minutos antes de volver a intentar.'});
    attempts.set(ip,{count:(limit?.count||0)+1,until:limit?.until||now+15*60*1000});
    const username=typeof body.username==='string'?body.username.trim():'',password=body.password;
    if(url.pathname==='/auth/setup'){
     if(user||setupPending)return send(403,{error:'La creación de usuario está cerrada.'});
     if(!equal(body.token,setupToken))return send(403,{error:'Enlace de configuración inválido. Usá el enlace de la ventana del servidor.'});
     if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)||typeof password!=='string'||password.length<12||password.length>128)return send(400,{error:'Usuario: 3 a 40 letras, números, guion o punto. Contraseña: 12 a 128 caracteres.'});
     setupPending=true;try{const salt=randomBytes(16).toString('hex');const account={username,salt,hash:await passwordHash(password,salt)};await mkdir(path.dirname(authPath),{recursive:true});await writeFile(authPath,JSON.stringify(account),{flag:'wx',mode:0o600});user=account;setupToken=null;}finally{setupPending=false;}
    }else{
     if(typeof password!=='string'||password.length>128)return send(401,{error:'Usuario o contraseña incorrectos.'});
     const hash=await passwordHash(password,user?.salt||dummySalt);
     if(!user||!equal(username,user.username)||!equal(hash,user.hash))return send(401,{error:'Usuario o contraseña incorrectos.'});
    }
    attempts.delete(ip);if(cookie)sessions.delete(digest(cookie));const token=randomBytes(32).toString('hex');sessions.set(digest(token),{username:user.username,expires:Date.now()+SESSION_MS});
    res.setHeader('Set-Cookie',`fr_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS/1000}`);return send(200,{ok:true});
   }
   if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Método no permitido.'});
   let file=publicFiles.get(url.pathname);
   if(url.pathname==='/login'&&session)return redirect('/');
   if(!file){if(!session){if(url.pathname==='/'||url.pathname.endsWith('.html'))return redirect('/login');return send(401,{error:'Iniciá sesión para continuar.'});}file=privateFiles.get(url.pathname);}
   if(!file)return send(404,{error:'No encontrado.'});
   const content=await readFile(path.join(root,file));res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);
  }catch(e){console.error('Error de solicitud:',e.code||e.name);if(!res.headersSent)send(500,{error:'No se pudo completar la solicitud.'});else res.end();}
 });
 return {server,setupURL:port=>user?null:`http://localhost:${port}/login#setup=${setupToken}`};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||5173),app=await createApp();
 app.server.on('error',e=>{console.error('No se pudo iniciar FleteRuta:',e.code);process.exitCode=1;});
 app.server.listen(port,'127.0.0.1',()=>{console.log(`FleteRuta TEST 0.3: http://localhost:${port}`);const setup=app.setupURL(port);if(setup)console.log(`Creá tu usuario con este enlace privado de un solo uso:\n${setup}`);else console.log('Ingresá con tu usuario y contraseña.');});
}
