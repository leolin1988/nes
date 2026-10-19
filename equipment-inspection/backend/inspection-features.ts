export const PHOTO_BUCKET = 'inspection-reference-photos';
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function taipeiDay(now = new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function inspectionDate(body: any, now = new Date()) {
  const today=taipeiDay(now), backfill=body.is_backfill===true, date=String(body.inspection_date || today);
  const valid=/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date+'T00:00:00Z')) && new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
  if(!valid || date>today || (backfill ? date>=today : date!==today)) throw new Error('invalid_inspection_date');
  if(backfill && !String(body.backfill_reason||'').trim()) throw new Error('backfill_reason_required');
  return {date,backfill,reason:backfill?String(body.backfill_reason).trim().slice(0,1000):''};
}
export function decodePhoto(input: unknown) {
  if(typeof input!=='string' || input.length>2700000) throw new Error('invalid_photo');
  const match=input.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match) throw new Error('invalid_photo');
  let bytes:Uint8Array;
  try {bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));}catch{throw new Error('invalid_photo');}
  if(!bytes.length || bytes.length>2000000)throw new Error('invalid_photo');
  const sig=Array.from(bytes.slice(0,12));
  const jpeg=sig[0]===255&&sig[1]===216&&sig[2]===255;
  const png=[137,80,78,71,13,10,26,10].every((v,n)=>sig[n]===v);
  const webp=String.fromCharCode(...sig.slice(0,4))==='RIFF'&&String.fromCharCode(...sig.slice(8,12))==='WEBP';
  if(!(match[1]==='image/jpeg'?jpeg:match[1]==='image/png'?png:webp))throw new Error('invalid_photo');
  return {bytes,mime:match[1],extension:match[1]==='image/jpeg'?'jpg':match[1].split('/')[1]};
}
export function itemSignature(item:any) {return JSON.stringify(['name','standard','method','cycle'].map(k=>['zh','en','es','vi'].map(l=>String(item[k]?.[l]||'').trim())));}
export function preservePhotos(items:any[], previous:any[]) {
  return items.map(item=>{
    if(Object.prototype.hasOwnProperty.call(item,'reference_photo_id'))return item;
    let matches=previous.filter(old=>itemSignature(old)===itemSignature(item));
    if(!matches.length && items.filter(x=>x.name?.zh===item.name?.zh).length===1) {
      const named=previous.filter(old=>old.name?.zh===item.name?.zh);
      if(named.length===1)matches=named;
    }
    const ids=[...new Set(matches.map(old=>old.reference_photo_id).filter(Boolean))];
    if(ids.length>1)throw new Error('photo_match_ambiguous');
    return ids.length?{...item,reference_photo_id:ids[0]}:item;
  });
}


