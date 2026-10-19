export const NAV_KEYS=['board','visual','qr03','qr04','craneMonthly','cadre','craneDaily','environment','history','fireDaily','settings','approval','scrap','scrapDetails','cadreManage','craneMonthlyManage','environmentManage','items','maintenance','backfill','assignment','equipmentAdmin','mapping','formExport','accounts','database','dataExport','adminDailyNormal','cadreBulk','companyCalendar','navigation'];
export function validNavigation(config:any){
 if(!config||!Array.isArray(config.sections)||!Array.isArray(config.items)||config.sections.length<3||config.sections.length>8||config.items.length!==NAV_KEYS.length)return false;
 const labels=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['zh','en','es','vi'].includes(k)&&typeof v[k]==='string'&&v[k].length<=120&&!/[<>\u0000-\u001f]/.test(v[k]));
 const sections=config.sections.map((s:any)=>s?.id);
 if(new Set(sections).size!==sections.length||!['field','supervisor','backoffice'].every(s=>sections.includes(s)))return false;
 if(!config.sections.every((s:any)=>typeof s.id==='string'&&/^(field|supervisor|backoffice|custom_[a-z0-9_]{1,30})$/.test(s.id)&&labels(s.label)))return false;
 const keys=new Set();for(const i of config.items){if(!NAV_KEYS.includes(i?.key)||keys.has(i.key)||!sections.includes(i.section)||typeof i.visible!=='boolean'||!labels(i.label)||(i.key==='navigation'&&!i.visible))return false;keys.add(i.key);}return true;
}
export async function navigationSettings(body:any,user:any,client:any,reply:any){
 if(body.action!=='navigation_save')return null;
 if(user.role!=='admin')return reply({error:'forbidden'},403);
 if(!Number.isInteger(body.revision)||body.revision<0||!validNavigation(body.config))return reply({error:'invalid_navigation'},400);
 const r=await client.rpc('save_navigation_settings',{p_country:body.country_code,p_account:user.id,p_revision:body.revision,p_config:body.config});
 if(r.error)return reply({error:r.error.message.includes('record_changed')?'record_changed':'invalid_navigation'},r.error.message.includes('record_changed')?409:400);
 return reply({navigationSettings:r.data});
}


