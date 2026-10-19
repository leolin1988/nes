-- A durable number per department/month/group/item/scrap document.
create table public.scrap_detail_counters (
 country_code text not null check(country_code in ('TW','VM','MX')),
 month text not null check(month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
 last_number integer not null check(last_number>0),primary key(country_code,month)
);
create table public.scrap_detail_numbers (
 id uuid primary key default gen_random_uuid(),country_code text not null,month text not null,
 department_id uuid not null references public.departments(id),group_key jsonb not null,
 serial integer not null check(serial>0),reference text not null unique,created_at timestamptz not null default now(),
 foreign key(country_code,month) references public.scrap_detail_counters(country_code,month),
 unique(country_code,month,serial),unique(country_code,month,department_id,group_key)
);
alter table public.scrap_detail_counters enable row level security;
alter table public.scrap_detail_numbers enable row level security;
revoke all on public.scrap_detail_counters,public.scrap_detail_numbers from public,anon,authenticated;
grant all on public.scrap_detail_counters,public.scrap_detail_numbers to service_role;

create or replace function public.assign_scrap_detail_number(p_country text,p_department uuid,p_month text,p_key jsonb)
returns public.scrap_detail_numbers language plpgsql security invoker set search_path=public,pg_temp as $$
declare result scrap_detail_numbers; next_number integer;
begin
 if p_country not in ('TW','VM','MX') or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'
 or jsonb_typeof(p_key) is distinct from 'array' or jsonb_array_length(p_key)<>3
 or not exists(select 1 from departments where id=p_department and country_code=p_country) then raise exception 'invalid_scrap';end if;
 -- Serialize allocation across all departments in this country's month.
 perform pg_advisory_xact_lock(hashtextextended('scrap-numbers:'||p_country||':'||p_month,0));
 select * into result from scrap_detail_numbers where country_code=p_country and department_id=p_department and month=p_month and group_key=p_key;
 if result.id is not null then return result;end if;
 insert into scrap_detail_counters(country_code,month,last_number) values(p_country,p_month,1)
 on conflict(country_code,month) do update set last_number=scrap_detail_counters.last_number+1 returning last_number into next_number;
 insert into scrap_detail_numbers(country_code,department_id,month,group_key,serial,reference)
 values(p_country,p_department,p_month,p_key,next_number,p_country||'-'||replace(p_month,'-','')||'-'||lpad(next_number::text,greatest(4,length(next_number::text)),'0')) returning * into result;
 return result;
end $$;
revoke all on function public.assign_scrap_detail_number(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.assign_scrap_detail_number(text,uuid,text,jsonb) to service_role;

create or replace function public.save_scrap_month(p_country text,p_account uuid,p_department uuid,p_month text,p_revision integer,p_rows jsonb,p_quotes jsonb,p_details jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare prev scrap_months; saved scrap_months; it jsonb; old_it jsonb; ids text[]:=array[]::text[]; names text[]:=array[]::text[]; normalized jsonb:='[]'; gross numeric; tare numeric; price numeric; f text; number_row scrap_detail_numbers;
begin
 if p_country not in ('TW','VM','MX') or not exists(select 1 from operator_accounts where id=p_account and is_active and role in ('admin','supervisor'))
 or not exists(select 1 from departments where id=p_department and country_code=p_country and is_active)
 or not account_can(p_account,p_country,p_department,'scrap','view') then raise exception 'forbidden';end if;
 if p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' or p_revision is null or p_revision<0
 or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>500
 or jsonb_typeof(p_quotes) is distinct from 'array' or jsonb_array_length(p_quotes) not between 1 and 100
 or jsonb_typeof(p_details) is distinct from 'object' then raise exception 'invalid_scrap';end if;
 perform pg_advisory_xact_lock(hashtextextended('scrap:'||p_country||':'||p_department||':'||p_month,0));
 select * into prev from scrap_months where country_code=p_country and department_id=p_department and month=p_month for update;
 if coalesce(prev.revision,0)<>p_revision then raise exception 'record_changed';end if;
 for it in select value from jsonb_array_elements(p_quotes) loop
  if jsonb_typeof(it) is distinct from 'object' or coalesce(length(btrim(it->>'item')),0) not between 1 and 100 or it->>'item'=any(names) then raise exception 'invalid_scrap';end if;
  names:=array_append(names,it->>'item');
  if it->'price'<>'null'::jsonb then
   if jsonb_typeof(it->'price') is distinct from 'number' then raise exception 'invalid_scrap';end if;
   price:=(it->>'price')::numeric;if price<0 or price>1000000 or price<>round(price,4) then raise exception 'invalid_scrap';end if;
  elsif not it ? 'price' then raise exception 'invalid_scrap';end if;
 end loop;
 for f in select jsonb_object_keys(p_details) loop
  if f not in ('application_date','document_no','vendor','currency','general_manager','finance','manager','applicant','executors','actual_weight','actual_price','note') or jsonb_typeof(p_details->f) is distinct from 'string' or length(p_details->>f)>2000 then raise exception 'invalid_scrap';end if;
 end loop;
 if coalesce(p_details->>'application_date','')<>'' and (p_details->>'application_date') !~ '^20[0-9]{2}-(0[1-9]|1[0-2])-[0-9]{2}$' then raise exception 'invalid_scrap';end if;
 foreach f in array array['actual_weight','actual_price'] loop
  if coalesce(p_details->>f,'')<>'' and ((p_details->>f) !~ '^[0-9]{1,9}(\.[0-9]{1,4})?$') then raise exception 'invalid_scrap';end if;
 end loop;
 if prev.id is null or p_quotes is distinct from prev.quotes or p_details is distinct from prev.details then
  if not account_can(p_account,p_country,p_department,'scrap',case when prev.id is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
 end if;
 for it in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(it) is distinct from 'object' or coalesce(it->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f-]{27}$' or it->>'id'=any(ids) then raise exception 'invalid_scrap';end if;
  ids:=array_append(ids,it->>'id');
  foreach f in array array['group_name','item','barrel_no','scrap_no','reference','note'] loop
   if jsonb_typeof(it->f) is distinct from 'string' or length(it->>f)>500 then raise exception 'invalid_scrap';end if;
  end loop;
  if btrim(it->>'group_name')='' or btrim(it->>'barrel_no')='' or not (it->>'item'=any(names)) then raise exception 'invalid_scrap';end if;
  if jsonb_typeof(it->'gross_weight') is distinct from 'number' or jsonb_typeof(it->'tare_weight') is distinct from 'number' then raise exception 'invalid_scrap';end if;
  gross:=(it->>'gross_weight')::numeric;tare:=(it->>'tare_weight')::numeric;
  if gross<0 or tare<0 or tare>gross or gross>100000000 or gross<>round(gross,3) or tare<>round(tare,3) then raise exception 'invalid_scrap';end if;
  select value into old_it from jsonb_array_elements(coalesce(prev.rows,'[]')) where value->>'id'=it->>'id';
  if old_it is null or (it-array['net_weight','reference','detail_id','legacy_reference']) is distinct from (old_it-array['net_weight','reference','detail_id','legacy_reference']) then
   if not account_can(p_account,p_country,p_department,'scrap',case when old_it is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
  end if;
  number_row:=assign_scrap_detail_number(p_country,p_department,p_month,jsonb_build_array(it->>'group_name',it->>'item',it->>'scrap_no'));
  it:=it-array['net_weight','reference','detail_id','legacy_reference'];
  if old_it ? 'legacy_reference' then it:=it||jsonb_build_object('legacy_reference',old_it->>'legacy_reference');end if;
  normalized:=normalized||jsonb_build_array(it||jsonb_build_object('net_weight',gross-tare,'reference',number_row.reference,'detail_id',number_row.id));
 end loop;
 if exists(select 1 from jsonb_array_elements(coalesce(prev.rows,'[]')) e where not(e->>'id'=any(ids))) and not account_can(p_account,p_country,p_department,'scrap','delete') then raise exception 'forbidden';end if;
 insert into scrap_months(country_code,department_id,month,rows,quotes,details,revision,updated_by) values(p_country,p_department,p_month,normalized,p_quotes,p_details,p_revision+1,p_account)
 on conflict(country_code,department_id,month) do update set rows=excluded.rows,quotes=excluded.quotes,details=excluded.details,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_account,'scrap_month_save','scrap_month',saved.id,jsonb_build_object('before',to_jsonb(prev),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $$;
revoke all on function public.save_scrap_month(text,uuid,uuid,text,integer,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_scrap_month(text,uuid,uuid,text,integer,jsonb,jsonb,jsonb) to service_role;

-- Backfill existing data; retain manually entered references as historical metadata.
do $$
declare rec scrap_months; it jsonb; normalized jsonb; number_row scrap_detail_numbers;
begin
 for rec in select * from scrap_months order by country_code,month,department_id loop
  normalized:='[]';
  for it in select value from jsonb_array_elements(rec.rows) loop
   number_row:=assign_scrap_detail_number(rec.country_code,rec.department_id,rec.month,jsonb_build_array(it->>'group_name',it->>'item',it->>'scrap_no'));
   if coalesce(it->>'reference','')<>'' and not(it ? 'legacy_reference') then it:=it||jsonb_build_object('legacy_reference',it->>'reference');end if;
   normalized:=normalized||jsonb_build_array(it||jsonb_build_object('detail_id',number_row.id,'reference',number_row.reference));
  end loop;
  if normalized is distinct from rec.rows then
   update scrap_months set rows=normalized,revision=revision+1,updated_at=now() where id=rec.id;
   insert into audit_logs(country_code,action,entity_type,entity_id,payload) values(rec.country_code,'scrap_reference_backfill','scrap_month',rec.id,jsonb_build_object('before',rec.rows,'after',normalized));
  end if;
 end loop;
end $$;
