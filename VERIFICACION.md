# Verificación · TEST 0.3

Fecha: 4 de noviembre de 2026.

## Comprobaciones de esta versión

- `npm test`: 55 pruebas aprobadas. Registro: `docs/REGISTRO.md`. Integración: `docs/INTEGRACION_SUPABASE.md`. Administración por aplicación, protección y MFA: `docs/USUARIOS_Y_ACCESOS.md`.
- Recuperación: guardado automático, reapertura con entregas realizadas, cambios sin conexión conservados, protección de avances de la versión manual y serialización de cambios durante un guardado en curso. El seguimiento puede reanudarse automáticamente con GPS fresco; el aviso de llegada sigue requiriendo precisión y permanencia.
- Seguimiento: permanencia cerca, precisión, antigüedad, velocidad, aviso único, posposición y cambio de destino, incluyendo dos entregas en el mismo lugar.
- Flujo del cuadro de llegada con DOM: notificación mediante service worker simulado, Todavía no sin completar, confirmación de una sola entrega, enlace con las siguientes pendientes compatibles, selección de Waze y finalización de la última entrega sin abrir un destino inexistente. Sin validación de notificaciones/GPS reales en un celular ni de navegación del sistema operativo.
- La prueba del formulario también verifica Subir/Bajar: límites deshabilitados, numeración sincronizada, navegación en la secuencia elegida, modo manual persistido, ausencia de reoptimización automática y regreso explícito al orden automático.
- Búsqueda: filtro Argentina, área acotada al GPS (100 km), fallback explícito a CABA sin GPS, distancias y orden por cercanía. Prueba del formulario descarta un resultado extranjero y otro de Córdoba al buscar desde Buenos Aires. La caché diferencia consulta, ubicación y alcance, evitando reutilizar las búsquedas globales anteriores.
- Prueba del formulario real con Happy DOM y la distribución real de Leaflet: tres direcciones agregadas una por una, filas ordenadas automáticamente, números de marcadores iguales a la tabla y recálculo al marcar una entrega realizada. Geolocalización y respuestas externas simuladas de manera determinista; no es revisión visual ni de cobertura real de mapas.
- Cola de cálculo: se cancelan respuestas anteriores, se agrupan cambios seguidos y no se restaura una entrega eliminada por una respuesta atrasada.
- Tabla colocada después del mapa, conservación de los datos guardados y entregadas al final.
- Login: creación mediante token único, hash de contraseña, cookie HttpOnly, bloqueo de recursos sin sesión, rechazo de registro posterior, logout y límite de intentos.
- Servidor activo comprobado: `/` redirige a `/login`; `/auth/status` responde HTTP 200.
- Pendiente: revisión visual en navegador, GPS real y permisos, flujo con servicios externos desde el navegador y apertura de Maps/Waze en celular por HTTPS.

## Comprobaciones previas de servicios

- `node --check app.js`: correcto.
- `node --test core.test.mjs`: 5 pruebas aprobadas (30 entregas, integridad de bloques, retorno, matriz inválida y una entrega).
- `GET http://localhost:5173`: HTTP 200.
- OSRM con tres puntos de ejemplo en CABA: matriz de distancias 3×3, HTTP 200, código Ok.
- OSRM con los mismos puntos: ruta GeoJSON disponible, HTTP 200, código Ok.
- La primera conexión externa fue bloqueada por el entorno restringido; la comprobación con acceso de red autorizado pasó.
- Navegador de automatización no disponible: sin validación visual ni de CORS en un navegador real.
- Pendiente: búsqueda Nominatim en navegador, GPS real y permisos, recuperación local, recorrido integrado de 30 entregas y apertura de Google Maps/Waze en celular por HTTPS.

El 75 % del tablero es una estimación ponderada de implementación, no un porcentaje de pruebas aprobadas. La app está preparada para una prueba manual, sin declaración de aptitud para producción.

## Revisión del 8 de noviembre

55 pruebas aprobadas. Lista de clientes y diseño móvil verificados también en Chrome real de escritorio con viewport de celular y login/GPS simulados. Ver docs/PRUEBA_MIERCOLES.md para evidencia y pendientes reales; las limitaciones anteriores de GPS y correo real siguen vigentes.

Navegación unificada: selector de app y un solo enlace de recorrido. Ver docs/NAVEGACION.md para límites y verificación.

Diseño simplificado para celular: docs/DISENO_CELULAR.md. Revisión Chrome a 360 y 390 px, cambio entre tres secciones, letras y controles grandes, botón principal visible y confirmación de borrado.
