create or replace function public.save_scrap_month(p_country text,p_account uuid,p_department uuid,p_month text,p_revision integer,p_rows jsonb,p_quotes jsonb,p_details jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare prev scrap_months; saved scrap_months; it jsonb; old_it jsonb; ids text[]:=array[]::text[]; names text[]:=array[]::text[]; normalized jsonb:='[]'; gross numeric; tare numeric; price numeric; f text;
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
  if old_it is null or (it-'net_weight') is distinct from (old_it-'net_weight') then
   if not account_can(p_account,p_country,p_department,'scrap',case when old_it is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
  end if;
  normalized:=normalized||jsonb_build_array((it-'net_weight')||jsonb_build_object('net_weight',gross-tare));
 end loop;
 if exists(select 1 from jsonb_array_elements(coalesce(prev.rows,'[]')) e where not(e->>'id'=any(ids))) and not account_can(p_account,p_country,p_department,'scrap','delete') then raise exception 'forbidden';end if;
 insert into scrap_months(country_code,department_id,month,rows,quotes,details,revision,updated_by) values(p_country,p_department,p_month,normalized,p_quotes,p_details,p_revision+1,p_account)
 on conflict(country_code,department_id,month) do update set rows=excluded.rows,quotes=excluded.quotes,details=excluded.details,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_account,'scrap_month_save','scrap_month',saved.id,jsonb_build_object('before',to_jsonb(prev),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $$;
revoke all on function public.save_scrap_month(text,uuid,uuid,text,integer,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_scrap_month(text,uuid,uuid,text,integer,jsonb,jsonb,jsonb) to service_role;

