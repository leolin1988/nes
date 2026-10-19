-- Additive, service-only entry point. Existing inspections are never modified.
create or replace function public.admin_daily_normal_submit(
 p_country text,p_equipment_id uuid,p_form_id uuid,p_form_updated_at timestamptz,
 p_account_id uuid,p_inspector_name text,p_shift text,p_inspection_date date,
 p_reason text,p_submission_key uuid,p_batch_id uuid
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare e public.equipments%rowtype; f public.inspection_forms%rowtype;
 a public.equipment_form_assignments%rowtype; prior public.inspection_records%rowtype;
 result_id uuid; answers jsonb; today date:=(now() at time zone 'Asia/Taipei')::date;
begin
 if not exists(select 1 from public.operator_accounts where id=p_account_id and role='admin' and is_active) then
  raise exception 'forbidden' using errcode='42501';
 end if;
 if p_country is null or p_country not in ('TW','VM','MX') or p_shift is null or p_shift not in ('day','night')
  or p_inspection_date is null or p_inspection_date>today or p_submission_key is null or p_batch_id is null
  or length(trim(coalesce(p_inspector_name,'')))=0 or length(p_inspector_name)>100
  or (p_inspection_date<today and length(trim(coalesce(p_reason,'')))=0) then
  raise exception 'invalid_batch_entry' using errcode='22023';
 end if;
 -- Same lock order as save_inspection_submission, including retries.
 perform pg_advisory_xact_lock(hashtextextended(p_submission_key::text,1));
 select * into prior from public.inspection_records where submission_key=p_submission_key;
 if found then
  if prior.operator_account_id=p_account_id and prior.country_code=p_country and prior.equipment_id=p_equipment_id
   and prior.form_id=p_form_id and prior.inspection_date=p_inspection_date and prior.shift=p_shift then return prior.id; end if;
  raise exception 'invalid_batch_entry' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_equipment_id::text||'/'||p_inspection_date::text||'/'||p_shift,0));
 if exists(select 1 from public.inspection_records where equipment_id=p_equipment_id and inspection_date=p_inspection_date and shift=p_shift) then
  raise exception 'existing_inspection' using errcode='23505';
 end if;
 select * into e from public.equipments where id=p_equipment_id and country_code=p_country for share;
 if not found or e.archived_at is not null or e.status<>'active' then raise exception 'invalid_equipment' using errcode='22023'; end if;
 select * into a from public.equipment_form_assignments where equipment_id=e.id and kind='daily' and country_code=p_country for share;
 if not found or a.form_id<>p_form_id then raise exception 'form_not_assigned' using errcode='22023'; end if;
 select * into f from public.inspection_forms where id=a.form_id and country_code=p_country and kind='daily' for share;
 if not found or p_form_updated_at is null or f.updated_at<>p_form_updated_at then raise exception 'form_changed' using errcode='22023'; end if;
 if jsonb_typeof(f.items)<>'array' or jsonb_array_length(f.items) not between 1 and 200 then raise exception 'invalid_record' using errcode='22023'; end if;
 select jsonb_agg(jsonb_build_object('item',item,'value','normal','note','管理員批次填報正常 · '||p_batch_id::text ,'photo','') order by n)
  into answers from jsonb_array_elements(f.items) with ordinality as x(item,n);
 result_id:=public.save_inspection_submission(e.id,f.id,p_account_id,trim(p_inspector_name),p_shift,answers,false,p_inspection_date,p_inspection_date<today,left(coalesce(p_reason,''),1000),p_submission_key);
 insert into public.audit_logs(account_id,action,entity_type,entity_id,payload,country_code)
 values(p_account_id,'admin_daily_normal','inspection_record',result_id,jsonb_build_object('batch_id',p_batch_id,'equipment_id',e.id,'inspection_date',p_inspection_date,'shift',p_shift,'inspector_name',trim(p_inspector_name),'confirmed',true),p_country);
 return result_id;
end;
$$;
revoke all on function public.admin_daily_normal_submit(text,uuid,uuid,timestamptz,uuid,text,text,date,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_daily_normal_submit(text,uuid,uuid,timestamptz,uuid,text,text,date,text,uuid,uuid) to service_role;
