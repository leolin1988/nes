import { ownsDepartment } from './access-control.ts';
import { fireDailyAction } from './fire-daily.ts';
import { fireAttachmentAction } from './fire-attachments.ts';
// All requests reach this handler only after the account has been revalidated.
export async function managementAction(body:any,user:any,client:any,reply:any,audit:any) {
 const fireDaily=await fireDailyAction(body,user,client,reply,audit);if(fireDaily)return fireDaily;
 const fireAttachment=await fireAttachmentAction(body,user,client,reply,audit);if(fireAttachment)return fireAttachment;
 const manager=['admin','supervisor'].includes(user.role);
 const clean=(v:any,n=200)=>String(v??'').trim().slice(0,n);
 const allowed=(e:any)=>!!e&&ownsDepartment(user,e.department_id);
 const checked=async(q:any)=>{const r=await q;if(r.error)throw r.error;return r.data;};
 const date=(v:any)=>{const s=clean(v,10);if(!s)return '';const parsed=new Date(s+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==s)throw Error('invalid_date');return s;};
 if(body.action==='record_approve') {
  if(!manager)return reply({error:'forbidden'},403);
  const r=await checked(client.from('inspection_records').select('*,equipments!inner(department_id)').eq('id',body.id).single());
  if(!r||!allowed(r.equipments))return reply({error:'forbidden'},403);
  if(r.is_draft||r.approval_status!=='pending')return reply({error:'already_reviewed'},409);
  if(body.normal_only===true&&(body.approve!==true||r.overall_status!=='normal'||!Array.isArray(r.answers)||!r.answers.length||r.answers.some((a:any)=>a?.value!=='normal')))return reply({error:'not_qualified'},409);
  const reviewer=clean(body.reviewer_name,100),note=clean(body.review_note,2000);
  if(!reviewer||!note||body.review_confirmed!==true||typeof body.approve!=='boolean')return reply({error:'review_required'},400);
  const update={approval_status:body.approve?'approved':'rejected',reviewer_name:reviewer,review_note:note,reviewed_by:user.id,reviewed_at:new Date().toISOString()};
  let approval=client.from('inspection_records').update(update).eq('id',r.id).eq('approval_status','pending').eq('is_draft',false);
  if(body.normal_only===true)approval=approval.eq('overall_status','normal').eq('answers',JSON.stringify(r.answers));
  const saved=await checked(approval.select('id'));
  if(!saved?.length)return reply({error:'already_reviewed'},409);
  await audit(client,user.id,'record_'+update.approval_status,r.id,{reviewer_name:reviewer,review_note:note});return reply({success:1});
 }
 if(['equipment_save','equipment_remove','equipment_restore','equipment_set_active'].includes(body.action)){
  if(!manager)return reply({error:'forbidden'},403);
  const old=body.id?await checked(client.from('equipments').select('*').eq('id',body.id).single()):null;
  if(body.id&&!allowed(old))return reply({error:'forbidden'},403);
  if(body.action==='equipment_set_active'){
   if(!old||typeof body.active!=='boolean'||!Object.prototype.hasOwnProperty.call(body,'expected_archived_at'))return reply({error:'invalid_equipment'},400);
   if((old.archived_at||null)!==body.expected_archived_at)return reply({error:'record_changed'},409);
   if(body.active===!old.archived_at)return reply({success:1});
   const archived=body.active?null:new Date().toISOString();
   let query=client.from('equipments').update({archived_at:archived}).eq('id',old.id);
   query=old.archived_at?query.eq('archived_at',old.archived_at):query.is('archived_at',null);
   const changed=await checked(query.select('id'));if(!changed?.length)return reply({error:'record_changed'},409);
   await audit(client,user.id,body.active?'equipment_reactivate':'equipment_deactivate',old.id,{equipment_code:old.equipment_code,before_archived_at:old.archived_at,after_archived_at:archived});return reply({success:1});
  }
  if(body.action!=='equipment_save'){
   if(!old)return reply({error:'invalid_equipment'},400);
   await checked(client.from('equipments').update({archived_at:body.action==='equipment_remove'?new Date().toISOString():null}).eq('id',old.id));
   await audit(client,user.id,body.action,old.id,{equipment_code:old.equipment_code});return reply({success:1});
  }
  const d=await checked(client.from('departments').select('id').eq('id',body.department_id).eq('in_equipment_directory',true).eq('is_active',true).maybeSingle());
  if(!d||!ownsDepartment(user,d.id))return reply({error:'forbidden'},403);
  const code=clean(body.equipment_code,50),name=clean(body.equipment_name),groupName=clean(body.equipment_group);
  if(!/^[A-Za-z0-9_-]{1,50}$/.test(code)||!name)return reply({error:'invalid_equipment'},400);
  const duplicate=await checked(client.from('equipments').select('id').eq('equipment_code',code).maybeSingle());
  if(duplicate&&duplicate.id!==old?.id)return reply({error:'duplicate_equipment'},409);
  let group=groupName?await checked(client.from('equipment_groups').select('id').eq('department_id',d.id).eq('name_zh',groupName).maybeSingle()):null;
  if(groupName&&!group)group=await checked(client.from('equipment_groups').insert({department_id:d.id,group_code:'grp_'+crypto.randomUUID().replaceAll('-','').slice(0,18),name_zh:groupName,is_active:true}).select('id').single());
  const fields={equipment_code:code,department_id:d.id,equipment_group_id:group?.id||null,name_zh:name,machine_no:clean(body.machine_no),property_no:clean(body.property_no)};
  const saved=await checked(old?client.from('equipments').update(fields).eq('id',old.id).select('id').single():client.from('equipments').insert({...fields,status:'active'}).select('id').single());
  await audit(client,user.id,'equipment_save',saved.id,fields);return reply({success:1,id:saved.id});
 }
 if(body.action==='maintenance_save'){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(body.id)))return reply({error:'invalid_maintenance'},400);
  const e=await checked(client.from('equipments').select('*').eq('id',body.equipment_id).single());
  if(!allowed(e)||e.archived_at)return reply({error:'forbidden'},403);
  const old=await checked(client.from('maintenance_records').select('*').eq('id',body.id).maybeSingle());
  if(old&&(old.equipment_id!==e.id||old.form_id!==body.form_id||(!manager&&old.created_by!==user.id)))return reply({error:'forbidden'},403);
  if(old?.status==='confirmed'||old&&old.updated_at!==body.updated_at)return reply({error:'record_changed'},409);
  const assignment=await checked(client.from('equipment_form_assignments').select('form_id').eq('equipment_id',e.id).eq('kind','maintenance').maybeSingle());
  if(assignment?.form_id!==body.form_id)return reply({error:'form_not_assigned'},409);
  const form=await checked(client.from('inspection_forms').select('*').eq('id',body.form_id).single());
  if(!form||form.kind!=='maintenance'||(!old&&form.updated_at!==body.form_updated_at))return reply({error:'form_changed'},409);
  if(!Array.isArray(body.rows)||!body.rows.length||body.rows.length>500||!Number.isInteger(body.year)||body.year<2000||body.year>2100||!clean(body.performer_name,100)||!['draft','confirmed'].includes(body.status)||!/^\w{8}-\w{4}-4\w{3}-[89ab]\w{3}-\w{12}$/.test(String(body.id)))return reply({error:'invalid_maintenance'},400);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(new Date());
  const rows=[];
  for(const r of body.rows){
   const index=Number(r.item_index),prior=old?.rows?.find((x:any)=>x.item_index===index);
   const item=prior?.item||form.items[index];
   if(!Number.isInteger(index)||!item||!['W','M','Q','Y','E'].includes(r.cycle_code))return reply({error:'invalid_maintenance'},400);
   const start=date(r.planned_start),end=date(r.planned_end),done=date(r.completed_date),cycle=clean(r.cycle_text,500);
   if(!cycle||start&&end&&end<start||done&&done>today||body.status==='confirmed'&&(!start||!end||!done))return reply({error:'invalid_maintenance'},400);
   if(start&&Number(start.slice(0,4))!==body.year)return reply({error:'invalid_maintenance'},400);
   rows.push({item_index:index,item,cycle_code:r.cycle_code,cycle_text:cycle,planned_start:start,planned_end:end,completed_date:done,note:clean(r.note,2000)});
  }
  const now=new Date().toISOString(),fields={equipment_id:e.id,form_id:form.id,form_name:old?.form_name||form.form_name,year:body.year,rows,performer_name:clean(body.performer_name,100),status:body.status,updated_by:user.id,updated_at:now,confirmed_at:body.status==='confirmed'?now:null};
  const result=await (old?client.from('maintenance_records').update(fields).eq('id',old.id).eq('updated_at',old.updated_at).eq('status','draft').select('*'):client.from('maintenance_records').insert({id:body.id,...fields,created_by:user.id}).select('*'));
  if(result.error){if(result.error.code==='23505')return reply({error:'record_changed'},409);throw result.error;}
  if(!result.data?.length)return reply({error:'record_changed'},409);
  await audit(client,user.id,'maintenance_'+body.status,body.id,{equipment_id:e.id,rows:rows.length});return reply({record:result.data[0]});
 }
 return null;
}



