create table public.environment_defaults (
 country_code text primary key check(country_code in ('TW','VM','MX')),
 items jsonb not null check(jsonb_typeof(items)='array'),source_filename text not null,source_sheet text not null
);
create table public.environment_templates (
 country_code text not null check(country_code in ('TW','VM','MX')),department_id uuid primary key references public.departments(id),
 items jsonb not null check(jsonb_typeof(items)='array'),map_photo_id uuid references public.inspection_reference_photos(id),
 revision integer not null check(revision>0),updated_by uuid not null references public.operator_accounts(id),updated_at timestamptz not null default now()
);
create table public.environment_records (
 id uuid primary key default gen_random_uuid(),country_code text not null check(country_code in ('TW','VM','MX')),
 department_id uuid not null references public.departments(id),inspection_date date not null,
 template_snapshot jsonb not null,template_revision integer not null,map_photo_id uuid references public.inspection_reference_photos(id),
 results jsonb not null,inspector text not null,confirmed_by uuid references public.operator_accounts(id),confirmed_at timestamptz,
 revision integer not null check(revision>0),updated_by uuid not null references public.operator_accounts(id),updated_at timestamptz not null default now(),
 unique(country_code,department_id,inspection_date)
);
alter table public.environment_defaults enable row level security;
alter table public.environment_templates enable row level security;
alter table public.environment_records enable row level security;
revoke all on public.environment_defaults,public.environment_templates,public.environment_records from anon,authenticated;
grant all on public.environment_defaults,public.environment_templates,public.environment_records to service_role;
insert into public.access_resources(resource,label,actions,sort_order) values
 ('environment','{"zh":"QR17-01 環境維護權責表及查核表","en":"QR17-01 Environmental responsibility and audit","es":"QR17-01 Responsabilidad y auditoría ambiental","vi":"QR17-01 Trách nhiệm và kiểm tra vệ sinh môi trường"}',array['view','create','edit','approve'],120),
 ('environment_settings','{"zh":"QR17-01 環境權責項目與廠區圖設定","en":"QR17-01 Environmental items and factory map settings","es":"QR17-01 Configuración ambiental y plano de fábrica","vi":"QR17-01 Thiết lập mục vệ sinh và sơ đồ nhà máy"}',array['view','create','edit'],130);

