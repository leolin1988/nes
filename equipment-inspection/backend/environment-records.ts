import { requireAccess, canAccess } from './access-control.ts';
import { uuidPattern, PHOTO_BUCKET, decodePhoto } from './inspection-features.ts';
export async function environmentRecords(body:any,user:any,client:any,reply:any){
 if(!['environment_get','environment_template_save','environment_record_save','environment_photo_upload','environment_photo_get'].includes(body.action))return null;
 const dept=String(body.department_id||'');if(!uuidPattern.test(dept))return reply({error:'invalid_department'},400);
 const settings=body.action==='environment_template_save'||body.action==='environment_photo_upload'||body.settings===true;
 if(settings&&!['admin','supervisor'].includes(user.role))return reply({error:'forbidden'},403);
 requireAccess(user,dept,settings?'environment_settings':'environment','view');
 const d=await client.from('departments').select('id').eq('id',dept).eq('is_active',true).maybeSingle();if(d.error)throw d.error;if(!d.data)return reply({error:'forbidden'},403);
 const t=await client.from('environment_templates').select('*').eq('department_id',dept).maybeSingle();if(t.error)throw t.error;
 if(body.action==='environment_get'){
  const defaults=await client.from('environment_defaults').select('items,source_filename,source_sheet').maybeSingle();if(defaults.error)throw defaults.error;
  let record=null;
  if(!settings){if(!/^20\d{2}-\d{2}-\d{2}$/.test(body.inspection_date||''))return reply({error:'invalid_date'},400);const r=await client.from('environment_records').select('*').eq('department_id',dept).eq('inspection_date',body.inspection_date).maybeSingle();if(r.error)throw r.error;record=r.data;}
  const selected=record?record.source_key_snapshot:t.data?.source_key;
  let sourceQuery=client.from('environment_sources').select('*');if(!settings)sourceQuery=sourceQuery.eq('source_key',selected||defaults.data?.source_sheet);
  const sources=await sourceQuery;if(sources.error)throw sources.error;
  const source=sources.data?.find((s:any)=>s.source_key===(selected||defaults.data?.source_sheet));
  return reply({template:t.data,defaults:defaults.data,record,source,sources:settings?sources.data.map((s:any)=>({...s,layout:{...s.layout}})):undefined});
 }
 if(body.action==='environment_photo_upload'){
  if(!canAccess(user,dept,'environment_settings',t.data?'edit':'create'))return reply({error:'forbidden'},403);
  const photo=decodePhoto(body.photo),id=crypto.randomUUID(),objectPath=user.id+'/'+id+'.'+photo.extension;
  const uploaded=await client.storage.from(PHOTO_BUCKET).upload(objectPath,photo.bytes,{contentType:photo.mime,upsert:false});if(uploaded.error)throw uploaded.error;
  const inserted=await client.from('inspection_reference_photos').insert({id,object_path:objectPath,uploaded_by:user.id,original_name:String(body.filename||'factory-map').slice(0,200),mime_type:photo.mime,size_bytes:photo.bytes.length});
  if(inserted.error){await client.storage.from(PHOTO_BUCKET).remove([objectPath]);throw inserted.error;}
  const signed=await client.storage.from(PHOTO_BUCKET).createSignedUrl(objectPath,600);if(signed.error)throw signed.error;return reply({photo:{id,url:signed.data.signedUrl,expires_in:600}});
 }
 if(body.action==='environment_photo_get'){
  if(!uuidPattern.test(String(body.photo_id||'')))return reply({error:'invalid_photo'},400);
  let permitted=t.data?.map_photo_id===body.photo_id;
  if(body.record_id){const r=await client.from('environment_records').select('map_photo_id').eq('id',body.record_id).eq('department_id',dept).maybeSingle();if(r.error)throw r.error;permitted=r.data?.map_photo_id===body.photo_id;}
  const photo=await client.from('inspection_reference_photos').select('object_path,uploaded_by').eq('id',body.photo_id).maybeSingle();if(photo.error)throw photo.error;
  if(!photo.data||(!permitted&&!(settings&&body.preview===true&&photo.data.uploaded_by===user.id&&(canAccess(user,dept,'environment_settings','create')||canAccess(user,dept,'environment_settings','edit')))))return reply({error:'forbidden'},403);
  const signed=await client.storage.from(PHOTO_BUCKET).createSignedUrl(photo.data.object_path,600);if(signed.error)throw signed.error;return reply({photo:{id:body.photo_id,url:signed.data.signedUrl,expires_in:600}});
 }
 if(!Number.isSafeInteger(body.revision)||body.revision<0)return reply({error:'invalid_environment'},400);
 const template=body.action==='environment_template_save';
 const args=template?{p_country:body.country_code,p_account:user.id,p_department:dept,p_revision:body.revision,p_items:body.items,p_map:body.map_photo_id||null,p_source:body.source_key||null,p_source_map:body.source_map_enabled===true}:{p_country:body.country_code,p_account:user.id,p_department:dept,p_date:body.inspection_date,p_revision:body.revision,p_template_revision:body.template_revision,p_results:body.results,p_inspector:body.inspector,p_confirm:body.confirmed};
 const r=await client.rpc(template?'save_environment_template_v2':'save_environment_record_v2',args);
 if(r.error){const code=['forbidden','record_changed','invalid_photo','invalid_environment','confirmation_incomplete'].find(k=>r.error.message?.includes(k));if(code)return reply({error:code},code==='forbidden'?403:code==='record_changed'?409:400);throw r.error;}
 return reply(template?{template:r.data}:{record:r.data});
}


