import { ownsDepartment } from './access-control.ts';
import { uuidPattern, PHOTO_BUCKET } from './inspection-features.ts';
export async function craneTemplates(body:any,user:any,client:any,reply:any){
 if(!['crane_template_get','crane_template_save','crane_photo_get'].includes(body.action))return null;
 if(body.action!=='crane_photo_get'&&!['admin','supervisor'].includes(user.role))return reply({error:'forbidden'},403);
 if(!uuidPattern.test(String(body.equipment_id||'')))return reply({error:'invalid_crane'},400);
 const eq=await client.from('equipments').select('id,department_id,archived_at,machine_no,name_zh,equipment_groups(name_zh)').eq('id',body.equipment_id).maybeSingle();
 if(eq.error)throw eq.error;
 if(!eq.data||!ownsDepartment(user,eq.data.department_id))return reply({error:'forbidden'},403);
 if(eq.data.archived_at||!eq.data.machine_no||!/天車|起重機/.test(eq.data.name_zh+' '+(eq.data.equipment_groups?.name_zh||'')))return reply({error:'invalid_crane'},400);
 const t=await client.from('crane_monthly_templates').select('*').eq('equipment_id',eq.data.id).maybeSingle();if(t.error)throw t.error;
 if(body.action==='crane_template_get')return reply({template:t.data});
 if(body.action==='crane_template_save'){
  const r=await client.rpc('save_crane_monthly_template',{p_country:body.country_code,p_account:user.id,p_equipment:eq.data.id,p_revision:body.revision,p_items:body.items});
  if(r.error){const code=['record_changed','forbidden','invalid_photo','invalid_template'].find(k=>r.error.message?.includes(k))||'invalid_template';return reply({error:code},code==='record_changed'?409:code==='forbidden'?403:400);}
  return reply({template:r.data});
 }
 if(!uuidPattern.test(String(body.photo_id||'')))return reply({error:'invalid_photo'},400);
 let permitted=t.data?.items?.some((i:any)=>i.reference_photo_id===body.photo_id);
 if(body.crane_record_id){
  if(!uuidPattern.test(String(body.crane_record_id)))return reply({error:'invalid_photo'},400);
  const r=await client.from('crane_inspection_records').select('template_snapshot').eq('id',body.crane_record_id).eq('equipment_id',eq.data.id).eq('kind','monthly').maybeSingle();if(r.error)throw r.error;
  permitted=r.data?.template_snapshot?.some((i:any)=>i.reference_photo_id===body.photo_id);
 }
 const photo=await client.from('inspection_reference_photos').select('object_path,uploaded_by').eq('id',body.photo_id).maybeSingle();if(photo.error)throw photo.error;
 // Uploader may preview a new image before saving its template.
 if(!photo.data||(!permitted&&!(body.preview===true&&['admin','supervisor'].includes(user.role)&&photo.data.uploaded_by===user.id)))return reply({error:'forbidden'},403);
 const signed=await client.storage.from(PHOTO_BUCKET).createSignedUrl(photo.data.object_path,600);if(signed.error)throw signed.error;
 return reply({photo:{id:body.photo_id,url:signed.data.signedUrl,expires_in:600}});
}


