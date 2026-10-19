export function ownsDepartment(user:any,id:string){return user.role==='admin'||(user.departmentIds?user.departmentIds.includes(id):user.dept===id);}
export function canAccess(user:any,department:string,resource:string,action='view'){
 if(user.role==='admin')return true;
 if(!user.access?.managed)return department===user.dept;
 return user.access.grants.some((g:any)=>g.department_id===department&&g.resource===resource&&g.actions.includes(action));
}
export function requireAccess(user:any,department:string,resource:string,action='view'){if(!canAccess(user,department,resource,action))throw Error('forbidden');}
const checked=async(q:any)=>{const r=await q;if(r.error)throw r.error;return r.data;};
export async function loadAccess(user:any,country:string,client:any){
 const policy=await checked(client.from('account_access_policies').select('managed,revision').eq('account_id',user.id).maybeSingle());
 const access:any={managed:user.role!=='admin'&&policy?.managed===true,grants:[]};
 if(access.managed&&user.role==='supervisor'){
  const memberships=await checked(client.from('access_group_members').select('group_id').eq('account_id',user.id));
  const ids=memberships.map((m:any)=>m.group_id);
  const groups=ids.length?await checked(client.from('access_groups').select('department_ids,permissions').in('id',ids).eq('is_active',true)):[];
  for(const g of groups)for(const dept of g.department_ids)for(const [resource,values]of Object.entries(g.permissions) as any){if(values.view!==true)continue;let grant=access.grants.find((x:any)=>x.department_id===dept&&x.resource===resource);if(!grant){grant={department_id:dept,resource,actions:[]};access.grants.push(grant);}for(const [a,v]of Object.entries(values))if(v===true&&!grant.actions.includes(a))grant.actions.push(a);}
 }
 user.access=access;user.departmentIds=access.managed?[...new Set(access.grants.map((g:any)=>g.department_id))]:[user.dept];
 const departments=await checked(client.from('departments').select('id,name_zh').eq('is_active',true));
 user.departmentNames=departments.filter((d:any)=>ownsDepartment(user,d.id)).map((d:any)=>d.name_zh);
 return access;
}
export async function accessAdministration(body:any,user:any,client:any,base:any,reply:any){
 if(!['access_admin_get','access_group_save','access_group_delete','access_membership_save'].includes(body.action))return null;
 if(user.role!=='admin')return reply({error:'forbidden'},403);
 if(body.action==='access_admin_get'){
  const [groups,members,policies,resources,accounts,departments]=await Promise.all([
   checked(client.from('access_groups').select('*').order('name')),checked(client.from('access_group_members').select('group_id,account_id')),checked(client.from('account_access_policies').select('account_id,managed,revision')),
   checked(base.from('access_resources').select('*').order('sort_order')),checked(client.from('operator_accounts').select('id,account_code,full_name,department_id,role,is_active').eq('role','supervisor').eq('is_active',true).order('account_code')),checked(client.from('departments').select('id,name_zh,name_en,name_es,name_vi').eq('is_active',true).eq('in_equipment_directory',true).order('sort_order'))]);
  return reply({groups,members,policies,resources,accounts,departments,limit:20});
 }
 const groupArgs={p_country:body.country_code,p_actor:user.id,p_id:body.id||null,p_revision:body.revision};
 const r=body.action==='access_group_save'?await client.rpc('save_access_group',{...groupArgs,p_name:body.name,p_departments:body.department_ids,p_permissions:body.permissions,p_active:body.is_active}):body.action==='access_group_delete'?await client.rpc('delete_access_group',groupArgs):await client.rpc('save_access_memberships',{p_country:body.country_code,p_actor:user.id,p_account:body.account_id,p_revision:body.revision,p_groups:body.group_ids,p_managed:body.managed});
 if(r.error){const code=['record_changed','group_limit','group_in_use','view_required','invalid_membership','invalid_permissions','invalid_access_group','forbidden'].find(k=>r.error.message.includes(k))||(r.error.code==='23505'?'duplicate_group':'invalid_permissions');return reply({error:code},code==='forbidden'?403:['record_changed','group_limit','group_in_use','duplicate_group'].includes(code)?409:400);}
 return reply({success:true,result:r.data});
}
// Resolve targets from stored rows, never from a claimed department on the request.
export async function authorizeAccess(body:any,user:any,client:any){
 if(user.role==='admin'||!user.access.managed)return;
 const find=async(table:string,id:string,fields='*')=>checked(client.from(table).select(fields).eq('id',id).maybeSingle());
 const eq=async(id:string)=>{const e=await find('equipments',id,'id,department_id');if(!e)throw Error('forbidden');return e.department_id;};
 const deptByName=async(name:string)=>{const d=await checked(client.from('departments').select('id').eq('name_zh',name).maybeSingle());if(!d)throw Error('forbidden');return d.id;};
 const form=async(f:any,action:string)=>{if(!f)throw Error('forbidden');requireAccess(user,await deptByName(f.department),f.kind==='maintenance'?'maintenance_settings':'daily_settings',action);};
 const a=body.action;
 if(a==='workspace')return;
 if(['scrap_get','scrap_save','scrap_quotes_get','scrap_quotes_save'].includes(a))return; // The modules and transactional RPCs enforce grants.
 if(['environment_get','environment_template_save','environment_record_save','environment_photo_upload','environment_photo_get'].includes(a))return; // The environment module resolves the stored template/record and enforces department-specific grants.
 if(a==='record_save'){const dept=await eq(body.equipment_id);const old=await checked(client.from('inspection_records').select('id').eq('equipment_id',body.equipment_id).eq('inspection_date',body.inspection_date||new Date().toISOString().slice(0,10)).limit(1));requireAccess(user,dept,'daily',old?.length?'edit':'create');return;}
 if(a==='record_approve'){const r=await find('inspection_records',body.id,'equipment_id');if(!r)throw Error('forbidden');requireAccess(user,await eq(r.equipment_id),'daily','approve');return;}
 if(a==='maintenance_save'){const dept=await eq(body.equipment_id),old=await find('maintenance_records',body.id,'equipment_id');requireAccess(user,dept,'maintenance',old?'edit':'create');if(old&&old.equipment_id!==body.equipment_id)throw Error('forbidden');if(body.status==='confirmed')requireAccess(user,dept,'maintenance','approve');return;}
 if(['crane_month','crane_save','crane_template_get','crane_template_save','crane_photo_get'].includes(a)){
  const dept=await eq(body.equipment_id),resource=a.startsWith('crane_template')?'crane_settings':a==='crane_photo_get'?(body.preview===true?'crane_settings':'crane_monthly'):body.kind==='daily'?'crane_daily':'crane_monthly';
  if(!(a==='crane_photo_get'&&!body.crane_record_id&&canAccess(user,dept,'crane_settings','view')))requireAccess(user,dept,resource,a==='crane_template_save'?(body.revision>0?'edit':'create'):a==='crane_save'?(body.revision>0?'edit':'create'):'view');if(a==='crane_save'&&body.confirmed)requireAccess(user,dept,resource,'approve');return;
 }
 if(['cadre_month','cadre_save','cadre_template_save'].includes(a)){requireAccess(user,body.department_id,a==='cadre_template_save'?'cadre_settings':'cadre',a==='cadre_month'?'view':body.revision>0?'edit':'create');if(a==='cadre_save'&&body.confirmed)requireAccess(user,body.department_id,'cadre','approve');return;}
 if(['equipment_save','equipment_remove','equipment_restore','equipment_set_active'].includes(a)){if(body.id)requireAccess(user,await eq(body.id),'equipment',a==='equipment_remove'?'delete':'edit');if(a==='equipment_save')requireAccess(user,body.department_id,'equipment',body.id?'edit':'create');return;}
 if(a==='equipment_mapping_import'){if(!Array.isArray(body.rows)||!body.rows.length)throw Error('forbidden');for(const row of body.rows){const d=await deptByName(String(row.department||'').trim());const old=await checked(client.from('equipments').select('department_id').eq('equipment_code',String(row.equipment_code||'').trim()).maybeSingle());requireAccess(user,d,'equipment',old?'edit':'create');if(old)requireAccess(user,old.department_id,'equipment','edit');}return;}
 if(['assignment_save','assignment_remove'].includes(a)){if(!Array.isArray(body.equipment_ids)||!body.equipment_ids.length)throw Error('forbidden');for(const id of [...new Set(body.equipment_ids)]){const d=await eq(String(id));const old=await checked(client.from('equipment_form_assignments').select('kind').eq('equipment_id',id).limit(1));requireAccess(user,d,'assignment',a==='assignment_remove'?'delete':old?.length?'edit':'create');}return;}
 if(a==='form_delete'){await form(await find('inspection_forms',body.id),'delete');return;}
 if(['forms_import','form_save'].includes(a)){const rows=a==='form_save'?[body.form]:body.forms;if(!Array.isArray(rows)||!rows.length)throw Error('forbidden');for(const f of rows){let old=null;if(f.id&&a==='form_save')old=await find('inspection_forms',f.id);else{let name=String(f.form_name||f.source_sheet||f.equipment_name||'form').trim().replace(/[\\/:*?"<>|]/g,'_').slice(0,180);if(!/\.csv$/i.test(name))name+='.csv';old=await checked(client.from('inspection_forms').select('id,kind,department').eq('form_name',name).eq('department',f.department).eq('kind',f.kind).maybeSingle());}if(old)await form(old,'edit');await form(f,old?'edit':'create');}return;}
 if(a==='reference_photo_upload'){if(!user.access.grants.some((g:any)=>['daily_settings','maintenance_settings','crane_settings'].includes(g.resource)&&g.actions.some((x:string)=>['create','edit'].includes(x))))throw Error('forbidden');return;}
 if(a==='reference_photo_get'){
  if(body.record_id){const r=await find('inspection_records',body.record_id,'equipment_id');if(!r)throw Error('forbidden');requireAccess(user,await eq(r.equipment_id),'daily','view');return;}
  if(body.form_id){const f=await find('inspection_forms',body.form_id);if(!f)throw Error('forbidden');const settings=f.kind==='maintenance'?'maintenance_settings':'daily_settings',record=f.kind==='maintenance'?'maintenance':'daily';let permitted=f.department&&canAccess(user,await deptByName(f.department),settings,'view');const assigned=await checked(client.from('equipment_form_assignments').select('equipment_id').eq('form_id',f.id));for(const row of assigned)if(canAccess(user,await eq(row.equipment_id),record,'view'))permitted=true;if(!permitted)throw Error('forbidden');return;}
  const p=await find('inspection_reference_photos',body.photo_id,'uploaded_by');if(p?.uploaded_by===user.id&&user.access.grants.some((g:any)=>g.actions.includes('view')))return;throw Error('forbidden');
 }
 // Older read APIs have no consumer in the current app; don't let them bypass the workspace filters.
 throw Error('forbidden');
}


