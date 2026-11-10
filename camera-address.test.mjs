import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDeliveryAddress} from './camera-address.mjs';

test('lee Enviar a y deja fuera datos de factura y cliente',()=>{
 const text=`Comprobante de Entrega A Cliente
Enviar a.......: DR ANTONIO MALAVER 1759 P-PB D-3 1636/0-OLIVOS BUENOS AIRES
Barrio.........: INDEFINIDO
Datos de la factura
Cliente........: OSUNA GUILLERMO`;
 assert.equal(extractDeliveryAddress(text),'DR ANTONIO MALAVER 1759, OLIVOS BUENOS AIRES');
});

test('tolera una línea partida y ruido de OCR del comprobante de ejemplo',()=>{
 const text=`enviar a-- DR ANTONI N_———————=—=—=az==—=—
O MALAVER 1759 p-PB D-3 1636/0-OLIVOS BUENOS AIRES
parriO-...reeeci INDEFINIDO`;
 assert.equal(extractDeliveryAddress(text),'DR ANTONIO MALAVER 1759, OLIVOS BUENOS AIRES');
});

test('sin campo Enviar a no inventa una dirección',()=>{
 assert.equal(extractDeliveryAddress('Factura 123\nCliente OSUNA\nDOM: CORRIENTES 1234'), '');
});
