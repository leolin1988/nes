alter table public.scrap_months add column merged_into uuid references public.departments(id);
create table public.scrap_shared_quotes (
 country_code text not null check(country_code in ('TW','VM','MX')),month text not null check(month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),currency text not null,
 item text not null check(length(item) between 1 and 100),price numeric check(price between 0 and 1000000 and price=round(price,4)),
 updated_by uuid references public.operator_accounts(id),updated_at timestamptz not null default now(),primary key(country_code,month,currency,item)
);
create table public.scrap_quote_versions(country_code text not null,month text not null,currency text not null,revision integer not null default 0,primary key(country_code,month,currency));
alter table public.scrap_quote_versions enable row level security;
revoke all on public.scrap_quote_versions from public,anon,authenticated;
grant all on public.scrap_quote_versions to service_role;
create or replace function public.scrap_quote_snapshot(c text,m text,cur text) returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('revision',coalesce((select revision from scrap_quote_versions where country_code=c and month=m and currency=cur),0),'quotes',coalesce((select jsonb_agg(jsonb_build_object('item',item,'price',price) order by item) from scrap_shared_quotes where country_code=c and month=m and currency=cur),'[]'::jsonb))
$$;
revoke all on function public.scrap_quote_snapshot(text,text,text) from public,anon,authenticated;
grant execute on function public.scrap_quote_snapshot(text,text,text) to service_role;
create table public.scrap_department_merges (
 country_code text not null,primary_department uuid not null references public.departments(id),secondary_department uuid not null references public.departments(id),
 label jsonb not null,primary key(country_code,primary_department),unique(country_code,secondary_department),check(primary_department<>secondary_department)
);
alter table public.scrap_shared_quotes enable row level security;
alter table public.scrap_department_merges enable row level security;
revoke all on public.scrap_shared_quotes,public.scrap_department_merges from public,anon,authenticated;
grant all on public.scrap_shared_quotes,public.scrap_department_merges to service_role;
create or replace function public.scrap_account_can(a uuid,c text,d uuid,act text) returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select account_can(a,c,d,'scrap',act) or exists(select 1 from scrap_department_merges m where m.country_code=c and d in(m.primary_department,m.secondary_department)
 and (account_can(a,c,m.primary_department,'scrap',act) or account_can(a,c,m.secondary_department,'scrap',act)))