create or replace function public.save_environment_template(p_country text,p_account uuid,p_department uuid,p_revision integer,p_items jsonb,p_map uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous environment_templates; saved environment_templates; item jsonb; field text; lang text; labels jsonb;
begin
 if not exists(select 1 from operator_accounts where id=p_account and is_active and role in ('admin','supervisor')) or not account_can(p_account,p_country,p_department,'environment_settings','view') then raise exception 'forbidden';end if;
 perform pg_advisory_xact_lock(hashtextextended('environment:'||p_country||':'||p_department,0));
 select * into previous from environment_templates where country_code=p_country and department_id=p_department for update;
 if not account_can(p_account,p_country,p_department,'environment_settings',case when previous.revision is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
 if p_revision is null or p_revision<>coalesce(previous.revision,0) then raise exception 'record_changed';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>200 then raise exception 'invalid_environment';end if;
 if (select count(distinct e->>'id') from jsonb_array_elements(p_items)e)<>jsonb_array_length(p_items) then raise exception 'invalid_environment';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(length(item->>'id'),0) not between 1 and 80 or coalesce(length(item->>'area_no'),0)>40 then raise exception 'invalid_environment';end if;
  foreach field in array array['area','content','frequency','cleaning_time','responsible','note'] loop
   labels:=item->field;
   if jsonb_typeof(labels) is distinct from 'object' then raise exception 'invalid_environment';end if;
   for lang in select jsonb_object_keys(labels) loop
    if lang not in ('zh','en','es','vi') or jsonb_typeof(labels->lang) is distinct from 'string' or length(labels->>lang)>2000 then raise exception 'invalid_environment';end if;
   end loop;
  end loop;
  if not exists(select 1 from jsonb_each_text(item->'area') where length(trim(value))>0) then raise exception 'invalid_environment';end if;
 end loop;
 if p_map is not null and not exists(select 1 from inspection_reference_photos where id=p_map and country_code=p_country and (uploaded_by=p_account or id=previous.map_photo_id)) then raise exception 'invalid_photo';end if;
 insert into environment_templates(country_code,department_id,items,map_photo_id,revision,updated_by) values(p_country,p_department,p_items,p_map,p_revision+1,p_account)
 on conflict(department_id) do update set items=excluded.items,map_photo_id=excluded.map_photo_id,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_account,'environment_template_save','environment_template',p_department,jsonb_build_object('before',to_jsonb(previous),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $$;
create or replace function public.save_environment_record(p_country text,p_account uuid,p_department uuid,p_date date,p_revision integer,p_template_revision integer,p_results jsonb,p_inspector text,p_confirm boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous environment_records; saved environment_records; template environment_templates; items jsonb; photo uuid; result jsonb; local_day date; template_rev integer;
begin
 if not exists(select 1 from operator_accounts where id=p_account and is_active) or not account_can(p_account,p_country,p_department,'environment','view') then raise exception 'forbidden';end if;
 local_day:=(now() at time zone case p_country when 'TW' then 'Asia/Taipei' when 'VM' then 'Asia/Ho_Chi_Minh' else 'America/Mexico_City' end)::date;
 if p_date is null or p_date<date '2000-01-01' or p_date>local_day or p_confirm is null or coalesce(length(trim(p_inspector)),0) not between 1 and 100 then raise exception 'invalid_environment';end if;
 perform pg_advisory_xact_lock(hashtextextended('environment:'||p_country||':'||p_department,0));
 select * into previous from environment_records where country_code=p_country and department_id=p_department and inspection_date=p_date for update;
 if not account_can(p_account,p_country,p_department,'environment',case when previous.id is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
 if p_confirm and (not exists(select 1 from operator_accounts where id=p_account and role in ('admin','supervisor')) or not account_can(p_account,p_country,p_department,'environment','approve')) then raise exception 'forbidden';end if;
 if p_revision is null or p_revision<>coalesce(previous.revision,0) then raise exception 'record_changed';end if;
 if previous.id is not null then items:=previous.template_snapshot;photo:=previous.map_photo_id;template_rev:=previous.template_revision;
 else
  select * into template from environment_templates where country_code=p_country and department_id=p_department;
  if template.department_id is not null then items:=template.items;photo:=template.map_photo_id;template_rev:=template.revision;
  else select d.items into items from environment_defaults d where d.country_code=p_country;template_rev:=0;end if;
 end if;
 if p_template_revision is distinct from template_rev then raise exception 'record_changed';end if;
 if jsonb_typeof(p_results) is distinct from 'array' or jsonb_array_length(p_results)<>jsonb_array_length(items) or coalesce(jsonb_array_length(items),0)=0 then raise exception 'invalid_environment';end if;
 for result in select value from jsonb_array_elements(p_results) loop
  if jsonb_typeof(result) is distinct from 'object' or jsonb_typeof(result->'value') is distinct from 'string' or result->>'value' not in ('','O','△','N/A') or jsonb_typeof(result->'note') is distinct from 'string' or length(result->>'note')>2000 then raise exception 'invalid_environment';end if;
  if p_confirm and result->>'value'='' then raise exception 'confirmation_incomplete';end if;
 end loop;
 insert into environment_records(country_code,department_id,inspection_date,template_snapshot,template_revision,map_photo_id,results,inspector,confirmed_by,confirmed_at,revision,updated_by)
 values(p_country,p_department,p_date,items,template_rev,photo,p_results,trim(p_inspector),case when p_confirm then p_account end,case when p_confirm then now() end,p_revision+1,p_account)
 on conflict(country_code,department_id,inspection_date) do update set results=excluded.results,inspector=excluded.inspector,confirmed_by=excluded.confirmed_by,confirmed_at=excluded.confirmed_at,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_account,'environment_record_save','environment_record',saved.id,jsonb_build_object('before',to_jsonb(previous),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $$;
revoke all on function public.save_environment_template(text,uuid,uuid,integer,jsonb,uuid),public.save_environment_record(text,uuid,uuid,date,integer,integer,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.save_environment_template(text,uuid,uuid,integer,jsonb,uuid),public.save_environment_record(text,uuid,uuid,date,integer,integer,jsonb,text,boolean) to service_role;

create or replace function public.save_navigation_settings(p_country text,p_account uuid,p_revision integer,p_config jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_row navigation_settings; result_row navigation_settings;
begin
 if p_country not in ('TW','VM','MX') or not exists(select 1 from operator_accounts where id=p_account and role='admin' and is_active) then raise exception 'forbidden'; end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_config) is distinct from 'object' or jsonb_typeof(p_config->'items') is distinct from 'array' or jsonb_array_length(p_config->'items') not in (25,27) then raise exception 'invalid_navigation'; end if;
 perform pg_advisory_xact_lock(hashtextextended('navigation:'||p_country,0));
 select * into current_row from navigation_settings where country_code=p_country for update;
 if coalesce(current_row.revision,0)<>p_revision then raise exception 'record_changed'; end if;
 insert into navigation_settings(country_code,config,revision,updated_by) values(p_country,p_config,p_revision+1,p_account)
 on conflict(country_code) do update set config=excluded.config,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now()
 returning * into result_row;
 insert into audit_logs(country_code,account_id,action,entity_type,payload) values(p_country,p_account,'navigation_save','navigation_settings',jsonb_build_object('revision',result_row.revision,'before',current_row.config,'after',p_config));
 return to_jsonb(result_row);
end $$;
revoke all on function public.save_navigation_settings(text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_navigation_settings(text,uuid,integer,jsonb) to service_role;
