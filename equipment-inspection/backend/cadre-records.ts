import { ownsDepartment } from './access-control.ts';
import { uuidPattern } from './inspection-features.ts';
import { cadreBulk } from './cadre-bulk.ts';
export async function cadreRecords(body:any,user:any,client:any,reply:any){
 const bulk=await cadreBulk(body,user,client,reply);if(bulk)return bulk;
 if(!['cadre_month','cadre_save','cadre_template_save'].includes(body.action))return null;
 if(body.action!=='cadre_month'&&!['admin','supervisor'].includes(user.role))return reply({error:'forbidden'},403);
 const dept=String(body.department_id||'');
 if(!uuidPattern.test(dept))return reply({error:'invalid_department'},400);
 if(!ownsDepartment(user,dept))return reply({error:'forbidden'},403);
 const d=await client.from('departments').select('id').eq('id',dept).eq('is_active',true).maybeSingle();
 if(d.error)throw d.error;if(!d.data)return reply({error:'invalid_department'},400);
 if(body.action==='cadre_month'){
  const month=String(body.month||'');
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return reply({error:'invalid_month'},400);
  const date=new Date(month+'-01T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+1);
  const r=await client.from('cadre_daily_records').select('*').eq('department_id',dept).gte('inspection_date',month+'-01').lt('inspection_date',date.toISOString().slice(0,10)).order('inspection_date');
  const template=await client.from('cadre_month_templates').select('items,revision').eq('department_id',dept).eq('month_date',month+'-01').maybeSingle();
  if(r.error)throw r.error;if(template.error)throw template.error;return reply({records:r.data||[],template:template.data});
 }
 if(body.action==='cadre_template_save'){
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(body.month||''))||!Number.isSafeInteger(body.revision)||body.revision<0)return reply({error:'invalid_template'},400);
  const r=await client.rpc('save_cadre_template',{p_country:body.country_code,p_department:dept,p_month:body.month+'-01',p_account:user.id,p_revision:body.revision,p_items:body.items});
  if(r.error){const code=['forbidden','record_changed','invalid_template','cannot_remove_items'].find(c=>r.error.message?.includes(c));if(code)return reply({error:code},code==='forbidden'?403:code==='record_changed'?409:400);throw r.error;}
  return reply({template:r.data});
 }
 const day=String(body.inspection_date||'');
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day||!Number.isSafeInteger(body.revision)||body.revision<0||typeof body.confirmed!=='boolean'||typeof body.duty_name!=='string'||typeof body.supervisor_name!=='string'||body.template_version!=='QR18-13-D-monthly-v1')return reply({error:'invalid_cadre_record'},400);
 if(!Number.isSafeInteger(body.template_revision)||body.template_revision<0)return reply({error:'record_changed'},409);
 const r=await client.rpc('save_cadre_daily_v2',{p_country:body.country_code,p_department:dept,p_date:day,p_account:user.id,p_revision:body.revision,p_results:body.results,p_duty:body.duty_name,p_supervisor:body.supervisor_name,p_confirm:body.confirmed,p_template_revision:body.template_revision});
 if(r.error){const code=['forbidden','invalid_department','invalid_cadre_record','record_changed','improvement_requires_issue','confirmation_incomplete'].find(c=>r.error.message?.includes(c));if(code)return reply({error:code},code==='forbidden'?403:code==='record_changed'?409:400);throw r.error;}
 return reply({record:r.data});
}