$$;
revoke all on function public.scrap_account_can(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.scrap_account_can(uuid,text,uuid,text) to service_role;
-- Initialize only unambiguous existing prices, retaining the raw source in audit snapshots.
do $$ begin
 if exists(select 1 from scrap_months s cross join lateral jsonb_array_elements(s.quotes) q where q->>'price' is not null group by s.country_code,s.month,coalesce(s.details->>'currency',case s.country_code when 'TW' then 'TWD' when 'VM' then 'VND' else 'MXN' end),q->>'item' having count(distinct q->>'price')>1) then raise exception 'conflicting_existing_prices';end if;
end $$;
insert into scrap_shared_quotes(country_code,month,currency,item,price,updated_by)
select distinct on(s.country_code,s.month,coalesce(s.details->>'currency',case s.country_code when 'TW' then 'TWD' when 'VM' then 'VND' else 'MXN' end),q->>'item')
 s.country_code,s.month,coalesce(s.details->>'currency',case s.country_code when 'TW' then 'TWD' when 'VM' then 'VND' else 'MXN' end),q->>'item',(q->>'price')::numeric,s.updated_by
from scrap_months s cross join lateral jsonb_array_elements(s.quotes) q order by s.country_code,s.month,coalesce(s.details->>'currency',case s.country_code when 'TW' then 'TWD' when 'VM' then 'VND' else 'MXN' end),q->>'item',(q->>'price')::numeric nulls last;
insert into scrap_quote_versions(country_code,month,currency,revision) select distinct country_code,month,currency,1 from scrap_shared_quotes;
insert into scrap_department_merges(country_code,primary_department,secondary_department,label)
select a.country_code,a.id,b.id,'{"zh":"車修／精密車修組","en":"Machining / Precision machining","es":"Mecanizado / Mecanizado de precisión","vi":"Gia công / Gia công chính xác"}'::jsonb
from departments a join departments b on b.country_code=a.country_code where a.name_zh='車修組' and b.name_zh='精密車修組' and a.is_active and b.is_active;
do $$ declare m scrap_department_merges; src scrap_months; dst scrap_months; merged scrap_months; rr jsonb; qq jsonb;begin
 for m in select * from scrap_department_merges loop
  for src in select * from scrap_months where country_code=m.country_code and department_id=m.secondary_department loop
   select * into dst from scrap_months where country_code=m.country_code and department_id=m.primary_department and month=src.month for update;
   if dst.id is not null and coalesce(dst.details->>'currency','')<>coalesce(src.details->>'currency','') then raise exception 'merge_currency_conflict';end if;
   if exists(select 1 from jsonb_array_elements(coalesce(dst.rows,'[]')) a join jsonb_array_elements(src.rows) b on a->>'id'=b->>'id') then raise exception 'merge_duplicate_row_id';end if;
   select coalesce(jsonb_agg(case when r->>'group_name' in ('車修組','精密車修組') then jsonb_set(r,'{group_name}',m.label->'zh') else r end),'[]') into rr from jsonb_array_elements(coalesce(dst.rows,'[]')||src.rows) r;
   select jsonb_agg(q) into qq from (select distinct on(q->>'item') q from jsonb_array_elements(coalesce(dst.quotes,'[]')||src.quotes) q order by q->>'item') z;
   insert into scrap_months(country_code,department_id,month,rows,quotes,details,revision,updated_by) values(m.country_code,m.primary_department,src.month,rr,qq,src.details||coalesce(dst.details,'{}'),coalesce(dst.revision,0)+1,src.updated_by)
   on conflict(country_code,department_id,month) do update set rows=excluded.rows,quotes=excluded.quotes,details=excluded.details,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into merged;
   insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(m.country_code,src.updated_by,'scrap_departments_merge','scrap_month',merged.id,jsonb_build_object('primary_before',to_jsonb(dst),'secondary_before',to_jsonb(src),'after',to_jsonb(merged)));
   update scrap_months set merged_into=m.primary_department where id=src.id; -- Preserve the complete original source record as an archive.
  end loop;
 end loop;
end $$;
-- Normalize every saved department to the common country/month/currency quote.
do $$ declare old scrap_months; qq jsonb;begin
 for old in select * from scrap_months where merged_into is null loop
  select jsonb_agg(q||jsonb_build_object('price',c.price) order by ord) into qq from jsonb_array_elements(old.quotes) with ordinality a(q,ord)
  left join scrap_shared_quotes c on c.country_code=old.country_code and c.month=old.month and c.currency=coalesce(old.details->>'currency',case old.country_code when 'TW' then 'TWD' when 'VM' then 'VND' else 'MXN' end) and c.item=q->>'item';
  if qq is distinct from old.quotes then
   update scrap_months set quotes=qq,revision=revision+1,updated_at=now() where id=old.id;
   insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(old.country_code,old.updated_by,'scrap_quotes_unify','scrap_month',old.id,jsonb_build_object('before',to_jsonb(old),'quotes',qq));
  end if;
 end loop;
end $$;
drop function public.save_scrap_month(text,uuid,uuid,text,integer,jsonb,jsonb,jsonb);
create or replace function public.save_scrap_month(p_country text,p_account uuid,p_department uuid,p_month text,p_revision integer,p_rows jsonb,p_quotes jsonb,p_details jsonb,p_quote_revision integer default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare prev scrap_months; saved scrap_months; it jsonb; old_it jsonb; ids text[]:=array[]::text[]; names text[]:=array[]::text[]; normalized jsonb:='[]'; gross numeric; tare numeric; price numeric; f text; number_row scrap_detail_numbers; currency_code text; shared_price numeric; other_prev scrap_months; other_saved scrap_months; other_quotes jsonb; quote_revision integer; quote_changed boolean:=false;
begin
 if p_country not in ('TW','VM','MX') or not exists(select 1 from operator_accounts where id=p_account and is_active and role in ('admin','supervisor'))
 or not exists(select 1 from departments where id=p_department and country_code=p_country and is_active)
 or not scrap_account_can(p_account,p_country,p_department,'view') then raise exception 'forbidden';end if;
 if p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' or p_revision is null or p_revision<0
 or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>500
 or jsonb_typeof(p_quotes) is distinct from 'array' or jsonb_array_length(p_quotes) not between 1 and 100
 or jsonb_typeof(p_details) is distinct from 'object' then raise exception 'invalid_scrap';end if;
 if exists(select 1 from scrap_department_merges where country_code=p_country and secondary_department=p_department) then raise exception 'record_changed';end if;
 perform pg_advisory_xact_lock(hashtextextended('scrap-quotes:'||p_country||':'||p_month,0));
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
 currency_code:=coalesce(nullif(p_details->>'currency',''),case p_country when 'TW' then 'TWD' when 'VM' then 'VND' else 'MXN' end);
 if currency_code not in ('TWD','VND','MXN','USD','EUR','CNY','JPY') then raise exception 'invalid_scrap';end if;
 select revision into quote_revision from scrap_quote_versions where country_code=p_country and month=p_month and currency=currency_code;
 if p_quote_revision is not null and p_quote_revision<>coalesce(quote_revision,0) then raise exception 'record_changed';end if;
 for it in select value from jsonb_array_elements(p_quotes) loop
  select sq.price into shared_price from scrap_shared_quotes sq where country_code=p_country and month=p_month and currency=currency_code and item=it->>'item';
  if exists(select 1 from operator_accounts where id=p_account and role='admin') then
   if not exists(select 1 from scrap_shared_quotes where country_code=p_country and month=p_month and currency=currency_code and item=it->>'item') or shared_price is distinct from (it->>'price')::numeric then quote_changed:=true;end if;
   insert into scrap_shared_quotes(country_code,month,currency,item,price,updated_by) values(p_country,p_month,currency_code,it->>'item',(it->>'price')::numeric,p_account)
   on conflict(country_code,month,currency,item) do update set price=excluded.price,updated_by=excluded.updated_by,updated_at=now();
  elsif it->>'price' is not null and (it->>'price')::numeric is distinct from shared_price then raise exception 'forbidden';end if;
 end loop;
 if quote_changed then insert into scrap_quote_versions(country_code,month,currency,revision) values(p_country,p_month,currency_code,1) on conflict(country_code,month,currency) do update set revision=scrap_quote_versions.revision+1 returning revision into quote_revision;end if;
 select jsonb_agg(q||jsonb_build_object('price',c.price) order by ord) into p_quotes from jsonb_array_elements(p_quotes) with ordinality a(q,ord)
 left join scrap_shared_quotes c on c.country_code=p_country and c.month=p_month and c.currency=currency_code and c.item=q->>'item';
 for f in select jsonb_object_keys(p_details) loop
  if f not in ('application_date','document_no','vendor','currency','general_manager','finance','manager','applicant','executors','actual_weight','actual_price','note') or jsonb_typeof(p_details->f) is distinct from 'string' or length(p_details->>f)>2000 then raise exception 'invalid_scrap';end if;
 end loop;
 if coalesce(p_details->>'application_date','')<>'' and (p_details->>'application_date') !~ '^20[0-9]{2}-(0[1-9]|1[0-2])-[0-9]{2}$' then raise exception 'invalid_scrap';end if;
 foreach f in array array['actual_weight','actual_price'] loop
  if coalesce(p_details->>f,'')<>'' and ((p_details->>f) !~ '^[0-9]{1,9}(\.[0-9]{1,4})?$') then raise exception 'invalid_scrap';end if;
 end loop;
 if prev.id is null or p_quotes is distinct from prev.quotes or p_details is distinct from prev.details then
  if not scrap_account_can(p_account,p_country,p_department,case when prev.id is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
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
   if not scrap_account_can(p_account,p_country,p_department,case when old_it is null then 'create' else 'edit' end) then raise exception 'forbidden';end if;
  end if;
  number_row:=null;
  if old_it->>'detail_id' is not null and jsonb_build_array(it->>'group_name',it->>'item',it->>'scrap_no')=jsonb_build_array(old_it->>'group_name',old_it->>'item',old_it->>'scrap_no') then
   select * into number_row from scrap_detail_numbers where id=(old_it->>'detail_id')::uuid and country_code=p_country and month=p_month;
  end if;
  if number_row.id is null then number_row:=assign_scrap_detail_number(p_country,p_department,p_month,jsonb_build_array(it->>'group_name',it->>'item',it->>'scrap_no'));end if;
  it:=it-array['net_weight','reference','detail_id','legacy_reference'];
  if old_it ? 'legacy_reference' then it:=it||jsonb_build_object('legacy_reference',old_it->>'legacy_reference');end if;
  normalized:=normalized||jsonb_build_array(it||jsonb_build_object('net_weight',gross-tare,'reference',number_row.reference,'detail_id',number_row.id));
 end loop;
 if exists(select 1 from jsonb_array_elements(coalesce(prev.rows,'[]')) e where not(e->>'id'=any(ids))) and not scrap_account_can(p_account,p_country,p_department,'delete') then raise exception 'forbidden';end if;
 insert into scrap_months(country_code,department_id,month,rows,quotes,details,revision,updated_by) values(p_country,p_department,p_month,normalized,p_quotes,p_details,p_revision+1,p_account)
 on conflict(country_code,department_id,month) do update set rows=excluded.rows,quotes=excluded.quotes,details=excluded.details,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_account,'scrap_month_save','scrap_month',saved.id,jsonb_build_object('before',to_jsonb(prev),'after',to_jsonb(saved)));
 for other_prev in select * from scrap_months where country_code=p_country and month=p_month and id<>saved.id and merged_into is null and coalesce(nullif(details->>'currency',''),case p_country when 'TW' then 'TWD' when 'VM' then 'VND' else 'MXN' end)=currency_code for update loop
  select jsonb_agg(q||jsonb_build_object('price',c.price) order by ord) into other_quotes from jsonb_array_elements(other_prev.quotes) with ordinality a(q,ord)
  left join scrap_shared_quotes c on c.country_code=p_country and c.month=p_month and c.currency=currency_code and c.item=q->>'item';
  if other_quotes is distinct from other_prev.quotes then
   update scrap_months set quotes=other_quotes,revision=revision+1,updated_at=now(),updated_by=p_account where id=other_prev.id returning * into other_saved;
   insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_account,'scrap_shared_quote_sync','scrap_month',other_prev.id,jsonb_build_object('before',to_jsonb(other_prev),'after',to_jsonb(other_saved)));
  end if;
 end loop;
 return to_jsonb(saved)||jsonb_build_object('quote_revision',coalesce(quote_revision,0));
end $$;
revoke all on function public.save_scrap_month(text,uuid,uuid,text,integer,jsonb,jsonb,jsonb,integer) from public,anon,authenticated;
grant execute on function public.save_scrap_month(text,uuid,uuid,text,integer,jsonb,jsonb,jsonb,integer) to service_role;

