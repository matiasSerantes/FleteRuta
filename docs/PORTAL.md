# Aplicaciones según la licencia

Entrada: https://fleteruta.matilegen.workers.dev/login

Después de ingresar y completar MFA si corresponde, FleteRuta consulta los accesos de la cuenta. Con una sola app habilitada, la abre directamente. Con ambas, muestra Mis aplicaciones para elegir. También hay un enlace desde Mi cuenta.

FleteRuta usa su habilitación independiente, sin fecha de vencimiento en el modelo actual. Habilitada equivale a acceso permanente mientras el administrador no la pause; no crea una licencia ni una empresa de HidroTrack. Las altas concretas solicitadas por el titular se verifican directamente en la base y quedan registradas en el historial de accesos, sin guardar datos personales en el repositorio.

HidroTrack se ofrece si la persona es administradora de plataforma o tiene una membresía activa en una empresa con licencia activa, permanente o mensual no vencida. La aplicación de destino sigue comprobando sus permisos propios. El portal no cambia licencias, membresías ni cupos de HidroTrack.

Cada aplicación mantiene su propia sesión. Para una cuenta que solo tiene HidroTrack, el ingreso en FleteRuta devuelve una redirección fija hacia HidroTrack y revoca la sesión temporal, sin conceder acceso a repartos de FleteRuta. HidroTrack puede pedir ingresar de nuevo. No se pasan tokens por la URL ni se aceptan destinos de redirección suministrados por el usuario.

Migración: `20261109010000_fleteruta_portal.sql`. RPC pública SECURITY INVOKER y helper privado SECURITY DEFINER con search_path vacío. Consulta solo auth.uid(), sin parámetros de identidad ni autorización por metadatos editables, y exige MFA si está configurado. Anon no tiene permiso de ejecución. La configuración de redirección de correo conserva la entrada de cada aplicación.

60 pruebas automáticas aprobadas. Cubren vigencia, suspensión, aislamiento por usuario, MFA, restricción anónima, cuenta solo HidroTrack sin cookies de FleteRuta y pantalla intermedia. Chrome a 360 px: selector con ambos accesos simulados, botones grandes y sin desbordes. La apertura de HidroTrack y el ingreso real con una persona invitada no se simulan como pruebas completadas.
