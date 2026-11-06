const PUBLIC=new Set(['/login','/login.html','/login.js','/admin.js','/app.css','/app.js','/core.mjs','/planner.mjs','/trip.js','/cloud-sync.js','/notifications-sw.js','/estado-proyecto.js']);
const PRIVATE=new Set(['/','/index.html','/admin','/admin.html','/estado-proyecto.html']);
const LIBRARY=new Set(['leaflet.js','leaflet.css','images/layers.png','images/layers-2x.png','images/marker-icon.png','images/marker-icon-2x.png','images/marker-shadow.png'].map(p=>'/vendor/leaflet/'+p));
const MIME={mjs:'text/javascript; charset=utf-8',js:'text/javascript; charset=utf-8',html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png'};
export function validateRoute(body){
 if(!body||typeof body!=='object')return false;
 if(!Array.isArray(body.stops)||body.stops.length>30||typeof body.roundTrip!=='boolean'||typeof body.manualOrder!=='boolean'||!Number.isInteger(body.revision)||body.revision<0)return false;
 const ids=new Set();return body.stops.every(s=>{if(!s||typeof s.id!=='string'||!s.id.length||s.id.length>80||ids.has(s.id))return false;ids.add(s.id);return typeof s.address==='string'&&s.address.length>0&&s.address.length<=2500&&Number.isFinite(s.lat)&&Math.abs(s.lat)<=90&&Number.isFinite(s.lon)&&Math.abs(s.lon)<=180&&typeof s.done==='boolean'&&(s.recipient===undefined||typeof s.recipient==='string'&&s.recipient.length<=150)&&(s.notes===undefined||typeof s.notes==='string'&&s.notes.length<=300);});
}
export async function handle(request,env,upstream=fetch){
 const url=new URL(request.url),headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self' https://nominatim.openstreetmap.org https://router.project-osrm.org; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"});
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:new Headers([...headers,['Content-Type','application/json; charset=utf-8']])});
 const redirect=where=>new Response(null,{status:303,headers:new Headers([...headers,['Location',where]])});
 const cookieOptions=`HttpOnly; SameSite=Strict; Path=/${url.protocol==='https:'?'; Secure':''}`;
 const setTokens=session=>{headers.append('Set-Cookie',`fr_access=${session.access_token}; ${cookieOptions}; Max-Age=${Math.max(60,session.expires_in||3600)}`);headers.append('Set-Cookie',`fr_refresh=${session.refresh_token}; ${cookieOptions}; Max-Age=28800`);};
 const clearTokens=()=>{for(const name of ['fr_access','fr_refresh'])headers.append('Set-Cookie',`${name}=; ${cookieOptions}; Max-Age=0`);};
 const cookies=Object.fromEntries((request.headers.get('Cookie')||'').split(';').map(s=>s.trim().split(/=(.*)/s)).filter(p=>p.length>1).map(p=>[p[0],p[1]]));
 async function api(route,{token,method='GET',body}={}){
  return upstream(env.SUPABASE_URL+route,{method,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 }
 async function authenticate(){
  let token=cookies.fr_access,userResponse=token?await api('/auth/v1/user',{token}):null;
  if((!userResponse||userResponse.status===401||userResponse.status===403)&&cookies.fr_refresh){
   const response=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:cookies.fr_refresh}});
   if(response.ok){const session=await response.json();token=session.access_token;setTokens(session);userResponse=await api('/auth/v1/user',{token});}else{clearTokens();return null;}
  }
  if(!userResponse||!userResponse.ok)return null;const user=await userResponse.json();
  if(!/^[0-9a-f-]{36}$/i.test(user.id||''))return null;
  const member=await api('/rest/v1/fleteruta_members?'+new URLSearchParams({user_id:'eq.'+user.id,enabled:'eq.true',select:'user_id'}),{token});
  if(!member.ok)throw Error('membership_unavailable');
  if(!(await member.json()).length)return null;
  const access=await accessStatus(token);return {user,token,isAdmin:access.is_admin,mfaRequired:access.mfa_required};
 }
 async function accessStatus(token){const r=await api('/rest/v1/rpc/fleteruta_access_status',{token,method:'POST',body:{}});if(!r.ok)throw Error('access_status_unavailable');return r.json();}
 async function bodyJSON(limit){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Object.assign(Error('Se requiere JSON.'),{status:415});
  const reader=request.body?.getReader();if(!reader)return {};let size=0,chunks=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Object.assign(Error('Solicitud demasiado grande.'),{status:413});}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(Error('JSON inválido.'),{status:400});}
 }
 try{
  if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)return json({error:'Falta configurar Supabase.'},503);
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Origen no permitido.'},403);
  if(url.pathname==='/auth/signup'&&request.method==='POST'){
   const body=await bodyJSON(4096),email=typeof body.email==='string'?body.email.trim().toLowerCase():'',name=typeof body.fullName==='string'?body.fullName.trim():'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||name.length<2||name.length>100||typeof body.password!=='string'||body.password.length<12||body.password.length>128)return json({error:'Ingresá nombre, correo válido y una contraseña de 12 a 128 caracteres.'},400);
   const response=await api('/auth/v1/signup?'+new URLSearchParams({redirect_to:url.origin+'/login'}),{method:'POST',body:{email,password:body.password,data:{full_name:name,signup_app:'fleteruta'}}});
   if(!response.ok){const error=await response.json();if(error.code==='user_already_exists')return json({ok:true,pendingApproval:true});return json({error:response.status===429?'Se alcanzó el límite de solicitudes. Esperá unos minutos antes de reintentar.':error.code==='weak_password'?'Elegí una contraseña más segura.':'No se pudo completar el registro. Revisá el correo o probá más tarde.'},response.status===429?429:400);}
   // A successful signup never grants app membership or returns any Auth session.
   const created=await response.json();if(created.access_token)await api('/auth/v1/logout?scope=local',{token:created.access_token,method:'POST'});
   return json({ok:true,pendingApproval:true});
  }
  if(url.pathname==='/auth/login'&&request.method==='POST'){
   const body=await bodyJSON(4096),email=body.email||body.username;
   if(typeof email!=='string'||!email.includes('@')||email.length>254||typeof body.password!=='string'||body.password.length>128)return json({error:'Ingresá correo y contraseña.'},400);
   const response=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password:body.password}});
   if(!response.ok)return json({error:response.status===429?'Demasiados intentos. Esperá antes de volver a ingresar.':'Correo o contraseña incorrectos.'},response.status===429?429:401);
   const session=await response.json(),member=await api('/rest/v1/fleteruta_members?'+new URLSearchParams({user_id:'eq.'+session.user.id,enabled:'eq.true',select:'user_id'}),{token:session.access_token});
   if(!member.ok)throw Error('membership_unavailable');
   if(!(await member.json()).length){await api('/auth/v1/logout?scope=local',{token:session.access_token,method:'POST'});return json({error:'Tu cuenta no está habilitada para FleteRuta.'},403);}
   const access=await accessStatus(session.access_token);setTokens(session);return json({ok:true,mfaRequired:access.mfa_required});
  }
  if(url.pathname==='/auth/logout'&&request.method==='POST'){
   clearTokens();if(cookies.fr_access){const r=await api('/auth/v1/logout?scope=local',{token:cookies.fr_access,method:'POST'});if(!r.ok&&r.status!==401&&r.status!==403)return json({error:'Sesión cerrada en este navegador; no se pudo revocar en el servidor.'},502);}return json({ok:true});
  }
  if(url.pathname==='/auth/status'&&request.method==='GET'){
   const auth=await authenticate();return json({configured:true,backend:'supabase',authenticated:!!auth,...(auth?{userId:auth.user.id,username:auth.user.email,isAdmin:auth.isAdmin,mfaRequired:auth.mfaRequired}:{})});
  }
  if(url.pathname==='/auth/mfa'&&request.method==='POST'){
   const auth=await authenticate();if(!auth)return json({error:'Iniciá sesión para verificar el código.'},401);
   const body=await bodyJSON(4096);if(!/^\d{6}$/.test(body.code||''))return json({error:'Ingresá el código de 6 dígitos.'},400);
   const factor=auth.user.factors?.find(f=>f.factor_type==='totp'&&f.status==='verified');if(!factor||!/^[a-f0-9-]{36}$/i.test(factor.id))return json({error:'No se encontró un autenticador configurado.'},400);
   const challenge=await api(`/auth/v1/factors/${factor.id}/challenge`,{token:auth.token,method:'POST',body:{}});if(!challenge.ok)return json({error:'No se pudo iniciar la verificación.'},400);
   const challengeData=await challenge.json();const verified=await api(`/auth/v1/factors/${factor.id}/verify`,{token:auth.token,method:'POST',body:{challenge_id:challengeData.id,code:body.code}});
   if(!verified.ok)return json({error:'Código incorrecto o vencido. Probá con el código actual de tu autenticador.'},400);
   setTokens(await verified.json());return json({ok:true});
  }
  if(url.pathname.startsWith('/api/admin/')){
   const auth=await authenticate();if(!auth)return json({error:'Iniciá sesión.'},401);if(!auth.isAdmin||auth.mfaRequired)return json({error:'Acceso exclusivo del administrador. Completá la verificación de tu cuenta.'},403);
   let route,body;
   if(url.pathname==='/api/admin/users'&&request.method==='GET'){
    const search=url.searchParams.get('search')||'',offset=Number(url.searchParams.get('offset')||0);if(search.length>120||!Number.isInteger(offset)||offset<0||offset>100000)return json({error:'Filtro inválido.'},400);
    route='fleteruta_admin_users';body={p_search:search,p_offset:offset};
   }else if(url.pathname==='/api/admin/access'&&request.method==='PUT'){
    const input=await bodyJSON(4096);if(!/^[a-f0-9-]{36}$/i.test(input.userId||'')||typeof input.fleteruta!=='boolean'||typeof input.hidrotrack!=='boolean')return json({error:'Elegí una cuenta y sus aplicaciones.'},400);
    route='fleteruta_set_access';body={p_user:input.userId,p_fleteruta:input.fleteruta,p_hidrotrack:input.hidrotrack};
   }else return json({error:'No encontrado.'},404);
   const r=await api('/rest/v1/rpc/'+route,{token:auth.token,method:'POST',body});
   if(!r.ok){const error=await r.json();return json({error:error.code==='42501'?'Acceso denegado.':error.message||'No se pudo actualizar el acceso.'},error.code==='42501'?403:422);}return json(await r.json());
  }
  if(url.pathname==='/api/route'){
   const auth=await authenticate();if(!auth)return json({error:'Iniciá sesión en FleteRuta.'},401);if(auth.mfaRequired)return json({error:'Completá la verificación de tu cuenta.'},403);
   if(request.method==='GET'){
    const r=await api('/rest/v1/fleteruta_routes?'+new URLSearchParams({user_id:'eq.'+auth.user.id,select:'stops,round_trip,manual_order,revision,updated_at'}),{token:auth.token});
    if(!r.ok)throw Error('route_read_failed');const routes=await r.json();return json({route:routes[0]||null});
   }
   if(request.method==='PUT'){
    const body=await bodyJSON(131072);if(!validateRoute(body))return json({error:'Reparto inválido. Se admiten hasta 30 paradas.'},400);
    const r=await api('/rest/v1/rpc/fleteruta_save_route',{method:'POST',token:auth.token,body:{p_stops:body.stops,p_round_trip:body.roundTrip,p_manual_order:body.manualOrder,p_expected_revision:body.revision}});
    if(!r.ok){const e=await r.json();return json({error:e.code==='40001'?'El reparto cambió en otro dispositivo. Recuperá la copia de la nube antes de guardar.':'No se pudo guardar el reparto.'},e.code==='40001'?409:502);}
    return json({route:(await r.json())[0]});
   }
   return json({error:'Método no permitido.'},405);
  }
  if(!['GET','HEAD'].includes(request.method))return json({error:'No encontrado.'},404);
  if(PRIVATE.has(url.pathname)){const auth=await authenticate();if(!auth||auth.mfaRequired)return redirect('/login');if((url.pathname==='/admin'||url.pathname==='/admin.html')&&!auth.isAdmin)return json({error:'Acceso exclusivo del administrador.'},403);}
  if(!PRIVATE.has(url.pathname)&&!PUBLIC.has(url.pathname)&&!LIBRARY.has(url.pathname))return json({error:'No encontrado.'},404);
  const assetURL=new URL(url);if(url.pathname==='/')assetURL.pathname='/index.html';if(url.pathname==='/login')assetURL.pathname='/login.html';if(url.pathname==='/admin')assetURL.pathname='/admin.html';
  const asset=await env.ASSETS.fetch(new Request(assetURL,{method:request.method}));
  headers.set('Content-Type',MIME[assetURL.pathname.split('.').at(-1)]||'application/octet-stream');
  return new Response(asset.body,{status:asset.status,headers});
 }catch(error){return json({error:error.status?error.message:'No se pudo conectar con el servicio. Volvé a intentar.'},error.status||503);}
}
export default {fetch(request,env){return handle(request,env);}};
