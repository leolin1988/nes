import { ownsDepartment } from './access-control.ts';

const fireColumns='id,department_id,inspection_month,responsible_area,implementer_name,entries,manager_disposition,manager_signature,manager_name,status,created_by,updated_by,created_at,updated_at,confirmed_at';

export async function fireDailyAction(body:any,user:any,client:any,reply:any,audit:any){
 const checked=async(q:any)=>{const r=await q;if(r.error)throw r.error;return r.data;};
 const clean=(v:any,n=1000)=>String(v??'').trim().slice(0,n);
 const deptIds=[...new Set((user.departmentIds||[user.dept]).filter(Boolean))];
 if(body.action==='fire_daily_list'){
  let departmentQuery=client.from('departments').select('id,name_zh,name_en,name_es,name_vi').eq('is_active',true).order('sort_order');
  departmentQuery=user.role==='admin'?departmentQuery.eq('in_equipment_directory',true):departmentQuery.in('id',deptIds);
  const departments=await checked(departmentQuery);
  const visibleDeptIds=departments.map((d:any)=>d.id);
  let q=client.from('fire_daily_records').select(fireColumns).order('inspection_month',{ascending:false}).order('updated_at',{ascending:false}).limit(300);
  q=visibleDeptIds.length?q.in('department_id',visibleDeptIds):q.eq('department_id','00000000-0000-0000-0000-000000000000');
  const records=await checked(q);
  return reply({departments,records});
 }
 if(body.action==='fire_daily_save'){
  const record=body.record||{},dept=clean(record.department_id,50),area=clean(record.responsible_area,200),name=clean(record.implementer_name,100),month=clean(record.inspection_month,10);
  if(!ownsDepartment(user,dept))return reply({error:'forbidden'},403);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(record.id||''))||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!area||!name||!Array.isArray(record.entries))return reply({error:'invalid_fire_daily'},400);
  const monthStart=month+'-01',parsed=new Date(monthStart+'T00:00:00Z');if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==monthStart)return reply({error:'invalid_fire_daily'},400);
  const daysInMonth=new Date(parsed.getUTCFullYear(),parsed.getUTCMonth()+1,0).getDate();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const todayMonth=today.slice(0,7),todayDay=today.slice(8,10);
  if(month>todayMonth)return reply({error:'invalid_fire_daily'},400);
  if(record.entries.length!==daysInMonth)return reply({error:'invalid_fire_daily'},400);
  const fields=['fire_use','electrical_wiring','cigarette','shutdown_fire','combustibles'],entries=[];
  for(let i=0;i<record.entries.length;i++){
   const row=record.entries[i];if(Number(row.day)!==i+1)return reply({error:'invalid_fire_daily'},400);
   const entry={day:i+1,note:clean(row.note,1000)};
   for(const field of fields){const value=String(row[field]||'');if(!['','O','V','X'].includes(value))return reply({error:'invalid_fire_daily'},400);entry[field]=value;}
   entries.push(entry);
  }
  const status=record.status==='submitted'?'submitted':'draft';
  if(status==='submitted'){
   const throughDay=month===todayMonth?Number(todayDay):daysInMonth;
   if(entries.slice(0,throughDay).some(row=>fields.some(field=>!row[field])))return reply({error:'fire_daily_incomplete'},400);
  }
  const old=await checked(client.from('fire_daily_records').select(fireColumns).eq('department_id',dept).eq('inspection_month',monthStart).eq('responsible_area',area).maybeSingle());
  if(old&&old.id!==record.id)return reply({error:'fire_daily_exists'},409);
  if(old&&(old.status==='confirmed'||old.status==='submitted'))return reply({error:'fire_daily_locked'},409);
  if(old&&(!record.updated_at||record.updated_at!==old.updated_at))return reply({error:'record_changed'},409);
  const now=new Date().toISOString(),values={department_id:dept,inspection_month:monthStart,responsible_area:area,implementer_name:name,entries,status,updated_by:user.id,updated_at:now};
  const saved=old?await checked(client.from('fire_daily_records').update(values).eq('id',old.id).eq('updated_at',old.updated_at).select(fireColumns)):await checked(client.from('fire_daily_records').insert({id:record.id,...values,created_by:user.id}).select(fireColumns));
  if(!saved?.length)return reply({error:'record_changed'},409);
  await audit(client,user.id,'fire_daily_'+status,saved[0].id,{department_id:dept,inspection_month:monthStart,entry_count:entries.length});
  return reply({record:saved[0]});
 }
 if(body.action==='fire_daily_review'){
  if(!['admin','supervisor'].includes(user.role))return reply({error:'forbidden'},403);
  const id=String(body.id||'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply({error:'invalid_fire_daily'},400);
  const old=await checked(client.from('fire_daily_records').select(fireColumns).eq('id',id).maybeSingle());
  if(!old||!ownsDepartment(user,old.department_id))return reply({error:'forbidden'},403);
  if(old.status!=='submitted'||old.updated_at!==body.updated_at)return reply({error:'record_changed'},409);
  const manager=clean(body.manager_name,100),disposition=clean(body.manager_disposition,2000),signature=clean(body.manager_signature,100);
  if(!manager||!disposition||!signature||!['confirm','return'].includes(body.decision))return reply({error:'fire_daily_review_required'},400);
  const confirmed=body.decision==='confirm',now=new Date().toISOString();
  const saved=await checked(client.from('fire_daily_records').update({manager_name:manager,manager_disposition:disposition,manager_signature:signature,status:confirmed?'confirmed':'draft',updated_by:user.id,updated_at:now,confirmed_at:confirmed?now:null}).eq('id',old.id).eq('updated_at',old.updated_at).select(fireColumns));
  if(!saved?.length)return reply({error:'record_changed'},409);
  await audit(client,user.id,'fire_daily_'+(confirmed?'confirmed':'returned'),old.id,{manager_name:manager});
  return reply({record:saved[0]});
 }
 return null;
}


