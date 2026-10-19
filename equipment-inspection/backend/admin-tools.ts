// Invoked after authentication and country scoping; never exports credentials.
export const exportTables:Record<string,string> = {
 scrap_months:'下腳料報廢申請與月明細',
 environment_sources:'環境權責原始工作表與版面',environment_defaults:'環境權責各國原表範本',environment_templates:'環境權責部門項目與廠區圖設定',environment_records:'環境維護查核紀錄',
 crane_monthly_templates:'起重機每月檢查項目與照片設定',
 company_calendars:'公司行事曆設定',company_calendar_days:'公司休假與補班日',calendar_auto_stops:'休假日自動停用紀錄',
 crane_inspection_records:'起重機每日與每月檢點紀錄',cadre_month_templates:'幹部表每月項目設定',
 cadre_daily_records:'幹部日常管理點檢紀錄',departments:'部門資料',equipment_groups:'設備群組',equipments:'設備基本資料',
 inspection_forms:'點檢與保養表單',equipment_form_assignments:'設備表單分配',
 inspection_records:'設備點檢紀錄',maintenance_records:'預防保養紀錄',
 inspection_reference_photos:'參考照片索引',operator_accounts:'使用者帳號',
 audit_logs:'操作紀錄',import_jobs:'匯入紀錄'
};
export async function adminTools(body:any,user:any,client:any,reply:any,audit:any){
 if(!['admin_export','admin_export_tables','admin_department_create'].includes(body.action))return null;
 if(user.role!=='admin')return reply({error:'forbidden'},403);
 if(body.action==='admin_department_create'){
  const name=String(body.name||'').trim();if(!name||name.length>100)return reply({error:'invalid_department'},400);
  const old=await client.from('departments').select('id').eq('name_zh',name).maybeSingle();if(old.error)throw old.error;
  if(old.data){const r=await client.from('departments').update({is_active:true,in_equipment_directory:true}).eq('id',old.data.id).select('id,name_zh').single();if(r.error)throw r.error;return reply({department:r.data});}
  const r=await client.from('departments').insert({code:'dept_'+crypto.randomUUID().replaceAll('-','').slice(0,20),name_zh:name,is_active:true,in_equipment_directory:true}).select('id,name_zh').single();if(r.error)throw r.error;
  await audit(client,user.id,'department_create',r.data.id,{name});return reply({department:r.data},201);
 }
 if(body.action==='admin_export_tables')return reply({tables:Object.entries(exportTables).map(([id,name])=>({id,name}))});
 const table=String(body.table||'');if(!Object.hasOwn(exportTables,table))return reply({error:'invalid_export_table'},400);
 const offset=Number(body.offset??0);if(!Number.isSafeInteger(offset)||offset<0)return reply({error:'invalid_export_page'},400);
 const columns=table==='operator_accounts'?'id,account_code,full_name,department_id,role,is_active,must_change_password,primary_lang,secondary_lang,country_code,created_at':'*';
 let query=client.from(table).select(columns,{count:'exact'});
 query=table==='equipment_form_assignments'?query.order('equipment_id').order('kind'):table==='environment_defaults'?query.order('country_code'):table==='environment_sources'?query.order('country_code').order('source_key'):table==='environment_templates'?query.order('department_id'):query.order('id');
 const r=await query.range(offset,offset+499);
 if(r.error)throw r.error;
 if(offset===0)await audit(client,user.id,'data_export',null,{table});
 return reply({rows:r.data||[],total:r.count,offset,next_offset:offset+(r.data?.length||0)<r.count?offset+(r.data?.length||0):null});
}


