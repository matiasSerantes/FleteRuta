import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedCameraResult} from './camera-match.mjs';

const exact={display_name:'1759, Doctor Antonio Malaver, Olivos, Buenos Aires, Argentina',address:{road:'Doctor Antonio Malaver',house_number:'1759',town:'Olivos',country_code:'ar'}};
test('agrega solo un resultado con calle, altura y localidad coincidentes',()=>{
 assert.equal(verifiedCameraResult('DR ANTONIO MALAVER 1759, OLIVOS BUENOS AIRES',[exact]),exact);
 assert.equal(verifiedCameraResult('DR ANTONIO MALAVER 1759, OLIVOS BUENOS AIRES',[exact,{...exact}]),null);
});
test('no confirma una calle, altura o localidad distinta',()=>{
 const query='DR ANTONIO MALAVER 1759, OLIVOS BUENOS AIRES';
 for(const result of [{...exact,address:{...exact.address,house_number:'1758'}},{...exact,address:{...exact.address,road:'Antonio Saenz'}},{...exact,display_name:'1759, Doctor Antonio Malaver, San Isidro, Buenos Aires'}])assert.equal(verifiedCameraResult(query,[result]),null);
});
