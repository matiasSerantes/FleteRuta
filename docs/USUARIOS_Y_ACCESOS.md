# Usuarios y accesos · FleteRuta

El administrador de plataforma ya registrado tiene acceso al panel `/admin`, desde el enlace Usuarios y accesos en el encabezado del reparto. Es una función de la versión Cloudflare; la prueba local original no incluye administración Supabase.

La cuenta usa el mismo correo y contraseña de Supabase. Si tiene un autenticador TOTP activado, FleteRuta solicita su código antes de entrar. Se respeta el requisito MFA de HidroTrack mediante `private.is_admin()`; no se agregan administradores ni se modifican factores MFA.

## Qué permite

- Buscar cuentas existentes por nombre o correo, en páginas de 50.
- Ver si tienen acceso asignado a HidroTrack, FleteRuta, ambas aplicaciones o ninguna.
- Activar o pausar FleteRuta de manera independiente.
- Activar o pausar el acceso de choferes ya asignados en HidroTrack, invocando su función `admin_set_driver_access`. Conserva licencias, cupos, protección de titulares y auditoría existentes.
- Registrar los cambios en `fleteruta_access_events`. Activación o pausa no elimina repartos ni cuentas.

HidroTrack se considera asignado cuando existe una membresía activa o el usuario es administrador de plataforma. Este estado no reemplaza la validación de la licencia durante el uso de HidroTrack.

## Protecciones y límites

- El administrador no puede quedarse sin acceso. El panel no puede quitar acceso de HidroTrack a titulares ni administradores.
- Para habilitar HidroTrack desde aquí, un chofer inactivo debe tener exactamente una empresa ya asignada. Si no tiene empresa, tiene varias o es titular, se gestiona desde HidroTrack. No se crean empresas, licencias ni usuarios de Auth.
- Al desactivar HidroTrack de un chofer con varias membresías activas, se pausan sus membresías de chofer existentes. Los titulares están protegidos.
- Los cambios de ambas aplicaciones son atómicos: si falla una licencia o un cupo, no se aplica parcialmente el cambio de FleteRuta.
- No se listan contraseñas, tokens ni datos de repartos en el panel.
- Las funciones privilegiadas nuevas están en el esquema privado, con comprobación de administrador y MFA. Las funciones públicas son wrappers `SECURITY INVOKER` y no admiten acceso anónimo.
- La API de Cloudflare también verifica administrador y MFA; ocultar el enlace no es la protección de acceso.

Migración: `20261106003901_fleteruta_admin_access.sql`. Agrega únicamente funciones del panel y su historial. Reutiliza los controles de HidroTrack sin cambiar sus funciones ni su código.

## Verificación

40 pruebas automáticas aprobadas. Incluyen PostgreSQL local, permisos de directorio y cambios, rechazo de MFA incompleto, aislamiento de usuario común, protección de administrador/titular, conflicto de licencia sin cambios parciales, panel de interfaz y envío del código TOTP sin exponerlo en respuestas.

En la base real se probaron directorio, MFA y protección contra bloqueo propio dentro de una transacción revertida. No se cambiaron accesos de personas reales para validar el panel. El ingreso real y la revisión visual con la cuenta administradora siguen a cargo del usuario.
