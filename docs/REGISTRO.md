# Registro para probar FleteRuta

En el login de Cloudflare hay un botón Crear cuenta. Solicita nombre, correo, contraseña de al menos 12 caracteres y su confirmación.

Se registra una cuenta en Supabase Auth. La configuración compartida ya permite registro y exige confirmación de correo; no se cambiaron estas opciones ni se desactivó la confirmación. Se solicita volver a `/login` como destino del correo; Supabase solo acepta esa redirección si está en su lista permitida. Si abre el portal configurado para la cuenta compartida, la persona debe volver al enlace de FleteRuta después de confirmar. No se cambió el Site URL de HidroTrack.

Después, el administrador busca el correo en Usuarios y accesos y selecciona Solo FleteRuta. Una cuenta sin esa habilitación no entra al reparto ni a sus datos. El registro no escribe membresías, empresas ni licencias, no otorga roles y no inicia una sesión de FleteRuta. Si Supabase devuelve una sesión automática, se revoca esa sesión y no se envía al navegador.

El trigger existente de Supabase crea el perfil común con el nombre. Eso no asigna acceso de HidroTrack. La marca informativa `signup_app` no se utiliza para autorización. Las cuentas existentes deben usar su contraseña actual; registrarse otra vez no cambia su contraseña.

El envío y los límites de correo corresponden a la configuración de Supabase. Se verificó el flujo con respuestas simuladas, sin crear usuarios reales ni enviar correos de prueba. La entrega del correo y el registro real de la persona invitada quedan pendientes de esa prueba.

49 pruebas automáticas aprobadas, incluidas validación, contraseñas distintas, registro sin cookies ni permisos, límites de correo, bloqueo de otro origen y conservación del login con MFA.
