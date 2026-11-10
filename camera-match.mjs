function words(value){return String(value||'').toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\bdr\b/g,'doctor').replace(/\bav\b/g,'avenida').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);}

export function verifiedCameraResult(query,results){
 const number=query.match(/\b\d{1,5}\b/)?.[0];if(!number)return null;
 const queryWords=words(query),postcode=query.match(/\bB\s?\d{4}(?:[A-Z]{3})?\b/i)?.[0].replace(/\s+/g,'').toLowerCase();
 const matches=results.filter(result=>{
  const house=String(result.address?.house_number||'').trim();
  const road=words(result.address?.road||result.address?.pedestrian||result.address?.residential||'').filter(word=>word.length>2);
  if(house!==number||!road.length||!road.every(word=>queryWords.includes(word)))return false;
  const localWords=queryWords.filter(word=>word!==number&&!road.includes(word)&&!['direccion','domicilio','dom','enviar','buenos','aires','argentina','provincia'].includes(word)&&word!==postcode);
  const resultWords=words(result.display_name);
  const locality=localWords.some(word=>word.length>=3&&resultWords.includes(word));
  const resultPostcode=String(result.address?.postcode||'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^b(?=\d)/,'');
  const samePostcode=postcode&&resultPostcode===postcode.replace(/^b/,'');
  return locality||samePostcode;
 });
 return matches.length===1?matches[0]:null;
}
