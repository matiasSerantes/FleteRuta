# FleteRuta · versión de prueba 0.3

## Ejecutar en esta PC

Hacer doble clic en `iniciar-prueba.cmd`. Mantener la ventana del servidor abierta y entrar a http://localhost:5173. Para detenerlo, presionar Ctrl+C en esa ventana.

También se puede iniciar desde PowerShell en esta carpeta:

```powershell
node server.mjs
```

No usar el servidor estático de Python: omite la protección de acceso. No abrir `index.html` mediante file://. Leaflet está dentro del proyecto; buscar direcciones, cargar imágenes del mapa y calcular rutas requieren Internet.

La primera vez, la ventana del servidor muestra un enlace privado de configuración de un solo uso. Abrirlo y elegir usuario y contraseña (mínimo 12 caracteres). Después se ingresa por `/login`; no hay registro público. Las claves se guardan como hash en `.private/auth.json`, que el servidor no permite descargar. La sesión vence a las 8 horas o al reiniciar el servidor. No publicar esta carpeta con un servidor estático ni exponer el servidor local directamente a Internet.

## Probar desde el celular

El punto de partida se obtiene del GPS del dispositivo que abre la app. Se pide permiso al entrar. Esa salida se usa para ordenar automáticamente al cargar cada dirección; el botón Actualizar desde mi ubicación obtiene una posición fresca si el fletero se movió. No se guarda la salida entre sesiones.

Para usar GPS en un celular hay que alojar esta carpeta en HTTPS o ejecutar el servidor directamente en el propio celular y abrir su localhost. La dirección HTTP de la PC dentro de la red no habilita normalmente geolocalización. Esta entrega es local: todavía no hay URL HTTPS publicada. El servidor incluido escucha solo en esta PC.

## Flujo para probar

1. Permitir ubicación. Si falla, activar GPS y revisar los permisos del sitio.
2. Buscar una dirección. Por defecto se limita a Argentina y hasta 100 km de la ubicación actual; si falta GPS, usa CABA como centro. Los resultados se ordenan por cercanía y muestran la distancia. Para otro destino del país, elegir Toda Argentina. Nunca se amplía la búsqueda a otro país. Confirmar un resultado y revisar el marcador.
3. Agregar más entregas (máximo 30). Destinatario y notas son opcionales.
4. Cada dirección confirmada aparece en la primera columna de la tabla debajo del mapa, junto a su número. Se ordena automáticamente por cercanía y luego se ajusta con distancias por calles. La numeración del mapa cambia con la tabla.
5. Elegir si se vuelve al origen: recalcula automáticamente. Revisar tabla, mapa, kilómetros y tiempo aproximado. Pulsar una dirección centra su marcador; pulsar un marcador resalta su fila.
6. Abrir Maps por bloques, o Maps/Waze a una entrega. Cada bloque admite hasta 4 destinos (3 intermedios y un destino final).
7. Marcar una entrega realizada: pasa al final de la tabla y se recalculan las pendientes. Si cambió el lugar de salida, pulsar Actualizar desde mi ubicación.
8. Recargar para verificar la recuperación de las entregas y su estado.

Para cambiar el orden a mano, usar ↑ Subir y ↓ Bajar en las acciones de cada parada pendiente. La tabla, los números del mapa y los enlaces de navegación respetan ese orden. Se recalcula el trazado sin optimizar la secuencia. El modo manual se guarda al recargar; las nuevas entregas se agregan al final de las pendientes. Para recuperar la optimización, pulsar Volver al orden automático. Las entregadas quedan al final y no se mueven con estos botones.

## Seguimiento de llegada y próxima entrega

1. Preparar las paradas y elegir Google Maps o Waze en Entrega por entrega.
2. Pulsar Iniciar seguimiento. Se conserva el orden actual para avanzar sin reoptimizar la secuencia.
3. Activar notificaciones si el navegador lo permite. Si se deniega el permiso o no hay soporte, permanece el aviso dentro de la app.
4. Cerca de la próxima entrega (100 m, precisión GPS de hasta 60 m, sin desplazamiento rápido y al menos 8 segundos cerca), aparece la pregunta para continuar. El GPS se comprueba también cada 5 segundos mientras la página está visible, para poder detectar permanencia sin movimiento.
5. Todavía no conserva la entrega pendiente y pospone el aviso un minuto. Sí marca únicamente la entrega actual como realizada y abre el próximo destino mediante un enlace a la app elegida.
6. En la última entrega, se finaliza el reparto y se detiene el GPS. Si está seleccionado volver al inicio, se abre el punto de salida del seguimiento.

La notificación del sistema abre FleteRuta para confirmar; no da por realizada una entrega por sí sola. No agrega destinos a una sesión de navegación existente: abre el siguiente trayecto en la otra aplicación. El navegador o el sistema pueden impedir o suspender el GPS en segundo plano. En esta prueba hay que volver a FleteRuta al llegar; para avisos fiables mientras Maps/Waze están en primer plano se necesita una aplicación móvil con ubicación en segundo plano y sus permisos. Una notificación push o un service worker por sí solos no resuelven esa limitación. El GPS se detiene al cerrar la página. Al volver se recupera el reparto y se consulta una ubicación nueva para reanudar el seguimiento si hay entregas pendientes y permiso de GPS.

## Otros límites de esta prueba

- Usa Nominatim mediante búsqueda explícita, sin autocompletado; resultados cacheados y solicitudes espaciadas. No cargar datos sensibles durante la prueba.
- Usa distancias de la matriz pública OSRM; vecino más cercano con múltiples inicios y mejoras 2-opt, evaluando arcos dirigidos completos. La matriz corresponde a distancias de rutas del perfil del servidor; no garantiza caminos de menor distancia absoluta.
- Servicios públicos para pruebas puntuales, sin garantía de disponibilidad. Para producción habrá que elegir proveedor y revisar condiciones/costos.
- Incluye una cuenta privada local. Sin tráfico, ventanas horarias, múltiples cuentas, sincronización, restricciones de camiones ni navegación propia por voz.
- Sin PWA instalable ni modo offline todavía. No se asegura recuperación si el usuario borra los datos del navegador.
- Las consultas de dirección van a Nominatim, las coordenadas de ruta a OSRM y los destinos al navegador externo elegido. Las teselas de mapa se sirven desde OpenStreetMap.
- Mientras consulta calles, muestra un orden provisional por cercanía. Si falla el servicio lo informa; no presenta una línea recta como recorrido real. Cambiar las entregas cancela las consultas viejas.

## Verificación automática

```powershell
npm install
npm test
node --check app.js
```

La prueba real de GPS y apertura de las apps debe realizarse en el celular con HTTPS.
