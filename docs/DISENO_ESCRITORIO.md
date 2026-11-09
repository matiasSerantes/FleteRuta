# Vista de computadora

Mejora del 8 de noviembre de 2026, manteniendo la vista de celular y sus letras grandes.

Desde 1100 px se muestra un menú lateral fijo con Recorrido, Clientes y Mi cuenta. El encabezado incluye acceso directo a Agregar clientes. El recorrido presenta tarjetas con pendientes, entregadas y total; los valores cambian con el mismo estado que la tabla, sin datos ni contadores separados.

Próxima entrega y controles quedan a la izquierda del mapa, que aprovecha el espacio disponible y permanece visible al desplazar su sección. La tabla pasa debajo de ambas columnas y usa todo el ancho. Si una pantalla no permite mostrar todas las columnas, el desplazamiento horizontal queda dentro de la tabla.

Clientes usa dos columnas para formulario, lista y opciones del reparto. Mi cuenta también distribuye sus tarjetas en columnas. Hasta 1099 px se conserva la navegación inferior; en celular se mantienen las paradas como tarjetas y el botón principal grande.

Verificación en Chrome real: 1024, 1280, 1366 y 1920 px, cambio entre las tres secciones sin desborde de página. Desde 1100 px: menú lateral de 228 px, mapa de más de 400 px y tabla más ancha que el mapa. Regresión de celular a 360 y 390 px: navegación inferior y controles legibles. Capturas locales con datos ficticios: `.private/desktop-route.png` y `.private/desktop-clients.png`. El script bloquea servicios externos y simula GPS y login; las capturas no verifican la disponibilidad real del mapa.

Prueba de formulario actualizada: los contadores reflejan tres paradas pendientes y luego dos pendientes y una entregada. No cambia la autenticación, las licencias ni la base de datos.
