const $=id=>document.getElementById(id),token=new URLSearchParams(location.hash.slice(1)).get('setup');
history.replaceState(null,'','/login');
let state={},setup=false,mfa=false;
function showMFA(){mfa=true;$('login-title').textContent='Verificá tu cuenta';$('login-description').textContent='Ingresá el código de tu autenticador, igual que en HidroTrack.';$('mfa-wrap').hidden=false;$('mfa-code').required=true;$('username').required=false;$('password').required=false;$('username').disabled=true;$('password').disabled=true;$('password').value='';$('submit-login').textContent='Verificar e ingresar';$('mfa-code').focus();}
try{
 const response=await fetch('/auth/status');if(!response.ok)throw Error('No se pudo comprobar el servicio de acceso. Recargá para reintentar.');state=await response.json();setup=!state.configured&&!!token;
 if(state.authenticated){if(state.mfaRequired)showMFA();else location.replace('/');}
 if(state.backend==='supabase'){
  setup=false;$('username').type='email';$('username').removeAttribute('pattern');$('username').removeAttribute('minlength');$('username').maxLength=254;document.querySelector('label[for="username"]').textContent='Correo electrónico';
  if(!mfa)$('login-description').textContent='Ingresá con tu cuenta de Supabase habilitada para FleteRuta.';
  document.querySelector('.login-panel>p:last-child').textContent='Acceso autorizado, sin registro público. Cada aplicación conserva sus permisos.';
 }
 if(!state.configured){if(setup){$('login-title').textContent='Crear tu usuario privado';$('login-description').textContent='Elegí una contraseña de al menos 12 caracteres. Este enlace sirve una sola vez.';$('password').minLength=12;$('password').autocomplete='new-password';$('confirm-wrap').hidden=false;$('confirm-password').required=true;$('submit-login').textContent='Crear usuario e ingresar';}else{$('login-description').textContent='Primera configuración: abrí el enlace privado de la ventana del servidor.';$('submit-login').disabled=true;}}
}catch(error){$('login-message').textContent=error.message;$('submit-login').disabled=true;}
$('login-form').onsubmit=async event=>{
 event.preventDefault();$('login-message').textContent='';if(setup&&$('password').value!==$('confirm-password').value){$('login-message').textContent='Las contraseñas no coinciden.';return;}$('submit-login').disabled=true;
 try{
  const r=await fetch(mfa?'/auth/mfa':setup?'/auth/setup':'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mfa?{code:$('mfa-code').value.trim()}:{username:$('username').value,password:$('password').value,...(setup?{token}:{})})});
  const data=await r.json();if(!r.ok)throw Error(data.error);if(data.mfaRequired){showMFA();return;}location.replace('/');
 }catch(error){$('login-message').textContent=error.message||'No se pudo conectar con el servidor.';$('password').value='';$('confirm-password').value='';$('mfa-code').value='';}finally{$('submit-login').disabled=false;}
};
