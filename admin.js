export const appLabel=user=>user.fleteruta?(user.hidrotrack?'Ambas aplicaciones':'Solo FleteRuta'):(user.hidrotrack?'Solo HidroTrack':'Sin acceso asignado');
export function mountAdmin(){
 const $=id=>document.getElementById(id),labels={both:'Ambas aplicaciones',hidro:'Solo HidroTrack',flete:'Solo FleteRuta',none:'Sin acceso'};let offset=0,busy=false;
 const status=text=>$('admin-status').textContent=text;
 const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 async function api(path,options){const r=await fetch(path,options);const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo completar la operación.');return data;}
 async function load(){
  if(busy)return;busy=true;status('Buscando cuentas…');$('users-list').replaceChildren();
  try{
   const data=await api('/api/admin/users?'+new URLSearchParams({search:$('users-query').value.trim(),offset:String(offset)}));
   for(const user of data.users){
    const row=node('tr'),identity=node('td');identity.append(node('strong',user.full_name||'Sin nombre'),node('p',user.email));
    const apps=node('td',appLabel(user)),hydro=node('td',user.is_admin?'Administrador protegido':user.hidro_protected?'Titular protegido':`${user.hidro_memberships} empresa(s) asignada(s)`),actions=node('td'),select=node('select');
    select.setAttribute('aria-label','Aplicaciones de '+user.email);const current=user.fleteruta?(user.hidrotrack?'both':'flete'):(user.hidrotrack?'hidro':'none');
    for(const [value,label] of Object.entries(labels)){const option=node('option',label);option.value=value;const enablesHydro=value==='both'||value==='hidro';option.disabled=(user.is_admin&&value!=='both')||(user.hidro_protected&&user.hidrotrack&&!enablesHydro)||(!user.hidrotrack&&user.hidro_memberships!==1&&enablesHydro);select.append(option);}select.value=current;
    const save=node('button','Guardar');save.disabled=user.is_admin;save.onclick=async()=>{
     if(busy||select.value===current)return;const chosen=select.value;
     if(!confirm(`¿Cambiar el acceso de ${user.email} a ${labels[chosen]}?`))return;
     busy=true;save.disabled=true;status('Actualizando permisos…');
     try{await api('/api/admin/access',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:user.user_id,fleteruta:chosen==='both'||chosen==='flete',hidrotrack:chosen==='both'||chosen==='hidro'})});busy=false;await load();status('Acceso actualizado. Se guardó el cambio en el historial.');}
     catch(error){status(error.message);}finally{busy=false;save.disabled=user.is_admin;}
    };
    const group=node('div');group.className='trip-actions';group.append(select,save);actions.append(group);row.append(identity,apps,hydro,actions);$('users-list').append(row);
   }
   $('users-prev').disabled=offset===0;$('users-next').disabled=offset+50>=data.total;$('users-page').textContent=`Página ${Math.floor(offset/50)+1} · ${data.total} cuentas`;status(data.users.length?'Elegí las aplicaciones de cada cuenta.':'No se encontraron cuentas.');
  }catch(error){status(error.message);}finally{busy=false;}
 }
 $('users-search').onsubmit=e=>{e.preventDefault();if(!busy){offset=0;load();}};
 $('users-prev').onclick=()=>{if(!busy&&offset){offset-=50;load();}};$('users-next').onclick=()=>{if(!busy){offset+=50;load();}};
 return {load};
}
if(typeof document!=='undefined'&&document.getElementById('users-list'))mountAdmin().load();
