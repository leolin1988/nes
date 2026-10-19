import { ownsDepartment } from './access-control.ts';
import { uuidPattern } from './inspection-features.ts';
export async function craneRecords(body:any,user:any,client:any,reply:any){
 if(!['crane_month','crane_save'].includes(body.action))return null;
 const id=String(body.equipment_id||''),kind=String(body.kind||'');
 if(!uuidPattern.test(id)||!['daily','monthly'].includes(kind))return reply({error:'invalid_crane'},400);
 const eq=await client.from('equipments').select('id,department_id,machine_no,name_zh,archived_at,equipment_groups(name_zh)').eq('id',id).maybeSingle();
 if(eq.error)throw eq.error;
 if(!eq.data||!ownsDepartment(user,eq.data.department_id))return reply({error:'forbidden'},403);
 if(eq.data.archived_at||!eq.data.machine_no||!/天車|起重機/.test(eq.data.name_zh+' '+(eq.data.equipment_groups?.name_zh||'')))return reply({error:'invalid_crane'},400);
 if(body.action==='crane_month'){
  const month=String(body.month||'');if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return reply({error:'invalid_month'},400);
  const date=new Date(month+'-01T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+1);
  const r=await client.from('crane_inspection_records').select('*').eq('equipment_id',id).eq('department_id',eq.data.department_id).eq('kind',kind).gte('period_date',month+'-01').lt('period_date',date.toISOString().slice(0,10)).order('period_date');
  if(r.error)throw r.error;const t=kind==='monthly'?await client.from('crane_monthly_templates').select('items,revision').eq('equipment_id',id).maybeSingle():{data:null};if(t.error)throw t.error;return reply({records:r.data||[],template:t.data});
 }
 const day=String(body.inspection_date||'');
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day||!Number.isSafeInteger(body.revision)||body.revision<0||typeof body.completed!=='boolean'||typeof body.confirmed!=='boolean')return reply({error:'invalid_crane_record'},400);
 const r=await client.rpc('save_crane_record_v2',{p_country:body.country_code,p_account:user.id,p_equipment:id,p_kind:kind,p_date:day,p_revision:body.revision,p_results:body.results,p_details:body.details,p_inspector:body.inspector_name,p_leader:body.leader_name,p_supervisor:body.supervisor_name,p_completed:body.completed,p_confirm:body.confirmed,p_template_revision:body.template_revision??0});
 if(r.error){const code=['template_changed','forbidden','invalid_crane','invalid_crane_record','record_changed','equipment_changed','confirmation_incomplete'].find(x=>r.error.message?.includes(x));if(code)return reply({error:code},code==='forbidden'?403:['record_changed','template_changed'].includes(code)?409:400);throw r.error;}
 return reply({record:r.data});
}


