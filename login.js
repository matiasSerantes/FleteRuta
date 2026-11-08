const $=id=>document.getElementById(id),returnParams=new URLSearchParams(location.hash.slice(1)),token=returnParams.get('setup');
const emailConfirmed=returnParams.get('type')==='signup'&&!!returnParams.get('access_token'),confirmationError=returnParams.has('error');
history.replaceState(null,'','/login');
let state={},setup=false,mfa=false,signup=false,submitting=false,feedbackField=null;
function feedback(text,kind='error',field=null){
 const message=$('login-message');message.textContent=text;message.dataset.kind=kind;message.setAttribute('role',kind==='error'?'alert':'status');
 feedbackField=field;if(field)field.setAttribute('aria-invalid','true');
 $('feedback-title').textContent=kind==='success'?'Revisá tu correo':signup?'No se pudo crear la cuenta':'Revisá estos datos';$('feedback-text').textContent=text;
 if(typeof $('auth-feedback').showModal==='function'){if(!$('auth-feedback').open)$('auth-feedback').showModal();$('feedback-close').focus();}else{message.focus();message.scrollIntoView?.({block:'center'});}
}
$('feedback-close').onclick=()=>$('auth-feedback').close();
$('auth-feedback').addEventListener('close',()=>{if(feedbackField)feedbackField.focus();else $('login-message').focus();});
function validate(){
 if(mfa)return /^\d{6}$/.test($('mfa-code').value.trim())?null:['Ingresá el código de 6 números de tu autenticador.',$('mfa-code')];
 if(signup&&$('full-name').value.trim().length<2)return ['Escribí tu nombre y apellido.',$('full-name')];
 const username=$('username').value.trim();
 if(state.backend==='supabase'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)||username.length>254))return ['Escribí un correo válido. Por ejemplo: nombre@gmail.com.',$('username')];
 if(state.backend!=='supabase'&&!/^[a-zA-Z0-9_.-]{3,40}$/.test(username))return ['Escribí tu usuario de 3 a 40 caracteres, sin espacios.',$('username')];
 const password=$('password').value;
 if(!password)return ['Escribí tu contraseña.',$('password')];
 if((signup||setup)&&password.length<12)return [`La contraseña tiene ${password.length} caracteres. Necesita al menos 12. Usá la misma en los dos casilleros.`,$('password')];
 if(password.length>128)return ['La contraseña no puede tener más de 128 caracteres.',$('password')];
 if((signup||setup)&&!$('confirm-password').value)return ['Volvé a escribir la contraseña en Repetir contraseña.',$('confirm-password')];
 if((signup||setup)&&password!==$('confirm-password').value)return ['Las contraseñas no coinciden. Escribí la misma en los dos casilleros.',$('confirm-password')];
 return null;
}
function showSignup(value){
 signup=value;$('signup-name-wrap').hidden=!value;$('full-name').required=value;$('confirm-wrap').hidden=!value;$('confirm-password').required=value;$('password-help').hidden=!value;
 $('password').minLength=value?12:0;$('password').autocomplete=value?'new-password':'current-password';$('login-title').textContent=value?'Crear cuenta':'Iniciar sesión';
 $('login-description').textContent=value?'Registrate con tu correo. Después de confirmarlo, el administrador deberá habilitarte para FleteRuta.':'Ingresá con tu cuenta habilitada para FleteRuta.';
 $('submit-login').textContent=value?'Crear cuenta':'Ingresar';$('toggle-signup').textContent=value?'Ya tengo cuenta · Ingresar':'Crear cuenta';$('login-message').textContent='';$('password').value='';$('confirm-password').value='';
}
function showMFA(){mfa=true;$('login-title').textContent='Verificá tu cuenta';$('login-description').textContent='Ingresá el código de tu autenticador, igual que en HidroTrack.';$('mfa-wrap').hidden=false;$('mfa-code').required=true;$('username').required=false;$('password').required=false;$('username').disabled=true;$('password').disabled=true;$('password').value='';$('submit-login').textContent='Verificar e ingresar';$('mfa-code').focus();}
try{
 const response=await fetch('/auth/status',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('No se pudo comprobar el servicio de acceso. Recargá para reintentar.');state=await response.json();setup=!state.configured&&!!token;
 if(state.authenticated){if(state.mfaRequired)showMFA();else location.replace(state.backend==='supabase'?'/apps':'/');}
 if(state.backend==='supabase'){
  setup=false;$('username').type='email';$('username').removeAttribute('pattern');$('username').removeAttribute('minlength');$('username').maxLength=254;document.querySelector('label[for="username"]').textContent='Correo electrónico';
  if(!mfa)$('login-description').textContent='Ingresá con tu correo y contraseña de FleteRuta.';
  $('toggle-signup').hidden=mfa;$('toggle-signup').onclick=()=>showSignup(!signup);
  document.querySelector('.login-panel>p:last-child').textContent='Crear una cuenta no habilita las aplicaciones. El administrador asigna los accesos.';
  if(!state.authenticated&&emailConfirmed)$('login-message').textContent='Correo confirmado. Ingresá con tu correo y contraseña. Si tu acceso está pendiente, avisale al administrador para que te habilite Solo FleteRuta.';
  if(!state.authenticated&&confirmationError)$('login-message').textContent='No se pudo confirmar el correo. El enlace puede haber vencido o ya haberse usado. Si ya confirmaste tu cuenta, intentá ingresar con tu correo y contraseña.';
 }
 if(!state.configured){if(setup){$('login-title').textContent='Crear tu usuario privado';$('login-description').textContent='Elegí una contraseña de al menos 12 caracteres. Este enlace sirve una sola vez.';$('password').minLength=12;$('password').autocomplete='new-password';$('password-help').hidden=false;$('confirm-wrap').hidden=false;$('confirm-password').required=true;$('submit-login').textContent='Crear usuario e ingresar';}else{$('login-description').textContent='Primera configuración: abrí el enlace privado de la ventana del servidor.';$('submit-login').disabled=true;}}
 if(state.configured||setup)$('submit-login').disabled=false;
}catch(error){$('login-message').textContent=error.name==='TimeoutError'?'La conexión tardó demasiado. Revisá Internet y recargá la página.':error.message;$('submit-login').disabled=true;}
$('login-form').onsubmit=async event=>{
 event.preventDefault();if(submitting)return;$('login-message').textContent='';document.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 const invalid=validate();if(invalid){feedback(invalid[0],'error',invalid[1]);return;}
 submitting=true;const originalLabel=$('submit-login').textContent,wasSignup=signup;$('submit-login').disabled=true;$('toggle-signup').disabled=true;$('login-form').setAttribute('aria-busy','true');$('submit-login').textContent=signup?'Creando cuenta…':'Ingresando…';$('login-message').textContent=signup?'Estamos enviando tu solicitud. Esperá un momento.':'Comprobando tus datos…';$('login-message').dataset.kind='pending';
 try{
  const r=await fetch(mfa?'/auth/mfa':signup?'/auth/signup':setup?'/auth/setup':'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify(mfa?{code:$('mfa-code').value.trim()}:signup?{fullName:$('full-name').value.trim(),email:$('username').value.trim(),password:$('password').value}:{username:$('username').value.trim(),password:$('password').value,...(setup?{token}:{})})});
  let data;try{data=await r.json();}catch{throw Error('El servidor no respondió correctamente. Esperá un momento y volvé a intentar.');}if(!r.ok)throw Error(data.error||'No se pudo completar la solicitud. Volvé a intentar.');if(signup){showSignup(false);feedback('Solicitud recibida. Revisá tu correo, también en spam, y confirmá el enlace de FleteRuta. Después avisale al administrador para que te habilite Solo FleteRuta. Si ya tenías cuenta, ingresá con la existente.','success');return;}if(data.mfaRequired){showMFA();$('toggle-signup').hidden=true;return;}location.replace(data.redirectTo==='/apps'||data.redirectTo==='https://hidrotrack.matilegen.workers.dev/'?data.redirectTo:'/');
 }catch(error){feedback(error.name==='TimeoutError'||error.name==='AbortError'?'La conexión tardó demasiado. Revisá Internet y volvé a intentar.':error instanceof TypeError?'No pudimos conectar. Revisá Internet y volvé a intentar.':error.message||'No se pudo completar la solicitud. Volvé a intentar.');if(!wasSignup)$('password').value='';$('mfa-code').value='';}finally{submitting=false;$('login-form').removeAttribute('aria-busy');$('submit-login').disabled=false;$('toggle-signup').disabled=false;if($('submit-login').textContent.endsWith('…'))$('submit-login').textContent=originalLabel;}
};
