
const milestones = [
 {name:'Preparación del proyecto',detail:'Carpeta independiente y alcance inicial documentado.',weight:5,completion:1},
 {name:'Tablero de seguimiento',detail:'HTML local con requisitos, estados y porcentaje calculado.',weight:5,completion:1},
 {name:'Carga de entregas',detail:'Tabla debajo del mapa: hasta 30 direcciones, destinatario, notas, edición y eliminación. Probado con DOM y Leaflet reales; falta revisión visual.',weight:12,completion:0.95},
 {name:'Búsqueda y confirmación',detail:'Autocompletado de direcciones, coordenadas y confirmación de ubicación.',weight:10,completion:0.60000000},
 {name:'Salida y final',detail:'Ubicación actual obligatoria; última entrega o regreso al origen. Pendiente prueba de GPS en celular.',weight:8,completion:0.75000000},
 {name:'Optimización del recorrido',detail:'Orden automático por cercanía al agregar, editar o eliminar; ajuste por calles, cancelación de cálculos viejos y advertencia de orden provisional.',weight:20,completion:0.8},
 {name:'Mapa y listado ordenado',detail:'Tabla y marcadores con la misma numeración. Selección cruzada tabla/mapa y biblioteca local. Pendiente validación visual.',weight:12,completion:0.85},
 {name:'Navegación externa',detail:'Bloques para Google Maps y próxima entrega en otras apps compatibles; conservar orden sin omisiones.',weight:10,completion:0.70000000},
 {name:'Gestión del reparto',detail:'Entregas realizadas, recálculo de pendientes y botones Subir/Bajar. Orden manual guardado, mapa y navegación sincronizados; regreso explícito al automático.',weight:6,completion:0.85},
 {name:'Guardado local',detail:'Recuperar direcciones, orden y progreso al cerrar y volver a abrir.',weight:5,completion:0.60000000},
 {name:'Instalación y validación',detail:'PWA, adaptación a celular, permisos, credenciales protegidas y verificación del flujo completo.',weight:7,completion:0.00000000}
];
const total=milestones.reduce((sum,item)=>sum+item.weight,0);
const completed=milestones.filter(item=>item.completion===1);
const percent=Math.round(milestones.reduce((sum,item)=>sum+item.weight*item.completion,0)/total*100);
document.getElementById('percentage').textContent=percent+'%';
document.getElementById('progress').value=percent;
document.getElementById('count').textContent=completed.length+' de '+milestones.length+' hitos completados';
for(const item of milestones){const row=document.createElement('tr');for(const value of [item.name,item.detail,item.weight+'%',item.completion===1?'Completado':item.completion>0?'Parcial ? '+Math.round(item.completion*100)+'%':'Pendiente']){const cell=document.createElement('td');cell.textContent=value;row.appendChild(cell);}row.lastChild.className=item.completion===1?'done':'pending';document.getElementById('milestones').appendChild(row);}
