# Registro para probar FleteRuta

En el login de Cloudflare hay un botón Crear cuenta. Solicita nombre, correo, contraseña de al menos 12 caracteres y su confirmación.

Se registra una cuenta en Supabase Auth. La confirmación de correo permanece activa. El 8 de noviembre se agregó a la lista de redirecciones permitidas el destino exacto https://fleteruta.matilegen.workers.dev/login. Se conservaron el Site URL de HidroTrack y todos sus destinos anteriores. Se comprobó el regreso a /login con un token deliberadamente inválido, sin crear usuarios ni enviar correos. El login informa confirmación o error y limpia los tokens de la URL; no adopta la sesión ni concede permisos por el contenido del enlace.

Los correos anteriores pueden conservar el destino de HidroTrack. Si la persona ya confirmó el correo, debe volver directamente a FleteRuta e ingresar con la misma cuenta, sin registrarse de nuevo.

Después, el administrador busca el correo en Usuarios y accesos y selecciona Solo FleteRuta. Una cuenta sin esa habilitación no entra al reparto ni a sus datos. El registro no escribe membresías, empresas ni licencias, no otorga roles y no inicia una sesión de FleteRuta. Si Supabase devuelve una sesión automática, se revoca esa sesión y no se envía al navegador.

El trigger existente de Supabase crea el perfil común con el nombre. Eso no asigna acceso de HidroTrack. La marca informativa `signup_app` no se utiliza para autorización. Las cuentas existentes deben usar su contraseña actual; registrarse otra vez no cambia su contraseña.

El envío y los límites de correo corresponden a la configuración de Supabase. Se verificó el flujo con respuestas simuladas, sin crear usuarios reales ni enviar correos de prueba. La entrega del correo y el registro real de la persona invitada quedan pendientes de esa prueba.

55 pruebas automáticas aprobadas, incluidas validación, contraseñas distintas, registro sin cookies ni permisos, límites de correo, bloqueo de otro origen y conservación del login con MFA.

El formulario valida sus datos de forma explícita, sin depender de globos de validación del navegador. Muestra cartel modal y mensaje persistente para nombre o correo faltantes, clave corta, confirmación distinta, errores del servidor, falta de Internet y espera agotada. La clave requiere al menos 12 caracteres y ese requisito se ve antes de enviar. Durante el envío muestra Creando cuenta y evita envíos duplicados; al recibir respuesta satisfactoria muestra Revisá tu correo. No se interpreta la respuesta genérica como acceso concedido.

Chrome real a 360 px: se reprodujo requestSubmit con dos claves de 8 caracteres, sin enviar solicitudes; apareció el cartel con el motivo. Respuesta de registro simulada: apareció el cartel de correo. Capturas .private/signup-short-password.png y .private/signup-success.png. Sin altas reales ni correos enviados por esta comprobación.
