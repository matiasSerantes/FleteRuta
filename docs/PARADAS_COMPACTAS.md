# Paradas compactas, punto de carga y cierre del día

Solo FleteRuta. Cambios del 8 de noviembre de 2026; no cambia HidroTrack.

- Hasta 40 paradas en formulario, lista pegada, recuperación local, Worker y base. El punto de carga también ocupa una parada. Las rutas existentes no se recortan ni se borran al instalar la actualización.
- Calle y altura en las tarjetas. Las búsquedas nuevas usan los campos de calle y número del resultado; las anteriores se resumen a partir de la dirección conservada sin inventar alturas faltantes. Tocar la dirección muestra la dirección completa con barrio/partido. Destinatario y notas se conservan dentro del detalle, sin columnas ni bloques vacíos.
- Flechas para subir/bajar, Entregada y Más opciones. Texto principal de 18 px y botones de al menos 44 × 44 px. En celular las tarjetas de prueba con direcciones largas quedan por debajo de 300 px de alto.
- Agregar ubicación actual solicita una posición GPS nueva y guarda un Punto de carga como última parada, con confirmación. Conserva sus coordenadas aunque el celular se mueva. Las nuevas entregas se insertan antes y el orden automático mantiene el punto de carga al final. El orden manual se puede ajustar explícitamente. Se desmarca el retorno automático para no duplicar la vuelta.
- Finalizar día, junto a Mis paradas, pide confirmación y vacía todas las paradas, entregadas, lista pendiente y configuración del recorrido; detiene el seguimiento. No cierra la cuenta. El guardado automático sincroniza el recorrido vacío. Sin Internet conserva el borrado local pendiente de sincronizar; un conflicto entre dispositivos mantiene las protecciones existentes. No hay historial de jornadas para recuperar lo eliminado.

Migración `20261109020000_fleteruta_40_stops.sql`: solo reemplaza el validador de las paradas de FleteRuta, mantiene permisos y acepta hasta 40. No modifica datos de personas reales ni tablas o licencias de HidroTrack. Verificación remota sin escrituras de rutas: 40 válidas, 41 rechazadas.

58 pruebas aprobadas: límites, guardar 40 en PostgreSQL, campos opcionales, calle/altura, punto final, cancelar/confirmar cierre, mapa vacío y guardado vacío detrás de un guardado en curso. Chrome a 360/390 px y escritorio sin desbordes de página, con datos y GPS simulados. La prueba de recorrido real sigue pendiente del teléfono invitado.
