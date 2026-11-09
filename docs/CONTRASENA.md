# Restablecer contraseña desde Mi cuenta

En la web de Cloudflare, Mi cuenta → Restablecer contraseña permite elegir una nueva clave y repetirla. Requiere sesión habilitada de FleteRuta y completar MFA si está configurado. La contraseña tiene de 12 a 128 caracteres. No pide conocer la anterior cuando la sesión y la política de Supabase permiten el cambio.

La clave pertenece a la cuenta compartida de Supabase: si la persona usa también HidroTrack con ese mismo correo, la nueva contraseña sirve para ambas apps. El formulario lo informa antes de guardar. No modifica licencias ni repartos.

El Worker recibe solo contraseña y confirmación; envía únicamente password a Auth /user con el token de la sesión verificada. Nunca acepta un usuario destino, correo o permisos desde el formulario. No envía claves en URLs ni las guarda en localStorage. Respeta rechazo, contraseña débil, clave repetida, límites y reautenticación de Supabase; una respuesta sin la identidad esperada no se presenta como éxito.

Si falta sesión, primero debe ingresar. Esta opción no implementa recuperación por correo desde el login. Si Supabase exige reautenticación, la pantalla pide volver a ingresar. Una respuesta perdida no se anuncia como éxito: hay que comprobar la contraseña al ingresar antes de repetir la acción.

60 pruebas automáticas aprobadas, incluidas validación y confirmación, sesión/MFA/origen, usuario destino ignorado, secreto enviado solo a Auth, errores, campos vaciados y prevención de envíos duplicados. Revisión de Chrome con datos simulados; ninguna contraseña real modificada para QA.
