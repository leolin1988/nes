import { uuidPattern,inspectionDate } from './inspection-features.ts';
export async function adminDailyNormal(body:any,user:any,client:any,reply:any){
 if(body.action!=='admin_daily_normal')return null;
 if(user.role!=='admin')return reply({error:'forbidden'},403);
 if(body.confirmed!==true||!['day','night'].includes(body.shift)||!String(body.inspector_name||'').trim()||String(body.inspector_name).length>100||['equipment_id','form_id','submission_key','batch_id'].some(k=>!uuidPattern.test(String(body[k]||'')))||!body.form_updated_at)return reply({error:'invalid_batch_entry'},400);
 const dated=inspectionDate(body);
 const {data,error}=await client.rpc('admin_daily_normal_submit',{p_country:body.country_code,p_equipment_id:body.equipment_id,p_form_id:body.form_id,p_form_updated_at:body.form_updated_at,p_account_id:user.id,p_inspector_name:String(body.inspector_name).trim(),p_shift:body.shift,p_inspection_date:dated.date,p_reason:dated.reason,p_submission_key:body.submission_key,p_batch_id:body.batch_id});
 if(error){const known=['forbidden','existing_inspection','invalid_equipment','form_not_assigned','form_changed','invalid_record','invalid_batch_entry'];const code=known.find(k=>error.message?.includes(k));if(code)return reply({error:code},code==='forbidden'?403:409);throw error;}
 return reply({record:{id:data,inspection_date:dated.date,is_backfill:dated.backfill}});
}


