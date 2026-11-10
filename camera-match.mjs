function words(value){return String(value||'').toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\bdr\b/g,'doctor').replace(/\bav\b/g,'avenida').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);}

export function verifiedCameraResult(query,results){
 const number=query.match(/\b\d{1,5}\b/)?.[0];if(!number)return null;
 const street=words(query.slice(0,query.indexOf(number))).filter(word=>word.length>2);
 if(street.length<2)return null;
 const locality=words(query.slice(query.indexOf(number)+number.length))[0];
 if(!locality||locality.length<3)return null;
 const matches=results.filter(result=>{
  const house=String(result.address?.house_number||'').trim();
  const road=words(result.address?.road||result.address?.pedestrian||result.address?.residential||'');
  return house===number&&street.every(word=>road.includes(word))&&words(result.display_name).includes(locality);
 });
 return matches.length===1?matches[0]:null;
}
