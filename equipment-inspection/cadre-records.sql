-- QR18-13-D: one department sheet per month, persisted as one row per day.
create table public.cadre_daily_records (
 id uuid primary key default gen_random_uuid(),
 country_code text not null check (country_code in ('TW','VM','MX')),
 department_id uuid not null references public.departments(id),
 inspection_date date not null,
 template_version text not null default 'QR18-13-D-monthly-v1' check (template_version='QR18-13-D-monthly-v1'),
 results jsonb not null check (jsonb_typeof(results)='array' and jsonb_array_length(results)=16),
 duty_name text not null check (length(duty_name) between 1 and 100),
 supervisor_name text not null default '',
 confirmed_at timestamptz,
 updated_by uuid not null references public.operator_accounts(id),
 updated_at timestamptz not null default now(),
 revision integer not null default 1 check (revision>0),
 unique(country_code,department_id,inspection_date)
);
alter table public.cadre_daily_records enable row level security;
revoke all on public.cadre_daily_records from public,anon,authenticated;
grant select,insert,update,delete on public.cadre_daily_records to service_role;

create or replace function public.save_cadre_daily(
 p_country text,p_department uuid,p_date date,p_account uuid,p_revision integer,
 p_results jsonb,p_duty text,p_supervisor text,p_confirm boolean
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare u record; prior public.cadre_daily_records; saved public.cadre_daily_records; i integer; v jsonb;
begin
 select role,department_id,is_active into u from public.operator_accounts where id=p_account;
 if not found or not u.is_active or u.role not in ('admin','supervisor') then raise exception 'forbidden' using errcode='42501'; end if;
 if u.role<>'admin' and u.department_id<>p_department then raise exception 'forbidden' using errcode='42501'; end if;
 if not exists(select 1 from public.departments where id=p_department and country_code=p_country and is_active) then raise exception 'invalid_department' using errcode='22023'; end if;
 if p_date is null or p_date>(now() at time zone 'Asia/Taipei')::date or p_date<date '2000-01-01'
  or p_revision is null or p_revision<0 or p_results is null or jsonb_typeof(p_results)<>'array'
  or jsonb_array_length(p_results)<>16 or p_duty is null or length(btrim(p_duty)) not between 1 and 100
  or p_supervisor is null or length(p_supervisor)>100 or p_confirm is null then raise exception 'invalid_cadre_record' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('cadre:'||p_country||':'||p_department::text||':'||p_date::text,0));
 select * into prior from public.cadre_daily_records where country_code=p_country and department_id=p_department and inspection_date=p_date for update;
 if coalesce(prior.revision,0)<>p_revision then raise exception 'record_changed' using errcode='40001'; end if;
 for i in 0..15 loop
  v:=p_results->i;
  if jsonb_typeof(v)<>'object' or (v->>'id') is distinct from (i+1)::text or not(v ? 'value')
   or jsonb_typeof(v->'value')<>'string' or v->>'value' not in ('','V','∖','Φ','N/A')
   or jsonb_typeof(v->'note') is distinct from 'string' or length(v->>'note')>2000 then raise exception 'invalid_cadre_record' using errcode='22023'; end if;
  if v->>'value'='Φ' and coalesce(prior.results->i->>'value','') not in ('∖','Φ') then raise exception 'improvement_requires_issue' using errcode='22023'; end if;
  if p_confirm and (v->>'value'='' or length(btrim(p_supervisor))=0) then raise exception 'confirmation_incomplete' using errcode='22023'; end if;
 end loop;
 insert into public.cadre_daily_records(country_code,department_id,inspection_date,results,duty_name,supervisor_name,confirmed_at,updated_by,revision)
 values(p_country,p_department,p_date,p_results,btrim(p_duty),case when p_confirm then btrim(p_supervisor) else '' end,case when p_confirm then now() end,p_account,coalesce(prior.revision,0)+1)
 on conflict(country_code,department_id,inspection_date) do update set results=excluded.results,duty_name=excluded.duty_name,
 supervisor_name=excluded.supervisor_name,confirmed_at=excluded.confirmed_at,updated_by=excluded.updated_by,updated_at=now(),revision=excluded.revision
 returning * into saved;
 insert into public.audit_logs(account_id,action,entity_type,entity_id,payload,country_code)
 values(p_account,'cadre_daily_save','cadre_daily_record',saved.id,jsonb_build_object('before',to_jsonb(prior),'after',to_jsonb(saved)),p_country);
 return to_jsonb(saved);
end $$;
revoke all on function public.save_cadre_daily(text,uuid,date,uuid,integer,jsonb,text,text,boolean) from public,anon,authenticated;
grant execute on function public.save_cadre_daily(text,uuid,date,uuid,integer,jsonb,text,text,boolean) to service_role;
