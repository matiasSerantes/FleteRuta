# FleteRuta

Prototipo web para organizar repartos de hasta 30 entregas en Argentina. Versión TEST 0.3, con acceso privado y ubicación actual como salida.

Publicado en [FleteRuta](https://fleteruta.matilegen.workers.dev/) con Cloudflare Workers + Supabase compartido con HidroTrack: cuentas autorizadas por separado, datos propios y guardado/recuperación manual del reparto. Ver [configuración y estado](docs/INTEGRACION_SUPABASE.md). El login Supabase usa correo y contraseña de la cuenta autorizada; la prueba local original mantiene su login independiente.

## Iniciar localmente

Requiere Node.js 22 o superior. En Windows se puede ejecutar `iniciar-prueba.cmd`.

```sh
npm start
```

Abrir http://localhost:5173. La primera vez, la terminal muestra un enlace privado de configuración de un solo uso para crear usuario y contraseña. No hay registro público. Al reiniciar el servidor se cierran las sesiones; se conserva la cuenta.

Este servidor de prueba escucha únicamente en esta PC. No usar un servidor estático: omitiría la protección de acceso. Para Cloudflare usar `npm run dev:cloud` o `npm run deploy`, que ejecutan el Worker con autenticación Supabase. La prueba en celulares reales sigue pendiente.

## Funciones implementadas

- Hasta 30 direcciones, con búsqueda explícita y confirmación del resultado.
- Búsqueda limitada a Argentina y, por defecto, hasta 100 km del GPS. Sin GPS usa CABA como centro. Opción para ampliar a toda Argentina.
- Tabla debajo del mapa y marcadores con numeración sincronizada.
- Orden automático aproximado por cercanía, ajustado con distancias por calles de OSRM.
- Botones Subir/Bajar y modo manual persistido, con regreso explícito al orden automático.
- Edición, destinatario, notas y marcado de entregas realizadas.
- Navegación a una entrega en Maps/Waze o envío a Google Maps por bloques compatibles.
- Seguimiento de llegada: cercanía de 100 m, precisión de hasta 60 m y permanencia de al menos 8 segundos. La entrega se completa solo al confirmar.
- Confirmación para abrir el próximo destino en la app elegida, manteniendo la secuencia.
- Avisos dentro de la app y notificaciones del sistema opcionales, según soporte y permisos.

## Datos y acceso

La cuenta se guarda como hash con sal en `.private/auth.json`; esa carpeta está excluida de Git y el servidor no la publica. Las sesiones usan cookies HttpOnly y vencen a las 8 horas. Hay límite de intentos de acceso.

En la prueba local, las direcciones y el progreso se guardan en localStorage. En Cloudflare se mantiene una copia local por cuenta y se puede guardar/recuperar el reparto activo en Supabase, sin sincronización automática. Las búsquedas y coordenadas se envían a los servicios de mapas correspondientes; evitar datos sensibles durante las pruebas.

## Límites conocidos

La web puede suspender el GPS al abrir Maps/Waze o bloquear el celular. Para esta prueba hay que volver a FleteRuta al llegar. Para avisos fiables en segundo plano se necesita una aplicación móvil con los permisos de ubicación correspondientes. El service worker solo maneja notificaciones: no aporta GPS en segundo plano ni funcionamiento offline.

Los servicios públicos de Nominatim, OpenStreetMap y OSRM se usan para pruebas puntuales, sin garantía de disponibilidad. La ruta es aproximada: no garantiza el mínimo global, tráfico en vivo, restricciones para camiones ni tiempos de descarga. Los enlaces externos abren el siguiente trayecto; no modifican una sesión de navegación que ya está abierta.

Despliegue HTTPS verificado. Pendiente: ingreso real con la cuenta del usuario, prueba en celular, elección de servicios de producción, historial de repartos y manejo ampliado de entregas fallidas.

## Verificación

```sh
npm ci
npm test
```

35 pruebas automáticas de lógica, autenticación, permisos PostgreSQL, Worker y flujos de interfaz con Happy DOM y Leaflet. GPS, notificaciones y servicios externos se simulan en las pruebas de interfaz; no reemplazan una prueba real en celular.

El código de la app usa HTML, CSS y JavaScript, sin compilación ni dependencias de servidor externas. Leaflet 1.9.4 se incluye en `vendor/leaflet` con su licencia. Happy DOM se utiliza solo para desarrollo.

Consultar [INICIAR.md](INICIAR.md), [VERIFICACION.md](VERIFICACION.md) y el [tablero de avance](estado-proyecto.html).
