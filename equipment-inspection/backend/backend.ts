import { canonicalDepartmentName } from './department-names.ts';
import { validAccountSession, resetPassword } from './account-security.ts';
import { scrapRecords } from './scrap-records.ts';
import { scrapQuotes } from './scrap-quotes.ts';
import { environmentRecords } from './environment-records.ts';
import { loadAccess, accessAdministration, authorizeAccess, canAccess, requireAccess, ownsDepartment } from './access-control.ts';
import { navigationSettings } from './navigation-settings.ts';
import { craneTemplates } from './crane-templates.ts';
import { companyCalendar } from './company-calendar.ts';
import { cadreRecords } from './cadre-records.ts';
import { craneRecords } from './crane-records.ts';
import { adminDailyNormal } from './admin-daily-normal.ts';
import { adminTools } from './admin-tools.ts';
import { COUNTRIES, countryClient } from './country-scope.ts';
import { managementAction } from './management-features.ts';
import { PHOTO_BUCKET, uuidPattern, inspectionDate, decodePhoto, preservePhotos } from './inspection-features.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';
import { SignJWT, jwtVerify } from 'https://deno.land/x/jose@v5.2.4/index.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const key = new TextEncoder().encode(service);
const allowedOrigins = new Set([
  'http://127.0.0.1:4173',
  'https://equipment-inspection-demo-20261001.s0981975027.chatgpt.site',
  'https://inspection.nes.com',
  'https://raphael.tsotsotech.com',
]);
function headers(request: Request) {
  const origin = request.headers.get('origin') || '';
  return { 'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://equipment-inspection-demo-20261001.s0981975027.chatgpt.site', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS', Vary: 'Origin' };
}
const db = () => createClient(url, service);
const out = (request: Request, body: unknown, status = 200) => Response.json(body, { status, headers: headers(request) });
async function me(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('auth');
  const { payload } = await jwtVerify(token, key);
  const {data:account}=await db().from('operator_accounts').select('id,account_code,full_name,department_id,role,is_active,auth_version').eq('id',String(payload.sub)).single(); if(!validAccountSession(payload,account))throw new Error('auth'); return {id:account.id,account_code:account.account_code,full_name:account.full_name||'',dept:account.department_id,role:account.role};
}
function requireAdmin(user: { role: string }) { if (user.role !== 'admin') throw new Error('forbidden'); }
async function audit(client: ReturnType<typeof db>, accountId: string, action: string, entityId: string | null, payload: unknown, entityType = 'operator_account') {
  await client.from('audit_logs').insert({ account_id: accountId, action, entity_type: entityType, entity_id: entityId, payload });
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('', { headers: headers(request) });
  try {
    const body = await request.json();
    let client = db();
    if (body.action === 'login') {
      const accountCode = String(body.account_code || '').trim();
      const password = String(body.password || '');
      const { data: account, error } = await client.from('operator_accounts').select('id,account_code,full_name,department_id,role,password_hash,must_change_password,is_active,auth_version').eq('account_code', accountCode).single();
      if (error || !account || !account.is_active || !bcrypt.compareSync(password, account.password_hash)) return out(request, { error: 'Invalid credentials' }, 401);
      const { data: department } = await client.from('departments').select('name_zh').eq('id', account.department_id).single();
      const token = await new SignJWT({ auth_version:account.auth_version, dept: account.department_id, role: account.role, department: department?.name_zh || '', change_required: account.must_change_password }).setProtectedHeader({ alg: 'HS256' }).setSubject(account.id).setIssuedAt().setExpirationTime('8h').sign(key);
      return out(request, { token, profile: { account_id: account.id, account_code: account.account_code, full_name: account.full_name||'', department_id: account.department_id, department: department?.name_zh || '', role: account.role, must_change_password: account.must_change_password } });
    }
    const user:any = await me(request);
    if(body.action==='session')return out(request,{profile:{role:user.role,department_id:user.dept,account_id:user.id,account_code:user.account_code,full_name:user.full_name},countries:COUNTRIES});
    const country=String(body.country_code||'');
    if(!COUNTRIES.includes(country))return out(request,{error:'country_required'},400);
    if(user.role!=='admin'){
      const home=await client.from('departments').select('country_code').eq('id',user.dept).maybeSingle();
      if(home.error)throw home.error;
      if(home.data?.country_code!==country){
        if(body.action==='workspace')return out(request,{departments:[],equipment:[],groups:[],forms:[],records:[],assignments:[],maintenanceRecords:[],profile:{role:user.role,department_id:user.dept,account_id:user.id,account_code:user.account_code,full_name:user.full_name}});
        return out(request,{error:'forbidden'},403);
      }
    }
    client=countryClient(client,country);
    await loadAccess(user,country,client);
    const accessResult=await accessAdministration(body,user,client,db(),(v:any,status=200)=>out(request,v,status));if(accessResult)return accessResult;
    await authorizeAccess(body,user,client);
    if(body.action==='record_save'&&body.submission_key){
      const prior=await db().from('inspection_records').select('country_code').eq('submission_key',body.submission_key).maybeSingle();
      if(prior.error)throw prior.error;
      if(prior.data&&prior.data.country_code!==country)return out(request,{error:'country_mismatch'},403);
    }
    const quoteResult=await scrapQuotes(body,user,client,(v:any,status=200)=>out(request,v,status));if(quoteResult)return quoteResult;
    const scrapResult=await scrapRecords(body,user,client,(v:any,status=200)=>out(request,v,status));if(scrapResult)return scrapResult;
    const environmentResult=await environmentRecords(body,user,client,(v:any,status=200)=>out(request,v,status));if(environmentResult)return environmentResult;
    const navigationResult=await navigationSettings(body,user,client,(v:any,status=200)=>out(request,v,status));if(navigationResult)return navigationResult;
    const calendarResult=await companyCalendar(body,user,client,(v:any,status=200)=>out(request,v,status));if(calendarResult)return calendarResult;
    const templateResult=await craneTemplates(body,user,client,(v:any,status=200)=>out(request,v,status));if(templateResult)return templateResult;
    const craneResult=await craneRecords(body,user,client,(v:any,status=200)=>out(request,v,status));if(craneResult)return craneResult;
    const cadreResult=await cadreRecords(body,user,client,(v:any,status=200)=>out(request,v,status));if(cadreResult)return cadreResult;
    const normalResult=await adminDailyNormal(body,user,client,(v:any,status=200)=>out(request,v,status));if(normalResult)return normalResult;
    const adminResult=await adminTools(body,user,client,(v:any,status=200)=>out(request,v,status),audit);if(adminResult)return adminResult;
    if(body.action==='admin_reference_photo_export_list'){
      requireAdmin(user);
      const photos:any[]=[];
      for(let offset=0;;offset+=500){
        const result=await client.from('inspection_reference_photos').select('id,original_name,mime_type,size_bytes,created_at,uploaded_by').order('created_at').range(offset,offset+499);
        if(result.error)throw result.error;
        photos.push(...(result.data||[]));
        if((result.data||[]).length<500)break;
      }
      const departmentsResult=await client.from('departments').select('id,name_zh,name_en,name_es,name_vi,country_code').eq('country_code',country);
      if(departmentsResult.error)throw departmentsResult.error;
      const departmentById=new Map((departmentsResult.data||[]).map((d:any)=>[d.id,d]));
      const departmentByName=new Map((departmentsResult.data||[]).map((d:any)=>[canonicalDepartmentName(d.name_zh),d]));
      const photoIds=new Set(photos.map((p:any)=>p.id));
      const departmentsByPhoto=new Map<string,Set<string>>();
      const addPhotoDepartment=(photoId:any,departmentId:any)=>{
        const id=String(photoId||''),deptId=String(departmentId||'');
        if(!photoIds.has(id)||!departmentById.has(deptId))return;
        if(!departmentsByPhoto.has(id))departmentsByPhoto.set(id,new Set());
        departmentsByPhoto.get(id)!.add(deptId);
      };
      for(let offset=0;;offset+=500){
        const result=await client.from('inspection_forms').select('department,items').eq('country_code',country).range(offset,offset+499);
        if(result.error)throw result.error;
        for(const form of result.data||[]){
          const department=departmentByName.get(canonicalDepartmentName(form.department));
          if(!department||!Array.isArray(form.items))continue;
          for(const item of form.items)addPhotoDepartment(item?.reference_photo_id,department.id);
        }
        if((result.data||[]).length<500)break;
      }
      for(let offset=0;;offset+=500){
        const result=await client.from('crane_monthly_templates').select('department_id,items').eq('country_code',country).range(offset,offset+499);
        if(result.error)throw result.error;
        for(const template of result.data||[]){
          if(!Array.isArray(template.items))continue;
          for(const item of template.items)addPhotoDepartment(item?.reference_photo_id,template.department_id);
        }
        if((result.data||[]).length<500)break;
      }
      for(const table of ['environment_templates','environment_records']){
        for(let offset=0;;offset+=500){
          const result=await client.from(table).select('department_id,map_photo_id').eq('country_code',country).range(offset,offset+499);
          if(result.error)throw result.error;
          for(const record of result.data||[])addPhotoDepartment(record.map_photo_id,record.department_id);
          if((result.data||[]).length<500)break;
        }
      }
      return out(request,{photos:photos.map((p:any)=>{
        const related=[...(departmentsByPhoto.get(p.id)||[])].map((id:string)=>departmentById.get(id)).filter(Boolean);
        if(related.length===1){
          const department=related[0];
          return {id:p.id,original_name:p.original_name,mime_type:p.mime_type,size_bytes:p.size_bytes,created_at:p.created_at,department_id:department.id,department:{zh:department.name_zh,en:department.name_en||department.name_zh,es:department.name_es||department.name_zh,vi:department.name_vi||department.name_zh}};
        }
        if(related.length>1)return {id:p.id,original_name:p.original_name,mime_type:p.mime_type,size_bytes:p.size_bytes,created_at:p.created_at,department_id:'__shared__',department:{zh:'多部門共用',en:'Shared across departments',es:'Compartida entre departamentos',vi:'Dùng chung giữa các bộ phận'}};
        return {id:p.id,original_name:p.original_name,mime_type:p.mime_type,size_bytes:p.size_bytes,created_at:p.created_at,department_id:null,department:{zh:'待確認部門',en:'Department review needed',es:'Departamento por confirmar',vi:'Cần xác nhận bộ phận'}};
      })});
    }
    if(body.action==='admin_reference_photo_export_urls'){
      requireAdmin(user);
      const ids=Array.isArray(body.photo_ids)?[...new Set(body.photo_ids.map((id:any)=>String(id)))]:[];
      if(!ids.length||ids.length>100||ids.some((id:string)=>!uuidPattern.test(id)))return out(request,{error:'invalid_photo_export'},400);
      const result=await client.from('inspection_reference_photos').select('id,object_path,original_name,mime_type,size_bytes,created_at').in('id',ids);
      if(result.error)throw result.error;
      if(!result.data||result.data.length!==ids.length)return out(request,{error:'photo_not_found'},404);
      const signed=await client.storage.from(PHOTO_BUCKET).createSignedUrls(result.data.map((p:any)=>p.object_path),600);
      if(signed.error)throw signed.error;
      const signedUrls=Array.isArray(signed.data)?signed.data:(signed.data?.signedUrls||[]);
      if(signedUrls.length!==result.data.length||signedUrls.some((item:any)=>!item.signedUrl))throw new Error('photo_export_signing_failed');
      await audit(client,user.id,'reference_photo_export',null,{country_code:country,count:ids.length},'inspection_reference_photos');
      return out(request,{photos:result.data.map((p:any,index:number)=>({id:p.id,original_name:p.original_name,mime_type:p.mime_type,size_bytes:p.size_bytes,created_at:p.created_at,url:signedUrls[index].signedUrl}))});
    }
    const managed=await managementAction(body,user,client,(v:any,status=200)=>out(request,v,status),audit);if(managed)return managed;
    if(body.action==='reference_photo_upload') {
      if(!['admin','supervisor'].includes(user.role))return out(request,{error:'forbidden'},403);
      const photo=decodePhoto(body.photo), id=crypto.randomUUID(), objectPath=user.id+'/'+id+'.'+photo.extension;
      const uploaded=await client.storage.from(PHOTO_BUCKET).upload(objectPath,photo.bytes,{contentType:photo.mime,upsert:false});
      if(uploaded.error)throw uploaded.error;
      const inserted=await client.from('inspection_reference_photos').insert({id,object_path:objectPath,uploaded_by:user.id,original_name:String(body.filename||'photo').slice(0,200),mime_type:photo.mime,size_bytes:photo.bytes.length});
      if(inserted.error){await client.storage.from(PHOTO_BUCKET).remove([objectPath]);throw inserted.error;}
      const signed=await client.storage.from(PHOTO_BUCKET).createSignedUrl(objectPath,600);
      if(signed.error)throw signed.error;
      return out(request,{photo:{id,url:signed.data.signedUrl,expires_in:600}});
    }
    if(body.action==='reference_photo_get') {
      if(!uuidPattern.test(String(body.photo_id||'')))return out(request,{error:'invalid_photo'},400);
      const {data:photo}=await client.from('inspection_reference_photos').select('*').eq('id',body.photo_id).single();
      if(!photo)return out(request,{error:'photo_not_found'},404);
      let permitted=photo.uploaded_by===user.id;
      if(!permitted&&body.form_id){
        const {data:f}=await client.from('inspection_forms').select('department,items').eq('id',body.form_id).single();
        if(f?.items?.some((i:any)=>i.reference_photo_id===photo.id)){
          const {data:d}=await client.from('departments').select('name_zh').eq('id',user.dept).maybeSingle();
          const {data:a}=await client.from('equipment_form_assignments').select('equipment_id,equipments!inner(department_id)').eq('form_id',body.form_id).in('equipments.department_id',user.departmentIds).limit(1);
          permitted=user.role==='admin'||user.departmentNames.includes(f.department)||!!a?.length||(user.role==='supervisor'&&!f.department);
        }
      }
      if(!permitted&&body.record_id){
        const {data:r}=await client.from('inspection_records').select('answers,equipments!inner(department_id)').eq('id',body.record_id).single();
        permitted=!!r&&(user.role==='admin'||ownsDepartment(user,(r.equipments as any).department_id))&&r.answers.some((a:any)=>a.item?.reference_photo_id===photo.id);
      }
      if(!permitted)return out(request,{error:'forbidden'},403);
      const signed=await client.storage.from(PHOTO_BUCKET).createSignedUrl(photo.object_path,600);
      if(signed.error)throw signed.error;return out(request,{photo:{id:photo.id,url:signed.data.signedUrl,expires_in:600}});
    }
    if (body.action === 'assignment_save' || body.action === 'assignment_remove') {
      if(!['admin','supervisor'].includes(user.role))return out(request,{error:'forbidden'},403);
      const ids=Array.isArray(body.equipment_ids)?[...new Set(body.equipment_ids.map(String))]:[];
      if(!ids.length||ids.length>1000)return out(request,{error:'invalid_equipment'},400);
      const {data:equipment,error:eqError}=await client.from('equipments').select('id,department_id').in('id',ids);
      if(eqError)throw eqError;
      if(equipment?.length!==ids.length||equipment.some(e=>e.department_id!==body.department_id||!ownsDepartment(user,e.department_id)))return out(request,{error:'forbidden'},403);
      const {data:dept}=await client.from('departments').select('name_zh').eq('id',body.department_id).eq('in_equipment_directory',true).single();
      if(!dept)return out(request,{error:'invalid_department'},400);
      if(body.action==='assignment_remove'){
        if(!['daily','maintenance'].includes(body.kind))return out(request,{error:'invalid_kind'},400);
        const {error}=await client.from('equipment_form_assignments').delete().in('equipment_id',ids).eq('kind',body.kind);if(error)throw error;
      }else{
        const {data:form}=await client.from('inspection_forms').select('id,kind,department,items').eq('id',body.form_id).single();
        if(!form||!form.items?.length||(user.role!=='admin'&&form.department&&form.department!==dept.name_zh))return out(request,{error:'forbidden'},403);
        const {error}=await client.from('equipment_form_assignments').upsert(ids.map(id=>({equipment_id:id,kind:form.kind,form_id:form.id,assigned_by:user.id,assignment_source:'account',assigned_at:new Date().toISOString()})),{onConflict:'equipment_id,kind'});if(error)throw error;
      }
      await audit(client,user.id,body.action,body.form_id||null,{equipment_ids:ids,department_id:body.department_id});return out(request,{success:ids.length});
    }
    if(body.action==='database_status'){
      requireAdmin(user);
      const tables=['departments','equipment_groups','equipments','inspection_forms','equipment_form_assignments','inspection_records'];const counts:any={};
      for(const table of tables){const r=await client.from(table).select('*',{count:'exact',head:true});if(r.error)throw r.error;counts[table]=r.count;}
      return out(request,{connected:true,provider:'Supabase PostgreSQL',project_ref:'dpenlftkwzqwhgpvutwk',checked_at:new Date().toISOString(),counts});
    }

    if (body.action === 'workspace') {
      const checked = async(q:any) => { const r=await q; if(r.error)throw r.error; return r.data||[]; };
      const departments=await checked(client.from('departments').select('*').eq('is_active',true).eq('in_equipment_directory',true).order('sort_order'));
      const allowed=departments.filter((d:any)=>ownsDepartment(user,d.id));
      const ids=allowed.map((d:any)=>d.id), names=allowed.map((d:any)=>d.name_zh);
      const readRelated=async(table:string,sort:string)=>{
        const result:any[]=[];
        const resource=table==='maintenance_records'?'maintenance':'daily',readIds=ids.filter((id:string)=>canAccess(user,id,resource,'view'));
        if(readIds.length)for(let offset=0;;offset+=1000){
          const page=await checked(client.from(table).select('*,equipments!inner(department_id)').in('equipments.department_id',readIds).order(sort,{ascending:false}).range(offset,offset+999));
          result.push(...page.map(({equipments,...row}:any)=>row));if(page.length<1000)break;
        }
        return result;
      };
      const [equipment,groups,allForms,assignments,records,maintenanceRecords,autoStops]=await Promise.all([
        ids.length?checked(client.from('equipments').select('*,equipment_groups(*)').in('department_id',ids).order('equipment_code')):Promise.resolve([]),
        ids.length?checked(client.from('equipment_groups').select('*').in('department_id',ids).eq('is_active',true)):Promise.resolve([]),
        checked(client.from('inspection_forms').select('*').order('updated_at',{ascending:false})),
        ids.length?checked(client.from('equipment_form_assignments').select('*,equipments!inner(department_id)').in('equipments.department_id',ids)).then(rows=>rows.map(({equipments,...row}:any)=>row)):Promise.resolve([]),
        readRelated('inspection_records','inspected_at'),
        readRelated('maintenance_records','updated_at'),
        readRelated('calendar_auto_stops','inspection_date')
      ]);
      const assignedForms=new Set(assignments.map((a:any)=>a.form_id));
      const forms=user.role==='admin'?allForms:allForms.filter((f:any)=>{
        if(!user.access.managed)return names.includes(f.department)||assignedForms.has(f.id)||(user.role==='supervisor'&&!f.department);
        const resource=f.kind==='maintenance'?'maintenance':'daily',settings=resource+'_settings';
        return allowed.some((d:any)=>f.department===d.name_zh&&(canAccess(user,d.id,settings,'view')||canAccess(user,d.id,'assignment','view')))||assignments.some((a:any)=>a.form_id===f.id&&canAccess(user,equipment.find((e:any)=>e.id===a.equipment_id)?.department_id,resource,'view'));
      });
      const nav=await client.from('navigation_settings').select('config,revision,updated_at').maybeSingle();if(nav.error)throw nav.error;
      const merges=await checked(client.from('scrap_department_merges').select('*'));
      const scrapMerges=merges.filter((m:any)=>['admin','supervisor'].includes(user.role)&&[m.primary_department,m.secondary_department].some(id=>canAccess(user,id,'scrap','view'))&&departments.some((d:any)=>d.id===m.primary_department)&&departments.some((d:any)=>d.id===m.secondary_department)).map((m:any)=>({...m,department:{...departments.find((d:any)=>d.id===m.primary_department),name_zh:m.label.zh,name_en:m.label.en,name_es:m.label.es,name_vi:m.label.vi},actions:['view','create','edit','delete'].filter(a=>[m.primary_department,m.secondary_department].some(id=>canAccess(user,id,'scrap',a)))}));
      return out(request,{departments:allowed,scrapMerges,equipment,groups,forms,records,assignments,maintenanceRecords,autoStops,access:user.access,navigationSettings:nav.data,profile:{role:user.role,department_id:user.dept,account_id:user.id,account_code:user.account_code,full_name:user.full_name}});
    }
    if (['forms_import','form_save','form_delete'].includes(body.action)) {
      if(!['admin','supervisor'].includes(user.role))return out(request,{error:'forbidden'},403);
      const {data:department}=await client.from('departments').select('name_zh').eq('id',user.dept).single();
      if(body.action==='form_delete'){
        const {data:existing}=await client.from('inspection_forms').select('*').eq('id',body.id).single();
        if(!existing || (user.role!=='admin'&&!user.departmentNames.includes(existing.department)))return out(request,{error:'forbidden'},403);
        const {error}=await client.from('inspection_forms').delete().eq('id',existing.id);if(error)throw error;
        await audit(client,user.id,'delete_form',existing.id,{snapshot:existing});return out(request,{success:1});
      }
      const rows=body.action==='form_save'?[body.form]:body.forms;
      if(!Array.isArray(rows)||!rows.length||rows.length>500)return out(request,{error:'invalid_rows'},400);
      const clean=[];
      for(const raw of rows){
        raw.department=canonicalDepartmentName(raw.department);
        if(typeof raw.form_name==='string')raw.form_name=raw.form_name.replace(/^光篩全檢包裝組(?=_)/,'光學全檢包裝組');
        if(!['daily','maintenance'].includes(raw.kind)||(user.role!=='admin'&&!String(raw.department||'').trim())||!String(raw.equipment_name||'').trim()||!Array.isArray(raw.items)||!raw.items.length||raw.items.length>200)return out(request,{error:'invalid_form'},400);
        if(user.role!=='admin'&&!user.departmentNames.includes(raw.department))return out(request,{error:'forbidden'},403);
        if(raw.id){const {data:old}=await client.from('inspection_forms').select('department,items,updated_at').eq('id',raw.id).single();if(!old||(user.role!=='admin'&&!user.departmentNames.includes(old.department)))return out(request,{error:'forbidden'},403);}
        if(raw.department){const {data:validDept}=await client.from('departments').select('id').eq('name_zh',raw.department).eq('in_equipment_directory',true).maybeSingle();if(!validDept)return out(request,{error:'invalid_department'},400);if(user.access.managed)requireAccess(user,validDept.id,raw.kind==='maintenance'?'maintenance_settings':'daily_settings',raw.id&&body.action==='form_save'?'edit':'view');}
        const texts=(v:any)=>Object.fromEntries(['zh','en','es','vi'].map(l=>[l,String(v?.[l]||'').trim().slice(0,5000)]));
        const schedule=(v:any)=>{if(!Array.isArray(v)||v.length>600||v.some((x:any)=>!Number.isInteger(x.month)||x.month<1||x.month>12||!['W','M','Q','Y'].includes(x.cycle_code)))throw Error('invalid_schedule');return v.map((x:any)=>({month:x.month,cycle_code:x.cycle_code}));};
        const items=raw.items.map((i:any,n:number)=>({order:n+1,name:texts(i.name),method:texts(i.method),standard:texts(i.standard),cycle:texts(i.cycle),...(Object.prototype.hasOwnProperty.call(i,'schedule')?{schedule:schedule(i.schedule)}:{}),...(Object.prototype.hasOwnProperty.call(i,'reference_photo_id')?{reference_photo_id:i.reference_photo_id||null}:{})}));
        const photoIds=[...new Set(items.map((i:any)=>i.reference_photo_id).filter(Boolean))] as string[];
        if(photoIds.some(id=>!uuidPattern.test(id)))return out(request,{error:'invalid_photo'},400);
        if(photoIds.length){
          const {data:photos,error:photoError}=await client.from('inspection_reference_photos').select('id,uploaded_by').in('id',photoIds);
          if(photoError)throw photoError;
          const {data:oldForm}=raw.id?await client.from('inspection_forms').select('items').eq('id',raw.id).single():{data:null};
          if(photos?.length!==photoIds.length||photos.some((p:any)=>user.role!=='admin'&&p.uploaded_by!==user.id&&!oldForm?.items?.some((i:any)=>i.reference_photo_id===p.id)))return out(request,{error:'forbidden'},403);
        }
        if(items.some((i:any)=>!i.name.zh))return out(request,{error:'missing_item'},400);
        const f:any={kind:raw.kind,department:String(raw.department).trim(),equipment_group:String(raw.equipment_group||'').trim(),equipment_name:String(raw.equipment_name).trim(),machine_no:String(raw.machine_no||'').trim(),property_no:String(raw.property_no||'').trim(),items};
        f.form_name=String(raw.form_name||raw.source_sheet||raw.equipment_name||'form').trim().replace(/[\\/:*?"<>|]/g,'_').slice(0,180);if(!/\.csv$/i.test(f.form_name))f.form_name+='.csv';
        f.source_department=String(raw.source_department||'').slice(0,200);f.source_filename=String(raw.source_filename||body.filename||'').slice(0,200);f.source_sheet=String(raw.source_sheet||'').slice(0,100);f.updated_at=new Date().toISOString();f.updated_by=user.id;
        if(raw.id&&body.action==='form_save')f.id=raw.id;f._expected_updated_at=raw.updated_at;clean.push(f);
      }
      let success=0;
      for(const f of clean){
        const lookup=f.id?client.from('inspection_forms').select('id,items,updated_at').eq('id',f.id):client.from('inspection_forms').select('id,items,updated_at').eq('form_name',f.form_name).eq('department',f.department).eq('kind',f.kind);
        let {data:existing,error:lookupError}=await lookup.maybeSingle();if(lookupError)throw lookupError;
        if(existing){if(user.access.managed){const d=await client.from('departments').select('id').eq('name_zh',f.department).single();requireAccess(user,d.data?.id,f.kind==='maintenance'?'maintenance_settings':'daily_settings','edit');}if(f._expected_updated_at&&existing.updated_at!==f._expected_updated_at)return out(request,{error:'form_changed'},409);f.id=existing.id;f.items=preservePhotos(f.items,existing.items).map((i:any)=>{if(Object.prototype.hasOwnProperty.call(i,'schedule'))return i;const matched=existing.items.filter((old:any)=>JSON.stringify(old.name)===JSON.stringify(i.name));return matched.length===1&&matched[0].schedule?{...i,schedule:matched[0].schedule}:i;});}
        delete f._expected_updated_at;
        const core=Object.fromEntries(['kind','department','equipment_group','equipment_name','machine_no','property_no','items'].map(k=>[k,f[k]]));
        const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v; const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(core))));
        f.content_key=Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
        if(!existing){const duplicate=await client.from('inspection_forms').select('id,items,updated_at').eq('content_key',f.content_key).maybeSingle();if(duplicate.error)throw duplicate.error;if(duplicate.data){if(user.access.managed){const d=await client.from('departments').select('id').eq('name_zh',f.department).single();requireAccess(user,d.data?.id,f.kind==='maintenance'?'maintenance_settings':'daily_settings','edit');}existing=duplicate.data;f.id=existing.id;}}
        const r=f.id?await client.from('inspection_forms').update(f).eq('id',f.id).eq('updated_at',existing.updated_at).select('id'):await client.from('inspection_forms').insert(f).select('id');if(r.error){if(r.error.code==='23505')return out(request,{error:'form_changed'},409);throw r.error;}if(!r.data?.length)return out(request,{error:'form_changed'},409);success++;
      }
      await audit(client,user.id,body.action,null,{success,filename:body.filename});return out(request,{success});
    }
    if(body.action==='record_save'){
      if(body.is_backfill&&!['admin','supervisor'].includes(user.role))return out(request,{error:'forbidden'},403);
      const {data:e}=await client.from('equipments').select('id,department_id,archived_at').eq('id',body.equipment_id).single();
      if(!e||e.archived_at||!ownsDepartment(user,e.department_id))return out(request,{error:'forbidden'},403);
      const {data:assignment}=await client.from('equipment_form_assignments').select('form_id').eq('equipment_id',e.id).eq('kind','daily').maybeSingle();
      if(!assignment||assignment.form_id!==body.form_id)return out(request,{error:'form_not_assigned'},409);
      const {data:form}=await client.from('inspection_forms').select('items,updated_at').eq('id',assignment.form_id).single();
      if(!form||form.updated_at!==body.form_updated_at)return out(request,{error:'form_changed'},409);
      if(!Array.isArray(body.answers)||body.answers.length!==form.items.length)return out(request,{error:'invalid_record'},400);
      const answers=body.answers.map((a:any,n:number)=>({item:form.items[n],value:String(a.value||''),note:String(a.note||'').slice(0,5000),photo:/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.photo||'')&&a.photo.length<3000000?a.photo:''}));
      if(!Array.isArray(answers)||!answers.length||answers.length>200||!String(body.inspector_name||'').trim())return out(request,{error:'invalid_record'},400);
      if(!body.is_draft&&answers.some((a:any)=>!['normal','maintenance','disable'].includes(a.value)||(a.value!=='normal'&&!String(a.note||'').trim())))return out(request,{error:'invalid_record'},400);
      const dated=inspectionDate(body);
      const submissionKey=body.submission_key||crypto.randomUUID();
      if(!uuidPattern.test(submissionKey))return out(request,{error:'invalid_record'},400);
      const {data:savedId,error}=await client.rpc('save_inspection_submission',{p_equipment_id:e.id,p_form_id:assignment.form_id,p_account_id:user.id,p_inspector_name:String(body.inspector_name).slice(0,100),p_shift:body.shift==='night'?'night':'day',p_answers:answers,p_is_draft:!!body.is_draft,p_inspection_date:dated.date,p_is_backfill:dated.backfill,p_reason:dated.reason,p_submission_key:submissionKey});
      if(error){if(error.message?.includes('duplicate_inspection'))return out(request,{error:'duplicate_inspection'},409);throw error;}
      return out(request,{record:{id:savedId,inspection_date:dated.date,is_backfill:dated.backfill}});
    }
    if (body.action === 'dashboard') {
      const { data: equipment } = await client.from('equipments').select('*,equipment_groups(name_zh,name_en,name_es,name_vi)').eq('department_id', user.dept).order('equipment_code');
      const ids = (equipment || []).map((item) => item.id);
      const { data: records } = ids.length ? await client.from('inspection_records').select('*').in('equipment_id', ids).eq('inspection_date', inspectionDate({}).date) : { data: [] };
      return out(request, { equipment: equipment || [], records: records || [] });
    }
    if (body.action === 'maintenance_list') {
      const { data: plans } = await client.from('preventive_maintenance_plans').select('*,equipments!inner(equipment_code,name_zh,department_id,archived_at)').eq('equipments.department_id', user.dept).is('equipments.archived_at',null).eq('is_active', true);
      return out(request, { plans: plans || [] });
    }
    if (body.action === 'admin_accounts') {
      requireAdmin(user);
      const { data: accounts, error } = await client.from('operator_accounts').select('id,account_code,role,is_active,must_change_password,full_name,department_id,departments(name_zh)').order('account_code');
      if (error) throw error;
      const { data: departments, error: departmentError } = await client.from('departments').select('id,code,name_zh,is_active').eq('is_active', true).eq('in_equipment_directory',true).order('sort_order');
      if (departmentError) throw departmentError;
      return out(request, { accounts: accounts || [], departments: departments || [] });
    }
    if (body.action === 'admin_account_create') {
      requireAdmin(user);
      const accountCode = String(body.account_code || '').trim();
      const password = String(body.password || '');
      const departmentId = String(body.department_id || '');
      const role = String(body.role || 'operator');
      const fullName = String(body.full_name || '').trim().slice(0, 100);
      if (!/^[A-Za-z0-9_-]{3,40}$/.test(accountCode) || password.length < 6 || !['operator','supervisor','admin'].includes(role) || !departmentId) return out(request, { error: 'Invalid account data' }, 400);
      const { data: department } = await client.from('departments').select('id').eq('id', departmentId).eq('is_active', true).eq('in_equipment_directory',true).maybeSingle();
      if (!department) return out(request, { error: 'Invalid department' }, 400);
      const { data: account, error } = await client.from('operator_accounts').insert({ account_code: accountCode, password_hash: bcrypt.hashSync(password, 10), department_id: departmentId, role, full_name: fullName || null, must_change_password: true, is_active: true }).select('id,account_code,role,is_active,full_name').single();
      if (error) { console.error('account_create',error.code); return out(request, { error: error.code==='23505'?'duplicate_account':'account_create_failed' }, error.code==='23505'?409:500); }
      await audit(client, user.id, 'create', account.id, { account_code: accountCode, role, department_id: departmentId });
      return out(request, { account }, 201);
    }
    if (body.action === 'admin_account_update') {
      requireAdmin(user);
      const id = String(body.id || '');
      const update: Record<string, unknown> = {};
      if (typeof body.full_name === 'string') update.full_name = body.full_name.trim().slice(0, 100) || null;
      if (typeof body.role === 'string' && ['operator','supervisor','admin'].includes(body.role)) update.role = body.role;
      if (typeof body.department_id === 'string' && body.department_id) { const {data:validDepartment}=await client.from('departments').select('id').eq('id',body.department_id).eq('in_equipment_directory',true).maybeSingle();if(!validDepartment)return out(request,{error:'invalid_department'},400);update.department_id = body.department_id; }
      if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
      if (typeof body.password === 'string' && body.password) return await resetPassword(client,user,country,id,body.password,update,(v:any,status=200)=>out(request,v,status));
      if (!id || Object.keys(update).length === 0) return out(request, { error: 'No changes supplied' }, 400);
      const { data: account, error } = await client.from('operator_accounts').update(update).eq('id', id).select('id,account_code,role,is_active,full_name').single();
      if (error || !account) return out(request, { error: 'Account update failed' }, 400);
      await audit(client, user.id, 'update', id, { fields: Object.keys(update).filter((key) => key !== 'password_hash') });
      return out(request, { account });
    }
    if (body.action === 'admin_account_delete') {
      requireAdmin(user);
      const id = String(body.id || '');
      if (!id || id === user.id) return out(request, { error: 'Cannot disable the current administrator' }, 400);
      const { data: account, error } = await client.from('operator_accounts').update({ is_active: false }).eq('id', id).select('id,account_code').single();
      if (error || !account) return out(request, { error: 'Account deletion failed' }, 400);
      await audit(client, user.id, 'disable', id, { account_code: account.account_code });
      return out(request, { account });
    }
    if (body.action === 'equipment_mapping_import') {
      if(!['admin','supervisor'].includes(user.role))return out(request,{error:'forbidden'},403);
      const rows = Array.isArray(body.rows) ? body.rows.slice(0, 1000) : [];
      if (!rows.length) return out(request, { error: 'No import rows' }, 400);
      const {data:importDept}=await client.from('departments').select('name_zh').eq('id',user.dept).single();
      for(const row of rows){
        row.department=canonicalDepartmentName(row.department);
        if(user.role!=='admin'&&!user.departmentNames.includes(String(row.department||'').trim()))return out(request,{error:'forbidden'},403);
        const {data:existing}=await client.from('equipments').select('department_id').eq('equipment_code',String(row.equipment_code||'').trim()).maybeSingle();
        if(existing&&!ownsDepartment(user,existing.department_id))return out(request,{error:'forbidden'},403);
      }
      let success = 0; const errors: string[] = [];
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index] || {};
        const departmentName = String(row.department || '').trim();
        let groupName = String(row.equipment_group || '').trim();
        const equipmentCode = String(row.equipment_code || '').trim();
        const equipmentName = String(row.equipment_name || '').trim();
        if (!departmentName || !equipmentCode || !equipmentName) { errors.push('Row ' + (index + 2) + ': required columns are missing'); continue; }
        if (!/^[A-Za-z0-9_-]{1,50}$/.test(equipmentCode)) { errors.push('Row ' + (index + 2) + ': invalid equipment code'); continue; }
        let { data: department } = await client.from('departments').select('id').eq('name_zh', departmentName).maybeSingle();
        if (!department) {
          const code = 'imp_' + departmentName.normalize('NFKD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase() + '_' + crypto.randomUUID().slice(0, 6);
          const created = await client.from('departments').insert({ code, name_zh: departmentName, is_active: true, in_equipment_directory:true }).select('id').single();
          if (created.error || !created.data) { errors.push('Row ' + (index + 2) + ': cannot create department'); continue; }
          department = created.data;
        }
        const {error:deptFlagError}=await client.from('departments').update({in_equipment_directory:true}).eq('id',department.id);if(deptFlagError)throw deptFlagError;
        const {data:known}=await client.from('equipments').select('equipment_groups(name_zh),department_id').eq('equipment_code',equipmentCode).maybeSingle(); if(known?.equipment_groups && known.department_id===department.id)groupName=(known.equipment_groups as any).name_zh;
        let { data: group } = await client.from('equipment_groups').select('id').eq('department_id', department.id).eq('name_zh', groupName).maybeSingle();
        if (!group && groupName) {
          const groupCode = 'grp_' + crypto.randomUUID().replaceAll('-', '').slice(0, 18);
          const created = await client.from('equipment_groups').insert({ department_id: department.id, group_code: groupCode, name_zh: groupName, is_active: true }).select('id').single();
          if (created.error || !created.data) { errors.push('Row ' + (index + 2) + ': cannot create equipment group'); continue; }
          group = created.data;
        }
        const saved = await client.from('equipments').upsert({ equipment_code: equipmentCode, department_id: department.id, equipment_group_id: group?.id||null, name_zh: equipmentName, machine_no:String(row.machine_no||''),property_no:String(row.property_no||''),status: 'active' }, { onConflict: 'equipment_code' });
        if (saved.error) { errors.push('Row ' + (index + 2) + ': cannot save equipment'); continue; }
        success += 1;
      }
      await client.from('import_jobs').insert({ imported_by: user.id, import_type: 'equipment', source_filename: String(body.filename || 'equipment-mapping.xlsx').slice(0, 200), row_count: rows.length, success_count: success, error_count: errors.length, errors });
      await audit(client, user.id, 'import', null, { type: 'equipment_mapping', success, errors: errors.length });
      return out(request, { success, errors });
    }
    return out(request, { error: 'Unknown action' }, 400);
  } catch (error) {
    if(error instanceof Error&&error.message==='forbidden')return out(request,{error:'forbidden'},403);
    if(error instanceof Error&&['invalid_schedule','country_required','country_mismatch','invalid_photo','invalid_inspection_date','backfill_reason_required','photo_match_ambiguous','invalid_date'].includes(error.message))return out(request,{error:error.message},400);
    console.error(String(error));
    return out(request, { error: 'Request denied' }, 401);
  }
});







