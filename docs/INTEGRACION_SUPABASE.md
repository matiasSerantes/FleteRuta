# Supabase y Cloudflare · 5 de noviembre de 2026

## Estado

La migración `fleteruta_foundation` está aplicada en el mismo proyecto Supabase de HidroTrack. Se agregaron exclusivamente objetos con prefijo `fleteruta_`; no se modificaron sus tablas, usuarios, políticas ni triggers.

Publicado y comprobado en https://fleteruta.matilegen.workers.dev/ el 5 de noviembre de 2026. Primer despliegue verificado: `f3b73fb1-733c-47c5-8681-b6e2ca3ceac6`. La autorización local de Cloudflare fue renovada mediante su flujo oficial de dispositivo.

- `fleteruta_members`: cuentas autorizadas. Se habilitó inicialmente al administrador ya registrado en `platform_admins`. Los clientes no pueden autorizarse ni editar membresías.
- `fleteruta_routes`: un reparto activo guardado por cuenta, con hasta 30 paradas, estados, orden y opciones de recorrido.
- `fleteruta_save_route`: guardado con control de revisión para evitar pisar cambios de otro dispositivo. Usa los permisos del usuario, sin `SECURITY DEFINER`.

Las políticas RLS exigen propiedad y membresía activa. El Worker usa la clave publicable y el JWT de la persona; no usa `service_role`. La URL del proyecto y la clave publicable en `wrangler.jsonc` son identificadores para acceso sujeto a RLS, no credenciales administrativas.

## Login y datos

En Cloudflare se ingresa con correo y contraseña de la cuenta Supabase autorizada. No hay registro público ni creación de usuarios de HidroTrack. La contraseña local de TEST 0.3 no se copia a Supabase. Inicialmente, solo la cuenta de administración de HidroTrack tiene acceso a FleteRuta.

Los tokens viajan en cookies HttpOnly, SameSite=Strict y Secure en HTTPS. Se renueva el token cuando vence. El logout solicita revocar solamente la sesión actual, sin cerrar las otras sesiones de HidroTrack. Las rutas privadas y la API comprueban cuenta y membresía.

La copia local se separa por ID de cuenta. Cada cambio de entregas, orden o estado guarda el avance automáticamente. Primero persiste localmente, después envía a Supabase con control de revisión. Los cambios que ocurren durante una subida se envían en el siguiente guardado, en orden. Al volver a abrir se comprueba la nube; si existen cambios locales pendientes se conserva esa copia y se reintenta, sin pisarla silenciosamente. Los conflictos entre dispositivos requieren recuperación explícita. El estado de la pantalla distingue guardado en nube y pendiente. Guardar en nube sirve para reintentar; Recuperar guardado permite reemplazar la copia local con confirmación. No hay historial de varios repartos ni edición simultánea colaborativa.

Al reabrir, se consulta GPS nuevo y se retoma la detección de la próxima entrega pendiente si hay permiso. Se conserva la confirmación humana antes de marcar la entrega. Cerrar la página detiene el GPS; no hay seguimiento mientras el navegador está cerrado. Si se borra el almacenamiento local antes de sincronizar un cambio sin conexión, ese cambio no puede recuperarse: verificar Guardado en nube antes de cambiar de dispositivo.

## Publicación

El Worker `fleteruta` está definido en `wrangler.jsonc`. Su build copia únicamente interfaz y Leaflet a `dist/`. No publica `.private`, variables privadas, tests, el servidor local ni esta documentación.

```sh
npm ci
npm test
npm run deploy
```

Wrangler ejecuta el build antes del despliegue. La integración Git de Cloudflare puede ejecutar `npx wrangler deploy` en cada push a main. Para desplegar desde esta PC hay que mantener vigente la sesión de Cloudflare. Este repositorio solo contiene la migración de FleteRuta, no el historial completo del proyecto compartido: no ejecutar un `supabase db push` masivo desde aquí contra la base de HidroTrack.

Para probar el Worker local con Supabase real:

```sh
npm run dev:cloud
```

`npm start` conserva la prueba local original con cuenta en `.private`; no equivale al Worker ni al login Supabase.

## Verificación realizada

- Migración probada con PostgreSQL local (PGlite): aislamiento entre dos cuentas, rechazo de otra sin membresía, revocación, datos inválidos, exceso de paradas y revisiones en conflicto.
- Pruebas remotas de RLS con cambios revertidos mediante rollback. Una membresía inicial; cero repartos persistidos por estas pruebas.
- Asesores de seguridad: sin hallazgos asociados a objetos `fleteruta_`. Los avisos existentes de HidroTrack quedaron fuera de esta intervención y no se modificaron sus funciones.
- Pruebas del Worker: acceso anónimo, cuenta no autorizada, cookies privadas, CSRF, renovación, logout local, validación y conflicto de guardado.
- Prueba local del runtime de Cloudflare: status 200 con backend Supabase, raíz 303 hacia login, módulos con MIME JavaScript y secretos 404.
- Prueba de la web pública: `/auth/status` responde 200 con backend Supabase; `/` devuelve 303 a `/login`; `/login` responde 200; `/api/route` sin sesión devuelve 401; módulos con MIME JavaScript; `.private/auth.json`, `server.mjs` y `wrangler.jsonc` devuelven 404. Solicitud de login desde otro origen devuelve 403.
- Sin prueba de ingreso con una contraseña real del usuario ni prueba de GPS en celular. Esas validaciones siguen pendientes.

El seguimiento de llegada mantiene la limitación de GPS en segundo plano del navegador. Esta integración no incorpora seguimiento nativo.
