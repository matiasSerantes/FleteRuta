export function mountPasswordForm({enabled}){
 const $=id=>document.getElementById(id),panel=$('password-panel');panel.hidden=!enabled;if(!enabled)return;
 let submitting=false;
 const status=(text,kind='error')=>{const el=$('password-status');el.textContent=text;el.dataset.kind=kind;el.setAttribute('role',kind==='error'?'alert':'status');el.focus();};
 $('password-cancel').onclick=()=>{$('password-form').reset();$('password-status').textContent='';panel.open=false;};
 $('password-form').onsubmit=async event=>{
  event.preventDefault();if(submitting)return;
  const password=$('new-password').value,confirmation=$('repeat-password').value;
  if(password.length<12||password.length>128){status('Usá una nueva contraseña de 12 a 128 caracteres.');return;}
  if(password!==confirmation){status('Las contraseñas no coinciden. Escribí la misma en los dos casilleros.');return;}
  submitting=true;$('password-submit').disabled=true;$('password-cancel').disabled=true;$('password-submit').textContent='Guardando…';$('password-form').setAttribute('aria-busy','true');status('Guardando tu nueva contraseña…','pending');
  try{
   const response=await fetch('/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify({password,confirmation})});
   let data;try{data=await response.json();}catch{throw Error('No se recibió una respuesta válida. Volvé a ingresar para comprobar tu contraseña antes de reintentar.');}
   if(!response.ok)throw Error(data.error||'No se pudo cambiar la contraseña.');
   $('password-form').reset();status('Contraseña actualizada. En el próximo ingreso usá tu nueva contraseña.','success');
  }catch(error){$('password-form').reset();status(error.name==='TimeoutError'||error instanceof TypeError?'No recibimos la confirmación. Revisá Internet y comprobá tu contraseña al ingresar nuevamente.':error.message||'No pudimos confirmar el cambio. Volvé a ingresar.');}
  finally{submitting=false;$('password-submit').disabled=false;$('password-cancel').disabled=false;$('password-submit').textContent='Guardar nueva contraseña';$('password-form').removeAttribute('aria-busy');}
 };
}
