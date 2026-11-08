const $=id=>document.getElementById(id);
try{
 const response=await fetch('/auth/apps',{signal:AbortSignal.timeout(15000)});
 if(response.status===401){location.replace('/login');}else{
  const apps=await response.json();if(!response.ok)throw Error(apps.error||'No se pudieron revisar los accesos.');
  $('open-fleteruta').hidden=!apps.fleteruta;$('open-hidrotrack').hidden=!apps.hidrotrack;
  if(apps.fleteruta&&!apps.hidrotrack)location.replace('/');
  else if(apps.hidrotrack&&!apps.fleteruta)location.replace('https://hidrotrack.matilegen.workers.dev/');
  $('apps-status').textContent=apps.fleteruta||apps.hidrotrack?'Elegí la aplicación que querés usar.':'Tu cuenta todavía no tiene una aplicación habilitada. Avisale al administrador.';
 }
}catch(error){$('apps-status').textContent=error.name==='TimeoutError'?'La conexión tardó demasiado. Recargá para intentar de nuevo.':error.message||'No se pudo conectar. Recargá para intentar de nuevo.';}
