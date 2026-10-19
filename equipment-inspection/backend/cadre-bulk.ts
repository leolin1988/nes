// Administrator entry and approval are separate operations.
export function cadreEntryable(r:any){
 return !r.confirmed_at&&Array.isArray(r.template_snapshot)&&r.template_snapshot.length>0&&Array.isArray(r.results)&&r.results.length===r.template_snapshot.length&&r.results.every((v:any,i:number)=>String(v.id)===String(r.template_snapshot[i].id)&&['','V','Φ','N/A'].includes(v.value))&&(r.results.some((v:any)=>!v.value)||!String(r.duty_name||'').trim());
}
export function cadreReviewable(r:any){
 return !r.confirmed_at&&!!String(r.duty_name||'').trim()&&Array.isArray(r.results)&&r.results.length>0&&Array.isArray(r.template_snapshot)&&r.results.length===r.template_snapshot.length&&r.results.every((v:any,i:number)=>String(v.id)===String(r.template_snapshot[i].id)&&['V','Φ','N/A'].includes(v.value));
}
export async function cadreBulk(body:any,user:any,client:any,reply:any){
 if(!['cadre_bulk_list','cadre_bulk_confirm','cadre_bulk_entry'].includes(body.action))return null;
 if(user.role!=='admin')return reply({error:'forbidden'},403);
 const checked=async(q:any)=>{const r=await q;if(r.error)throw r.error;return r.data;};
 if(body.action==='cadre_bulk_list'){
  const start=String(body.start||''),end=String(body.end||'');
  const valid=(s:string)=>/^20\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  if(!valid(start)||!valid(end)||end<start||(Date.parse(end)-Date.parse(start))/86400000>366)return reply({error:'invalid_date'},400);
  const departments=await checked(client.from('departments').select('id,name_zh,name_en,name_es,name_vi').eq('is_active',true).order('sort_order'));
  if(body.department_id&&!departments.some((d:any)=>d.id===body.department_id))return reply({error:'invalid_department'},400);
  const records=[];for(let offset=0;;offset+=500){
   let q=client.from('cadre_daily_records').select('*').gte('inspection_date',start).lte('inspection_date',end).order('inspection_date').order('id').range(offset,offset+499);
   if(body.department_id)q=q.eq('department_id',body.department_id);
   const page=await checked(q);records.push(...page);if(page.length<500)break;
  }
  if(body.mode==='entry'){
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(new Date());if(end>today)return reply({error:'invalid_date'},400);
   const selected=departments.filter((d:any)=>!body.department_id||d.id===body.department_id);
   const templates=await checked(client.from('cadre_month_templates').select('department_id,month_date,items,revision').gte('month_date',start.slice(0,7)+'-01').lte('month_date',end.slice(0,7)+'-01'));
   const defaults=await checked(client.rpc('cadre_default_items'));
   const byDay=new Map(records.map((r:any)=>[r.department_id+':'+r.inspection_date,r]));const slots=[];
   for(let day=new Date(start+'T00:00:00Z');day.toISOString().slice(0,10)<=end;day.setUTCDate(day.getUTCDate()+1))for(const d of selected){
    const date=day.toISOString().slice(0,10),existing:any=byDay.get(d.id+':'+date),template=templates.find((t:any)=>t.department_id===d.id&&t.month_date===date.slice(0,7)+'-01');
    const items=existing?.template_snapshot||template?.items||defaults;
    const r=existing||{department_id:d.id,inspection_date:date,revision:0,results:items.map((i:any)=>({id:i.id,value:'',note:''})),template_snapshot:items,duty_name:'',confirmed_at:null};
    slots.push({id:r.id,department_id:d.id,inspection_date:date,revision:r.revision,template_revision:template?.revision||0,duty_name:r.duty_name,eligible:cadreEntryable(r)});
   }
   return reply({departments,records:slots});
  }
  return reply({departments,records:records.filter((r:any)=>departments.some((d:any)=>d.id===r.department_id)).map((r:any)=>({...r,eligible:cadreReviewable(r)}))});
 }
 if(body.action==='cadre_bulk_entry'){
  const day=String(body.inspection_date||''),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(new Date());
  if(body.inspection_confirmed!==true||typeof body.duty_name!=='string'||!body.duty_name.trim()||body.duty_name.trim().length>100||!Number.isSafeInteger(body.revision)||!Number.isSafeInteger(body.template_revision)||!/^20\d{2}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day||day>today)return reply({error:'invalid_cadre_record'},400);
  const d=await checked(client.from('departments').select('id').eq('id',body.department_id).eq('is_active',true).maybeSingle());if(!d)return reply({error:'invalid_department'},400);
  const old=await checked(client.from('cadre_daily_records').select('*').eq('department_id',d.id).eq('inspection_date',day).maybeSingle());
  if((old?.revision||0)!==body.revision)return reply({error:'record_changed'},409);
  const template=await checked(client.from('cadre_month_templates').select('items,revision').eq('department_id',d.id).eq('month_date',day.slice(0,7)+'-01').maybeSingle());
  if(!old&&(template?.revision||0)!==body.template_revision)return reply({error:'record_changed'},409);
  const items=old?.template_snapshot||template?.items||await checked(client.rpc('cadre_default_items'));
  const r=old||{template_snapshot:items,results:items.map((i:any)=>({id:i.id,value:'',note:''})),duty_name:''};
  if(!cadreEntryable(r))return reply({error:'not_qualified'},409);
  const saved=await client.rpc('save_cadre_daily_v2',{p_country:body.country_code,p_department:d.id,p_date:day,p_account:user.id,p_revision:body.revision,p_results:r.results.map((v:any)=>({...v,value:v.value||'V'})),p_duty:r.duty_name?.trim()||body.duty_name.trim(),p_supervisor:'',p_confirm:false,p_template_revision:body.template_revision});
  if(saved.error){if(saved.error.message?.includes('record_changed'))return reply({error:'record_changed'},409);throw saved.error;}
  return reply({record:saved.data});
 }
 if(!body.review_confirmed||typeof body.reviewer_name!=='string'||!body.reviewer_name.trim()||body.reviewer_name.trim().length>100||!Number.isSafeInteger(body.revision))return reply({error:'review_required'},400);
 const r=await checked(client.from('cadre_daily_records').select('*').eq('id',body.id).maybeSingle());
 if(!r||r.revision!==body.revision)return reply({error:'record_changed'},409);
 if(!cadreReviewable(r))return reply({error:'not_qualified'},409);
 const saved=await client.rpc('save_cadre_daily_v2',{p_country:body.country_code,p_department:r.department_id,p_date:r.inspection_date,p_account:user.id,p_revision:r.revision,p_results:r.results,p_duty:r.duty_name,p_supervisor:body.reviewer_name.trim(),p_confirm:true,p_template_revision:0});
 if(saved.error){if(saved.error.message?.includes('record_changed'))return reply({error:'record_changed'},409);throw saved.error;}
 return reply({record:saved.data});
}


