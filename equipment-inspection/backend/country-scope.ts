// Scope every business-table operation, including writes and conflict targets.
export const COUNTRIES = ['TW','VM','MX'];
const tables = new Set(['fire_attachment_records','scrap_shared_quotes','scrap_department_merges','scrap_months','environment_sources','environment_defaults','environment_templates','environment_records','access_groups','access_group_members','account_access_policies','navigation_settings','crane_monthly_templates','company_calendars','company_calendar_days','calendar_auto_stops','crane_inspection_records','cadre_month_templates','cadre_daily_records','fire_daily_records','departments','equipment_groups','equipments','inspection_forms','equipment_form_assignments','inspection_records','maintenance_records','inspection_reference_photos','operator_accounts','audit_logs','import_jobs','preventive_maintenance_plans','preventive_maintenance_records','inspection_templates','inspection_record_details','inspection_templates_library','inspection_template_revisions','supervisor_approvals','operator_sessions']);
export function countryClient(base:any, country:string) {
 if(!COUNTRIES.includes(country))throw Error('country_required');
 return new Proxy(base,{get(target,key){
  if(key!=='from'){const v=target[key];return typeof v==='function'?v.bind(target):v;}
  return (table:string)=>{
   if(!tables.has(table))throw Error('unscoped_table');
   const builder=target.from(table);
   return new Proxy(builder,{get(q,method){
    if(['select','update','delete','insert','upsert'].includes(String(method)))return (...args:any[])=>{
     if(['insert','upsert','update'].includes(String(method))){
      const stamp=(row:any)=>{if(row.country_code&&row.country_code!==country)throw Error('country_mismatch');return {...row,country_code:country};};
      args[0]=Array.isArray(args[0])?args[0].map(stamp):stamp(args[0]);
     }
     if(method==='upsert'&&['equipment_code','content_key'].includes(args[1]?.onConflict))args[1]={...args[1],onConflict:'country_code,'+args[1].onConflict};
     const result=q[method](...args);
     return ['select','update','delete'].includes(String(method))?result.eq('country_code',country):result;
    };
    const v=q[method];return typeof v==='function'?v.bind(q):v;
   }});
  };
 }});
}



