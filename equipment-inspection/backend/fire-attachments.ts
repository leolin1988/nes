import { ownsDepartment } from './access-control.ts';

const columns='id,department_id,form_type,inspection_date,responsible_area,implementer_name,entries,situation_report,manager_name,manager_disposition,manager_signature,owner_disposition,owner_signature,status,created_by,updated_by,created_at,updated_at,confirmed_at';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean=(value:any,max=1000)=>String(value??'').trim().slice(0,max);
const validDate=(value:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;};

export async function fireAttachmentAction(body:any,user:any,client:any,reply:any,audit:any){
 const checked=async(q:any)=>{const r=await q;if(r.error)throw r.error;return r.data;};
 const type=Number(body.form_type??body.record?.form_type);
 if(!['fire_attachment_list','fire_attachment_save','fire_attachment_review','fire_approval_history'].includes(body.action))return null;
 const depts=[...new Set((user.departmentIds||[user.dept]).filter(Boolean))];
 if(body.action==='fire_approval_history'){
  const scope=depts.length?depts:['00000000-0000-0000-0000-000000000000'];
  const [departments,daily,attachments]=await Promise.all([
   checked(client.from('departments').select('id,name_zh,name_en,name_es,name_vi').in('id',scope).eq('is_active',true).order('sort_order')),
   checked(client.from('fire_daily_records').select('id,department_id,inspection_month,responsible_area,implementer_name,manager_name,manager_signature,confirmed_at').in('department_id',scope).eq('status','confirmed').order('confirmed_at',{ascending:false}).limit(1000)),
   checked(client.from('fire_attachment_records').select('id,department_id,form_type,inspection_date,responsible_area,implementer_name,manager_name,manager_signature,confirmed_at').in('department_id',scope).eq('status','confirmed').order('confirmed_at',{ascending:false}).limit(1000))
  ]);
  const records=[...daily.map((r:any)=>({...r,form_type:1})),...attachments].sort((a:any,b:any)=>String(b.confirmed_at||'').localeCompare(String(a.confirmed_at||'')));
  return reply({departments,records,truncated:daily.length===1000||attachments.length===1000});
 }
 if(![2,3].includes(type))return reply({error:'invalid_fire_attachment'},400);
 if(body.action==='fire_attachment_list'){
  const departments=await checked(client.from('departments').select('id,name_zh,name_en,name_es,name_vi').in('id',depts).eq('is_active',true).order('sort_order'));
  let q=client.from('fire_attachment_records').select(columns).eq('form_type',type).order('inspection_date',{ascending:false}).order('updated_at',{ascending:false}).limit(300);
  q=depts.length?q.in('department_id',depts):q.eq('department_id','00000000-0000-0000-0000-000000000000');
  return reply({departments,records:await checked(q)});
 }
 if(body.action==='fire_attachment_save'){
  const r=body.record||{},id=String(r.id||''),dept=clean(r.department_id,50),date=clean(r.inspection_date,10),area=clean(r.responsible_area,200),name=clean(r.implementer_name,100);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(!uuid.test(id)||!ownsDepartment(user,dept)||!validDate(date)||date>today||!area||!name||!Array.isArray(r.entries)||r.entries.length!==9)return reply({error:'invalid_fire_attachment'},400);
  const entries=[];
  for(let i=0;i<9;i++){
   const item=r.entries[i];if(Number(item?.item)!==i+1||!['','O','V','X','NA'].includes(item?.status))return reply({error:'invalid_fire_attachment'},400);
   entries.push({item:i+1,status:item.status,note:clean(item.note,1000)});
  }
  const status=r.status==='submitted'?'submitted':'draft';
  if(status==='submitted'&&entries.some((e:any)=>!e.status))return reply({error:'fire_attachment_incomplete'},400);
  const old=await checked(client.from('fire_attachment_records').select(columns).eq('department_id',dept).eq('form_type',type).eq('inspection_date',date).eq('responsible_area',area).maybeSingle());
  if(old&&old.id!==id)return reply({error:'fire_attachment_exists'},409);
  if(old&&old.status!=='draft')return reply({error:'fire_attachment_locked'},409);
  if(old&&old.updated_at!==r.updated_at)return reply({error:'record_changed'},409);
  const now=new Date().toISOString(),values={department_id:dept,form_type:type,inspection_date:date,responsible_area:area,implementer_name:name,entries,situation_report:clean(r.situation_report,2000),status,updated_by:user.id,updated_at:now};
  const saved=old?await checked(client.from('fire_attachment_records').update(values).eq('id',old.id).eq('updated_at',old.updated_at).select(columns)):await checked(client.from('fire_attachment_records').insert({id,...values,created_by:user.id}).select(columns));
  if(!saved?.length)return reply({error:'record_changed'},409);
  await audit(client,user.id,`fire_attachment_${type}_${status}`,saved[0].id,{department_id:dept,inspection_date:date});
  return reply({record:saved[0]});
 }
 if(!['admin','supervisor'].includes(user.role))return reply({error:'forbidden'},403);
 const id=String(body.id||'');if(!uuid.test(id))return reply({error:'invalid_fire_attachment'},400);
 const old=await checked(client.from('fire_attachment_records').select(columns).eq('id',id).eq('form_type',type).maybeSingle());
 if(!old||!ownsDepartment(user,old.department_id))return reply({error:'forbidden'},403);
 if(old.status!=='submitted'||old.updated_at!==body.updated_at)return reply({error:'record_changed'},409);
 const manager=clean(body.manager_name,100),disposition=clean(body.manager_disposition,2000),signature=clean(body.manager_signature,100);
 if(!manager||!disposition||!signature||!['confirm','return'].includes(body.decision))return reply({error:'fire_attachment_review_required'},400);
 const confirmed=body.decision==='confirm',now=new Date().toISOString();
 const saved=await checked(client.from('fire_attachment_records').update({manager_name:manager,manager_disposition:disposition,manager_signature:signature,status:confirmed?'confirmed':'draft',updated_by:user.id,updated_at:now,confirmed_at:confirmed?now:null}).eq('id',id).eq('updated_at',old.updated_at).select(columns));
 if(!saved?.length)return reply({error:'record_changed'},409);
 await audit(client,user.id,`fire_attachment_${type}_${confirmed?'confirmed':'returned'}`,id,{manager_name:manager});
 return reply({record:saved[0]});
}


