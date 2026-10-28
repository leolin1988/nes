create table public.scale_months (
 country_code text not null check(country_code in ('TW','VM','MX')),
 department_id uuid not null references public.departments(id),
 month date not null check(extract(day from month)=1),
 document jsonb not null, revision integer not null default 1,
 updated_by uuid not null references public.operator_accounts(id), updated_at timestamptz not null default now(),
 primary key(country_code,department_id,month)
);
alter table public.scale_months enable row level security;
revoke all on public.scale_months from public,anon,authenticated;
grant all on public.scale_months to service_role;
insert into public.access_resources(resource,label,actions,sort_order) values('scale','{"zh":"QR705-01 磅秤日常點檢表","en":"QR705-01 Daily scale inspection","es":"QR705-01 Inspección diaria de básculas","vi":"QR705-01 Kiểm tra cân hằng ngày"}',array['view','create','edit'],30);
create function public.save_scale_month(p_country text,p_actor uuid,p_department uuid,p_month date,p_revision integer,p_document jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare old public.scale_months; saved public.scale_months; local_day date; row_data jsonb; entry jsonb; day_key text; scale_ids text[]:='{}';
begin
 if not account_can(p_actor,p_country,p_department,'scale','view') then raise exception 'forbidden';end if;
 local_day:=(now() at time zone case p_country when 'TW' then 'Asia/Taipei' when 'VM' then 'Asia/Ho_Chi_Minh' else 'America/Mexico_City' end)::date;
 if p_month is null or p_month<date '2000-01-01' or extract(day from p_month)<>1 or p_month>local_day then raise exception 'invalid_date';end if;
 perform pg_advisory_xact_lock(hashtextextended('scale:'||p_country||p_department||p_month,0));
 select * into old from scale_months where country_code=p_country and department_id=p_department and month=p_month for update;
 if not account_can(p_actor,p_country,p_department,'scale',case when old.revision is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
 if p_revision is null or p_revision<>coalesce(old.revision,0) then raise exception 'record_changed';end if;
 if jsonb_typeof(p_document)<>'object' or jsonb_typeof(p_document->'rows') is distinct from 'array' or jsonb_array_length(p_document->'rows') not between 1 and 30
 or coalesce(length(p_document->>'weightId'),0)>100 or coalesce(length(p_document->>'notes'),0)>4000
 or not (coalesce(p_document->>'minimum','') ~ '^\d+(\.\d{1,6})?$') or not (coalesce(p_document->>'maximum','') ~ '^\d+(\.\d{1,6})?$')
 then raise exception 'invalid_scale';end if;
 if (p_document->>'minimum')::numeric>(p_document->>'maximum')::numeric then raise exception 'invalid_scale';end if;
 for row_data in select value from jsonb_array_elements(p_document->'rows') loop
  if coalesce(length(row_data->>'number'),0)>100 or jsonb_typeof(row_data->'days') is distinct from 'object' then raise exception 'invalid_scale';end if;
  if coalesce(row_data->>'number','')<>'' then
   if row_data->>'number'=any(scale_ids) then raise exception 'duplicate_scale';end if;
   scale_ids:=array_append(scale_ids,row_data->>'number');
  end if;
  for day_key,entry in select key,value from jsonb_each(row_data->'days') loop
   if not day_key ~ '^[1-9][0-9]?$' then raise exception 'invalid_date';end if;
   if day_key::integer>extract(day from (p_month+interval '1 month' - interval '1 day')) or p_month+day_key::integer-1>local_day then raise exception 'invalid_date';end if;
   if coalesce(row_data->>'number','')='' or coalesce(p_document->>'weightId','')='' then raise exception 'missing_identifiers';end if;
   if coalesce(entry->>'value','') not in ('△','X') and not (coalesce(entry->>'value','') ~ '^\d+(\.\d{1,6})?$') then raise exception 'invalid_reading';end if;
   if coalesce(length(trim(entry->>'inspector')),0) not between 1 and 100 then raise exception 'missing_inspector';end if;
  end loop;
 end loop;
 insert into scale_months(country_code,department_id,month,document,revision,updated_by) values(p_country,p_department,p_month,p_document,p_revision+1,p_actor)
 on conflict(country_code,department_id,month) do update set document=excluded.document,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_actor,'scale_month_save','scale_month',p_department,jsonb_build_object('month',p_month,'before',to_jsonb(old),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $$;
revoke all on function public.save_scale_month(text,uuid,uuid,date,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_scale_month(text,uuid,uuid,date,integer,jsonb) to service_role;
