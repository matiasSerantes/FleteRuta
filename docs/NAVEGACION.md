# Abrir el reparto en otra app

En Navegar el reparto se elige Google Maps o Waze. Un único botón abre el máximo de destinos compatible con el enlace, siguiendo el orden de la tabla. Se retiraron los enlaces de cada fila y la lista de botones por bloques.

Google Maps: hasta cuatro destinos (tres intermedios y el destino final) desde navegador móvil; diez desde escritorio. Se utiliza el límite móvil también para dispositivos táctiles. Waze: un destino por enlace. La pantalla muestra cuántos se enviarán y cuántos quedan; no se ocultan los excedentes.

Los destinos se preparan de nuevo al tocar el botón: se excluyen las entregadas, se mantienen los cambios de orden y se agregan las siguientes pendientes hasta llenar el cupo. Las eliminadas tampoco se envían. Al confirmar una llegada se completa únicamente esa entrega, pero el enlace que se abre incluye las siguientes pendientes compatibles, no solo la siguiente. Si corresponde, el retorno al origen ocupa un destino más.

El progreso debe marcarse o confirmarse en FleteRuta. Google Maps y Waze no comunican a esta web qué clientes se completaron. El enlace abre un recorrido nuevo con lo que falta; no modifica automáticamente una navegación ya abierta.

Documentación consultada el 8 de noviembre de 2026: [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [Waze Deep Links](https://developers.google.com/waze/deeplinks).

Verificado con pruebas de 40 paradas, entregadas excluidas, cambios de cupo, Waze y retorno. Prueba de interfaz móvil: entrega manual, eliminación, aviso de llegada y enlace con las siguientes pendientes. La apertura en las aplicaciones reales del teléfono sigue requiriendo la prueba del fletero.

Corrección de salida: se envía origin con las coordenadas obtenidas por FleteRuta y dir_action=navigate. Si el seguimiento tiene una posición reciente y precisa, se usa esa como salida. Al confirmar llegada, el siguiente recorrido parte de la ubicación de esa entrega. Sin ubicación disponible, el botón solicita habilitar el GPS en lugar de abrir un formulario sin salida. Waze toma la salida desde su propio GPS. Verificado con 58 pruebas automáticas; apertura real en el teléfono pendiente.
