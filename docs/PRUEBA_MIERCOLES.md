# Prueba del miércoles 11 de noviembre de 2026

Web: https://fleteruta.matilegen.workers.dev/

## Preparación antes del reparto

1. El fletero crea su cuenta, confirma el correo y avisa al administrador.
2. El administrador lo busca en Usuarios y accesos y habilita Solo FleteRuta.
3. Desde el celular, iniciar sesión y permitir ubicación. Comprobar el punto de salida.
4. Pegar la lista en Cargar lista de clientes. Una dirección completa por renglón, con localidad. También acepta tres columnas copiadas de Excel: dirección, destinatario, observaciones. No importa archivos CSV ni Excel directamente.
5. Buscar y confirmar cada ubicación. Se muestra la siguiente dirección después de confirmar; nunca se agregan coordenadas sin revisión. Se admiten 30 paradas en total. La lista pendiente se guarda solo en ese navegador y cuenta; los clientes confirmados se sincronizan como parte del reparto.
6. Revisar tabla, mapa y orden. Esperar el mensaje de guardado en nube.
7. Antes del miércoles, hacer una prueba corta con dos destinos reales: cerrar y volver a abrir la web; verificar la recuperación; abrir Maps/Waze; al estacionar, volver a FleteRuta y confirmar una entrega; comprobar que abre el siguiente cliente y conserva el avance después de reabrir.

## Durante el reparto

- Usar los controles con el vehículo detenido.
- Volver a FleteRuta al llegar. El navegador puede suspender el GPS mientras Maps/Waze está abierto o el teléfono está bloqueado. No se promete un aviso automático en segundo plano.
- Eliminar un cliente cancelado desde su tarjeta; Subir/Bajar ajusta la secuencia manualmente.
- Si falta Internet, conservar el navegador y sus datos. Los cambios ya hechos se conservan localmente y la sincronización reintenta al recuperar conexión. Abrir nuevamente toda la web, buscar direcciones o cargar el mapa requiere conexión.
- Si aparece un conflicto entre dispositivos, no borrar el reparto: revisar qué copia se desea recuperar. Evitar editar simultáneamente desde dos teléfonos.

## Verificado el 8 de noviembre

55 pruebas automáticas aprobadas. Incluyen lista con columnas, límites sin truncar clientes, recuperación de pendientes, confirmación consecutiva en la interfaz, orden y marcadores, guardado y recuperación del avance, aislamiento de cuentas y administración.

Chrome real en esta PC, con login y GPS simulados: vista de 390 × 844 sin desborde horizontal, botones de acciones de al menos 44 px, paradas en tarjetas. Vista de escritorio de 1366 px conserva la tabla. Captura local: `.private/mobile-390.png`. Repetible con `node scripts/mobile-smoke.mjs` (Chrome instalado, solo datos ficticios).

Pendiente para dar por validada la prueba en calle: entrega real del correo, inicio de sesión de la persona invitada, permisos/GPS del teléfono y apertura de Maps/Waze. No se enviaron correos de prueba ni se crearon usuarios ficticios en Supabase.

La barra inferior divide la app en Recorrido, Clientes y Mi cuenta. Abrir recorrido está en Recorrido; agregar direcciones y pegar listas está en Clientes; ayuda, sesión y borrar reparto están en Mi cuenta. Ver docs/DISENO_CELULAR.md.
