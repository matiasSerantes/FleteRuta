const $=id=>document.getElementById(id),token=new URLSearchParams(location.hash.slice(1)).get('setup');
history.replaceState(null,'','/login');
const state=await fetch('/auth/status').then(r=>r.json());let setup=!state.configured&&!!token;
if(state.authenticated)location.replace('/');
if(state.backend==='supabase'){
 setup=false;$('username').type='email';$('username').removeAttribute('pattern');$('username').removeAttribute('minlength');$('username').maxLength=254;
 document.querySelector('label[for="username"]').textContent='Correo electrónico';
 $('login-description').textContent='Ingresá con tu cuenta de Supabase habilitada para FleteRuta. Tu usuario local de prueba no se migra como contraseña.';
 document.querySelector('.login-panel>p:last-child').textContent='Acceso por autorización, sin registro público. Las cuentas de HidroTrack necesitan habilitación específica para FleteRuta.';
}
if(!state.configured){if(setup){$('login-title').textContent='Crear tu usuario privado';$('login-description').textContent='Elegí una contraseña de al menos 12 caracteres. Este enlace sirve una sola vez.';$('password').minLength=12;$('password').autocomplete='new-password';$('confirm-wrap').hidden=false;$('confirm-password').required=true;$('submit-login').textContent='Crear usuario e ingresar';}else{$('login-description').textContent='Primera configuración: abrí el enlace privado que aparece en la ventana donde iniciaste el servidor.';$('submit-login').disabled=true;}}
$('login-form').onsubmit=async event=>{event.preventDefault();$('login-message').textContent='';if(setup&&$('password').value!==$('confirm-password').value){$('login-message').textContent='Las contraseñas no coinciden.';return;}$('submit-login').disabled=true;try{const r=await fetch(setup?'/auth/setup':'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('username').value,password:$('password').value,...(setup?{token}:{})})});const data=await r.json();if(!r.ok)throw Error(data.error);location.replace('/');}catch(e){$('login-message').textContent=e.message||'No se pudo conectar con el servidor.';$('password').value='';$('confirm-password').value='';}finally{$('submit-login').disabled=false;}};
