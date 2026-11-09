# Uso simple desde el celular

Actualizado el 8 de noviembre de 2026. Diseño inspirado en la organización de HidroTrack, preparado para una persona mayor que hará el reparto de prueba.

- Barra fija con tres secciones, siempre con texto: Recorrido, Clientes y Mi cuenta. La selección se indica visualmente y mediante `aria-current`.
- Al abrir, se muestra Recorrido: próxima dirección y un botón principal Abrir recorrido. La app elegida se mantiene entre sesiones. Mapa y paradas quedan en la misma sección.
- Clientes reúne el formulario y la carga de lista; no hace falta pasar por ellos durante el recorrido. Al editar una parada se abre automáticamente esta sección.
- Mi cuenta reúne ayuda, administración si corresponde, cierre de sesión y borrado completo del reparto.
- Texto principal de 18 px; dirección de próxima entrega de 22 px; información secundaria de 16 px o más. Controles principales de 54 px o más y botón Abrir recorrido de 60 px. La pantalla de login también usa letras y controles grandes. No se bloquea el zoom.
- Opciones de GPS, seguimiento, notificaciones y guardado quedan plegadas, con rótulos explícitos. El estado de guardado permanece visible cuando la cuenta usa la nube.
- En cada parada, Entregada es la acción destacada. Editar y Eliminar están bajo Más opciones; eliminar pide confirmación. Se conservan Subir y Bajar.

Verificación: 60 pruebas automáticas aprobadas, con cambios de sección, carga de lista, edición que lleva a Clientes, eliminación confirmada, recuperación y navegación de pendientes. Chrome real en Windows con viewport de 360 × 800 y 390 × 800: sin desborde horizontal, botón principal visible antes de la barra inferior, cambio entre las tres secciones. Vista de escritorio conserva la tabla.

Capturas locales con datos ficticios: `.private/home-360.png`, `.private/home-390.png`, `.private/mobile-390.png`. Script repetible: `node scripts/mobile-smoke.mjs`. Login, GPS y entregas se simulan para esta revisión visual; falta la prueba de uso en el teléfono de la persona invitada.
