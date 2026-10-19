CREATE OR REPLACE FUNCTION public.save_cadre_daily_v2(p_country text, p_department uuid, p_date date, p_account uuid, p_revision integer, p_results jsonb, p_duty text, p_supervisor text, p_confirm boolean, p_template_revision integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare u record; prior public.cadre_daily_records; saved public.cadre_daily_records; tmpl public.cadre_month_templates; items jsonb; v jsonb; i integer; m date:=date_trunc('month',p_date)::date;
begin
 select role,department_id,is_active into u from operator_accounts where id=p_account;
 if not found or not u.is_active or u.role not in ('admin','supervisor') or not account_can(p_account,p_country,p_department,'cadre','view') then raise exception 'forbidden'; end if;
 if not exists(select 1 from departments where id=p_department and country_code=p_country and is_active) then raise exception 'invalid_department'; end if;
 if p_date is null or p_date>(now() at time zone 'Asia/Taipei')::date or p_date<date '2000-01-01' or p_revision is null or p_revision<0 or jsonb_typeof(p_results) is distinct from 'array' or p_duty is null or length(btrim(p_duty)) not between 1 and 100 or p_supervisor is null or length(p_supervisor)>100 or p_confirm is null then raise exception 'invalid_cadre_record'; end if;
 perform pg_advisory_xact_lock(hashtextextended('cadre-template:'||p_country||':'||p_department||':'||m,0));
 perform pg_advisory_xact_lock(hashtextextended('cadre:'||p_country||':'||p_department||':'||p_date,0));
 select * into tmpl from cadre_month_templates where country_code=p_country and department_id=p_department and month_date=m;
 select * into prior from cadre_daily_records where country_code=p_country and department_id=p_department and inspection_date=p_date for update;
 if not account_can(p_account,p_country,p_department,'cadre',case when prior.id is null then 'create' else 'edit' end) or (p_confirm and not account_can(p_account,p_country,p_department,'cadre','approve')) then raise exception 'forbidden';end if;
 if coalesce(prior.revision,0)<>p_revision then raise exception 'record_changed'; end if;
 if prior.id is null and coalesce(tmpl.revision,0) is distinct from p_template_revision then raise exception 'record_changed'; end if;
 items:=coalesce(prior.template_snapshot,tmpl.items,public.cadre_default_items());
 if jsonb_array_length(p_results)<>jsonb_array_length(items) then raise exception 'invalid_cadre_record'; end if;
 for i in 0..jsonb_array_length(items)-1 loop
  v:=p_results->i;
  if v->>'id' is distinct from items->i->>'id' or jsonb_typeof(v->'value') is distinct from 'string' or v->>'value' not in ('','V','∖','Φ','N/A') or jsonb_typeof(v->'note') is distinct from 'string' or length(v->>'note')>2000 then raise exception 'invalid_cadre_record'; end if;
  if v->>'value'='Φ' and coalesce(prior.results->i->>'value','') not in ('∖','Φ') then raise exception 'improvement_requires_issue'; end if;
  if p_confirm and (v->>'value'='' or length(btrim(p_supervisor))=0) then raise exception 'confirmation_incomplete'; end if;
 end loop;
 insert into cadre_daily_records(country_code,department_id,inspection_date,results,template_snapshot,duty_name,supervisor_name,confirmed_at,updated_by,revision)
 values(p_country,p_department,p_date,p_results,items,btrim(p_duty),case when p_confirm then btrim(p_supervisor) else '' end,case when p_confirm then now() end,p_account,coalesce(prior.revision,0)+1)
 on conflict(country_code,department_id,inspection_date) do update set results=excluded.results,duty_name=excluded.duty_name,supervisor_name=excluded.supervisor_name,confirmed_at=excluded.confirmed_at,updated_by=p_account,updated_at=now(),revision=excluded.revision returning * into saved;
 insert into audit_logs(account_id,action,entity_type,entity_id,payload,country_code) values(p_account,'cadre_daily_save','cadre_daily_record',saved.id,jsonb_build_object('before',to_jsonb(prior),'after',to_jsonb(saved)),p_country);
 return to_jsonb(saved);
end $function$
;

CREATE OR REPLACE FUNCTION public.save_cadre_template(p_country text, p_department uuid, p_month date, p_account uuid, p_revision integer, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare u record; prior public.cadre_month_templates; saved public.cadre_month_templates; v jsonb; i integer;
begin
 select role,department_id,is_active into u from operator_accounts where id=p_account;
 if not found or not u.is_active or u.role not in ('admin','supervisor') or not account_can(p_account,p_country,p_department,'cadre_settings','view') then raise exception 'forbidden'; end if;
 if not exists(select 1 from departments where id=p_department and country_code=p_country and is_active) then raise exception 'invalid_department'; end if;
 if p_month is null or extract(day from p_month)<>1 or p_month<date '2000-01-01' or p_month>date '2099-12-01' or p_revision is null or p_revision<0 or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'invalid_template'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'invalid_template'; end if;
 for i in 0..jsonb_array_length(p_items)-1 loop
  v:=p_items->i;
  if v->>'id' is distinct from (i+1)::text or jsonb_typeof(v->'name') is distinct from 'object' or jsonb_typeof(v->'standard') is distinct from 'object' or length(coalesce(v->'name'->>'zh','')) not between 1 and 500 or length(coalesce(v->'standard'->>'zh','')) not between 1 and 5000 or length(v::text)>30000 then raise exception 'invalid_template'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('cadre-template:'||p_country||':'||p_department||':'||p_month,0));
 select * into prior from cadre_month_templates where country_code=p_country and department_id=p_department and month_date=p_month for update;
 if not account_can(p_account,p_country,p_department,'cadre_settings',case when prior.id is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
 if coalesce(prior.revision,0)<>p_revision then raise exception 'record_changed'; end if;
 if jsonb_array_length(p_items)<jsonb_array_length(coalesce(prior.items,public.cadre_default_items())) then raise exception 'cannot_remove_items'; end if;
 insert into cadre_month_templates(country_code,department_id,month_date,items,revision,updated_by)
 values(p_country,p_department,p_month,p_items,coalesce(prior.revision,0)+1,p_account)
 on conflict(country_code,department_id,month_date) do update set items=excluded.items,revision=excluded.revision,updated_by=p_account,updated_at=now() returning * into saved;
 insert into audit_logs(account_id,action,entity_type,entity_id,payload,country_code) values(p_account,'cadre_template_save','department',p_department,jsonb_build_object('before',to_jsonb(prior),'after',to_jsonb(saved)),p_country);
 return to_jsonb(saved);
end $function$
;

CREATE OR REPLACE FUNCTION public.save_crane_monthly_template(p_country text, p_account uuid, p_equipment uuid, p_revision integer, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare u record; e record; old public.crane_monthly_templates; saved public.crane_monthly_templates; x jsonb; v jsonb; lang text; field text; photo uuid; i integer:=0;
begin
 select role,department_id,is_active into u from operator_accounts where id=p_account;
 if not found or not u.is_active or u.role not in ('admin','supervisor') then raise exception 'forbidden';end if;
 select eq.*,g.name_zh as group_name into e from equipments eq left join equipment_groups g on g.id=eq.equipment_group_id where eq.id=p_equipment and eq.country_code=p_country and eq.archived_at is null for share of eq;
 if not found or not account_can(p_account,p_country,e.department_id,'crane_settings','view') then raise exception 'forbidden';end if;
 if length(btrim(coalesce(e.machine_no,'')))=0 or (e.name_zh||' '||coalesce(e.group_name,''))!~'天車|起重機' then raise exception 'invalid_crane';end if;
 perform pg_advisory_xact_lock(hashtextextended('crane-template:'||p_country||':'||p_equipment,0));
 select * into old from crane_monthly_templates where country_code=p_country and equipment_id=p_equipment for update;
 if not account_can(p_account,p_country,e.department_id,'crane_settings',case when old.id is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
 if p_revision is distinct from coalesce(old.revision,0) then raise exception 'record_changed';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 200 or length(p_items::text)>1000000 then raise exception 'invalid_template';end if;
 for x in select * from jsonb_array_elements(p_items) loop
  i:=i+1;
  if x->>'id' is distinct from i::text or x-array['id','name','standard','reference_photo_id']<>'{}'::jsonb then raise exception 'invalid_template';end if;
  foreach field in array array['name','standard'] loop
   v:=x->field;if jsonb_typeof(v) is distinct from 'object' or length(trim(coalesce(v->>'zh',''))) not between 1 and 3000 or v-array['zh','en','es','vi']<>'{}'::jsonb then raise exception 'invalid_template';end if;
   foreach lang in array array['zh','en','es','vi'] loop
    if v?lang and (jsonb_typeof(v->lang) is distinct from 'string' or length(v->>lang)>3000) then raise exception 'invalid_template';end if;
   end loop;
  end loop;
  if coalesce(x->>'reference_photo_id','')<>'' then
   photo:=(x->>'reference_photo_id')::uuid;
   if not exists(select 1 from inspection_reference_photos p where p.id=photo and p.country_code=p_country and (u.role='admin' or p.uploaded_by=p_account or exists(select 1 from jsonb_array_elements(coalesce(old.items,'[]')) it where it->>'reference_photo_id'=photo::text))) then raise exception 'invalid_photo';end if;
  end if;
 end loop;
 insert into crane_monthly_templates(country_code,equipment_id,department_id,items,revision,updated_by)
 values(p_country,p_equipment,e.department_id,p_items,coalesce(old.revision,0)+1,p_account)
 on conflict(country_code,equipment_id) do update set items=excluded.items,revision=excluded.revision,department_id=excluded.department_id,updated_by=p_account,updated_at=now() returning * into saved;
 insert into audit_logs(account_id,action,entity_type,entity_id,country_code,payload) values(p_account,'crane_template_save','crane_monthly_template',saved.id,p_country,jsonb_build_object('before',to_jsonb(old),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $function$
;

CREATE OR REPLACE FUNCTION public.save_crane_record_v2(p_country text, p_account uuid, p_equipment uuid, p_kind text, p_date date, p_revision integer, p_results jsonb, p_details jsonb, p_inspector text, p_leader text, p_supervisor text, p_completed boolean, p_confirm boolean, p_template_revision integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare u record; eq record; prior public.crane_inspection_records; saved public.crane_inspection_records; period date; i integer; v jsonb; expected integer; snapshot jsonb; template public.crane_monthly_templates; snapshot_revision integer:=0;
begin
 select role,department_id,is_active into u from operator_accounts where id=p_account;
 if not found or not u.is_active or u.role not in ('admin','supervisor','operator') then raise exception 'forbidden'; end if;
 select e.*,g.name_zh as group_name into eq from equipments e left join equipment_groups g on g.id=e.equipment_group_id where e.id=p_equipment and e.country_code=p_country and e.archived_at is null for share of e;
 if not found or not account_can(p_account,p_country,eq.department_id,case when p_kind='monthly' then 'crane_monthly' else 'crane_daily' end,'view') then raise exception 'forbidden'; end if;
 if not exists(select 1 from departments where id=eq.department_id and country_code=p_country and is_active) or length(btrim(eq.machine_no))=0 or (eq.name_zh||' '||coalesce(eq.group_name,'')) !~ '(天車|起重機)' then raise exception 'invalid_crane'; end if;
 if p_kind is null or p_kind not in ('monthly','daily') or p_date is null or p_date<date '2000-01-01' or p_date>(now() at time zone 'Asia/Taipei')::date or p_revision is null or p_revision<0 or jsonb_typeof(p_results) is distinct from 'array' or jsonb_typeof(p_details) is distinct from 'object' or length(p_details::text)>25000 or p_inspector is null or length(btrim(p_inspector)) not between 1 and 100 or p_leader is null or length(p_leader)>100 or p_supervisor is null or length(p_supervisor)>100 or p_completed is null or p_confirm is null then raise exception 'invalid_crane_record'; end if;
 if u.role='operator' and (p_confirm or p_supervisor<>'' or p_leader<>'') then raise exception 'forbidden'; end if;
 if p_details - array['model','capacity','location','hazard','risk','measures','suitability'] <> '{}'::jsonb then raise exception 'invalid_crane_record'; end if;
 for v in select value from jsonb_each(p_details) loop
  if jsonb_typeof(v) is distinct from 'string' or length(v#>>'{}')>3000 then raise exception 'invalid_crane_record'; end if;
 end loop;
 if p_confirm and (not p_completed or length(btrim(p_supervisor))=0) then raise exception 'confirmation_incomplete'; end if;
 perform pg_advisory_xact_lock(hashtextextended('crane-template:'||p_country||':'||p_equipment,0));
 period:=case when p_kind='monthly' then date_trunc('month',p_date)::date else p_date end;
 perform pg_advisory_xact_lock(hashtextextended('crane:'||p_country||':'||p_equipment||':'||p_kind||':'||period,0));
 select * into prior from crane_inspection_records where country_code=p_country and equipment_id=p_equipment and kind=p_kind and period_date=period for update;
 if not account_can(p_account,p_country,eq.department_id,case when p_kind='monthly' then 'crane_monthly' else 'crane_daily' end,case when prior.id is null then 'create' else 'edit' end) or (p_confirm and not account_can(p_account,p_country,eq.department_id,case when p_kind='monthly' then 'crane_monthly' else 'crane_daily' end,'approve')) then raise exception 'forbidden';end if;
 if coalesce(prior.revision,0)<>p_revision then raise exception 'record_changed'; end if;
 if prior.id is not null and prior.department_id<>eq.department_id then raise exception 'equipment_changed'; end if;
 if p_kind='monthly' then
  select * into template from crane_monthly_templates where country_code=p_country and equipment_id=p_equipment;
  snapshot:=coalesce(prior.template_snapshot,template.items,crane_monthly_default_items());
  snapshot_revision:=case when prior.id is not null then prior.template_revision else coalesce(template.revision,0) end;
  if p_template_revision is distinct from snapshot_revision then raise exception 'template_changed';end if;
  expected:=jsonb_array_length(snapshot);
 else expected:=6;end if;
 if jsonb_array_length(p_results)<>expected then raise exception 'invalid_crane_record';end if;
 for i in 0..expected-1 loop
  v:=p_results->i;
  if v->>'id' is distinct from (i+1)::text or jsonb_typeof(v->'value') is distinct from 'string' or (p_kind='monthly' and v->>'value' not in ('','X','Δ','✔','─')) or (p_kind='daily' and v->>'value' not in ('','ˇ','×')) then raise exception 'invalid_crane_record'; end if;
  if p_completed and v->>'value'='' then raise exception 'confirmation_incomplete'; end if;
 end loop;
 insert into crane_inspection_records(country_code,department_id,equipment_id,kind,period_date,inspection_date,equipment_snapshot,results,details,inspector_name,leader_name,supervisor_name,completed,confirmed_at,revision,updated_by,template_snapshot,template_revision)
 values(p_country,eq.department_id,p_equipment,p_kind,period,p_date,coalesce(prior.equipment_snapshot,jsonb_build_object('machine_no',eq.machine_no,'property_no',eq.property_no,'name_zh',eq.name_zh)),p_results,p_details,btrim(p_inspector),btrim(p_leader),case when p_confirm then btrim(p_supervisor) else '' end,p_completed,case when p_confirm then now() end,coalesce(prior.revision,0)+1,p_account,snapshot,snapshot_revision)
 on conflict(country_code,equipment_id,kind,period_date) do update set inspection_date=excluded.inspection_date,results=excluded.results,details=excluded.details,inspector_name=excluded.inspector_name,leader_name=excluded.leader_name,supervisor_name=excluded.supervisor_name,completed=excluded.completed,confirmed_at=excluded.confirmed_at,revision=excluded.revision,updated_by=p_account,updated_at=now() returning * into saved;
 insert into audit_logs(account_id,action,entity_type,entity_id,payload,country_code) values(p_account,'crane_record_save','crane_inspection_record',saved.id,jsonb_build_object('before',to_jsonb(prior),'after',to_jsonb(saved)),p_country);
 return to_jsonb(saved);
end $function$
;

CREATE OR REPLACE FUNCTION public.save_inspection_submission(p_equipment_id uuid, p_form_id uuid, p_account_id uuid, p_inspector_name text, p_shift text, p_answers jsonb, p_is_draft boolean, p_inspection_date date, p_is_backfill boolean, p_reason text, p_submission_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result_id uuid; current_day date := (now() at time zone 'Asia/Taipei')::date;
begin
 if not exists(select 1 from equipments e where e.id=p_equipment_id and account_can(p_account_id,e.country_code,e.department_id,'daily',case when exists(select 1 from inspection_records r where r.equipment_id=e.id and r.inspection_date=p_inspection_date) then 'edit' else 'create' end)) then raise exception 'forbidden';end if;
  if p_submission_key is null or p_inspection_date is null
     or p_inspection_date > current_day
     or (p_is_backfill and (p_inspection_date >= current_day or length(trim(coalesce(p_reason,''))) = 0))
     or (not p_is_backfill and p_inspection_date <> current_day)
     or p_shift not in ('day','night') then
    raise exception 'invalid_inspection_date' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_submission_key::text,1));
  select id into result_id from public.inspection_records
    where submission_key=p_submission_key and operator_account_id=p_account_id;
  if found then return result_id; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_equipment_id::text||'/'||p_inspection_date::text||'/'||p_shift,0));
  if not p_is_draft and exists(select 1 from public.inspection_records
    where equipment_id=p_equipment_id and inspection_date=p_inspection_date and shift=p_shift
      and not is_draft and approval_status <> 'rejected') then
    raise exception 'duplicate_inspection' using errcode='23505';
  end if;
  insert into public.inspection_records(equipment_id,form_id,operator_account_id,inspector_name,shift,answers,
    is_draft,overall_status,approval_status,inspection_date,recorded_at,is_backfill,backfill_reason,submission_key)
  values(p_equipment_id,p_form_id,p_account_id,p_inspector_name,p_shift,p_answers,p_is_draft,
    case when p_is_draft then 'draft' when exists(select 1 from jsonb_array_elements(p_answers) a where a->>'value'<>'normal') then 'abnormal' else 'normal' end,
    'pending',p_inspection_date,now(),p_is_backfill,case when p_is_backfill then trim(p_reason) else '' end,p_submission_key)
  returning id into result_id;
  return result_id;
end;
$function$
;
