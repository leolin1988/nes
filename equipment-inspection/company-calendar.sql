-- QR18-03 planned closures are separate from human inspections and signatures.
create table public.company_calendars (
 id uuid primary key default gen_random_uuid(), country_code text not null unique check(country_code in ('TW','VM','MX')),
 timezone text not null, enabled boolean not null default true, weekends_off boolean not null default true,
 effective_date date not null, revision integer not null default 1,
 updated_by uuid references public.operator_accounts(id), updated_at timestamptz not null default now(), last_run_at timestamptz
);
create table public.company_calendar_days (
 id uuid primary key default gen_random_uuid(), country_code text not null references public.company_calendars(country_code),
 calendar_date date not null, day_type text not null check(day_type in ('holiday','workday')),
 label text not null check(length(label) between 1 and 100), unique(country_code,calendar_date)
);
create table public.calendar_auto_stops (
 id uuid primary key default gen_random_uuid(), country_code text not null references public.company_calendars(country_code),
 equipment_id uuid not null references public.equipments(id), inspection_date date not null,
 reason text not null check(reason in ('weekend','holiday')), holiday_label text not null default '', timezone text not null,
 due_at timestamptz not null, created_at timestamptz not null default now(), calendar_revision integer not null,
 revoked_at timestamptz, revoked_reason text, unique(country_code,equipment_id,inspection_date)
);
create index calendar_auto_stops_equipment_date on public.calendar_auto_stops(equipment_id,inspection_date);
alter table public.company_calendars enable row level security;
alter table public.company_calendar_days enable row level security;
alter table public.calendar_auto_stops enable row level security;
revoke all on public.company_calendars,public.company_calendar_days,public.calendar_auto_stops from public,anon,authenticated;
grant all on public.company_calendars,public.company_calendar_days,public.calendar_auto_stops to service_role;
insert into public.company_calendars(country_code,timezone,effective_date)
select c,t,(now() at time zone t)::date from (values ('TW','Asia/Taipei'),('VM','Asia/Ho_Chi_Minh'),('MX','America/Mexico_City')) v(c,t);

create function public.calendar_stop_due(p_day date,p_timezone text,p_weekends boolean,p_type text)
returns timestamptz language sql stable security invoker set search_path=public,pg_temp as $$
 select case when p_type='workday' then null
 when extract(isodow from p_day) in (6,7) and (p_weekends or p_type='holiday')
 then ((p_day+(8-extract(isodow from p_day)::integer)) + time '12:00') at time zone p_timezone
 when p_type='holiday' then ((p_day+1)+time '12:00') at time zone p_timezone end
$$;

create function public.save_company_calendar(p_country text,p_account uuid,p_revision integer,p_year integer,
 p_timezone text,p_enabled boolean,p_weekends boolean,p_effective date,p_days jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.company_calendars; d jsonb; dt date;
begin
 if not exists(select 1 from operator_accounts where id=p_account and role='admin' and is_active) then raise exception 'forbidden'; end if;
 select * into c from company_calendars where country_code=p_country for update;
 if not found or p_revision is distinct from c.revision then raise exception 'record_changed'; end if;
 if p_year is null or p_year not between 2000 and 2100 or p_enabled is null or p_weekends is null
 or p_timezone is null or not exists(select 1 from pg_timezone_names where name=p_timezone)
 or p_effective is null or p_effective < c.effective_date or p_effective > date '2100-12-31'
 or jsonb_typeof(p_days) is distinct from 'array' or jsonb_array_length(p_days)>366 then raise exception 'invalid_calendar'; end if;
 if exists(select 1 from jsonb_array_elements(p_days) x group by x->>'date' having count(*)>1) then raise exception 'invalid_calendar'; end if;
 for d in select * from jsonb_array_elements(p_days) loop
  if coalesce(d->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'invalid_calendar'; end if;
  dt:=(d->>'date')::date;
  if extract(year from dt)<>p_year or coalesce(d->>'type','') not in ('holiday','workday')
   or length(trim(coalesce(d->>'label',''))) not between 1 and 100 then raise exception 'invalid_calendar'; end if;
 end loop;
 insert into audit_logs(account_id,action,entity_type,entity_id,country_code,payload)
 values(p_account,'company_calendar_save','company_calendar',c.id,p_country,
 jsonb_build_object('previous',to_jsonb(c),'year',p_year,'previous_days',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from company_calendar_days x where country_code=p_country and extract(year from calendar_date)=p_year),'days',p_days,'timezone',p_timezone,'enabled',p_enabled,'weekends_off',p_weekends,'effective_date',p_effective));
 delete from company_calendar_days where country_code=p_country and extract(year from calendar_date)=p_year;
 insert into company_calendar_days(country_code,calendar_date,day_type,label)
 select p_country,(x->>'date')::date,x->>'type',trim(x->>'label') from jsonb_array_elements(p_days) x;
 update company_calendars set timezone=p_timezone,enabled=p_enabled,weekends_off=p_weekends,effective_date=p_effective,
 revision=revision+1,updated_at=now(),updated_by=p_account,last_run_at=null where country_code=p_country returning * into c;
 -- A correction to a working day invalidates its automatic mark, with history retained.
 update calendar_auto_stops s set revoked_at=now(),revoked_reason='calendar_changed'
 where s.country_code=p_country and s.revoked_at is null and (s.inspection_date<p_effective or
 calendar_stop_due(s.inspection_date,p_timezone,p_weekends,(select day_type from company_calendar_days where country_code=p_country and calendar_date=s.inspection_date)) is null);
 return to_jsonb(c);
end $$;

create function public.run_calendar_auto_stops(p_now timestamptz default now())
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.company_calendars; today date; day date; due timestamptz; typ text; lbl text; e record; n integer:=0; affected integer;
begin
 for c in select * from company_calendars where enabled for update skip locked loop
  today:=(p_now at time zone c.timezone)::date;
  if (p_now at time zone c.timezone)::time < time '12:00' or (c.last_run_at at time zone c.timezone)::date>=today then continue; end if;
  for day in select x::date from generate_series(c.effective_date::timestamp,(today-1)::timestamp,interval '1 day') x loop
   typ:=null; lbl:=''; select day_type,label into typ,lbl from company_calendar_days where country_code=c.country_code and calendar_date=day;
   due:=calendar_stop_due(day,c.timezone,c.weekends_off,typ);
   if due is null or due>p_now then continue; end if;
   for e in select eq.id from equipments eq
     join departments dep on dep.id=eq.department_id and dep.country_code=c.country_code and dep.is_active and dep.in_equipment_directory
     left join equipment_groups g on g.id=eq.equipment_group_id
     join equipment_form_assignments a on a.equipment_id=eq.id and a.country_code=c.country_code and a.kind='daily'
     join inspection_forms f on f.id=a.form_id and f.country_code=c.country_code and f.kind='daily'
     where eq.country_code=c.country_code and eq.status='active' and eq.archived_at is null
     and (eq.created_at at time zone c.timezone)::date<=day
     and (a.assigned_at at time zone c.timezone)::date<=day
     and coalesce(eq.name_zh,'')||' '||coalesce(g.name_zh,'') !~ '天車|起重機'
     and not exists(select 1 from calendar_auto_stops s where s.country_code=c.country_code and s.equipment_id=eq.id and s.inspection_date=day and s.revoked_at is null)
   loop
    -- Same locks as manual submission. Any shift, draft, or rejected record prevents inference.
    perform pg_advisory_xact_lock(hashtextextended(e.id::text||'/'||day::text||'/day',0));
    perform pg_advisory_xact_lock(hashtextextended(e.id::text||'/'||day::text||'/night',0));
    if exists(select 1 from inspection_records r where r.equipment_id=e.id and r.inspection_date=day) then continue; end if;
    insert into calendar_auto_stops(country_code,equipment_id,inspection_date,reason,holiday_label,timezone,due_at,created_at,calendar_revision)
    values(c.country_code,e.id,day,case when extract(isodow from day) in (6,7) then 'weekend' else 'holiday' end,coalesce(lbl,''),c.timezone,due,p_now,c.revision)
    on conflict(country_code,equipment_id,inspection_date) do update set revoked_at=null,revoked_reason=null,
      reason=excluded.reason,holiday_label=excluded.holiday_label,timezone=excluded.timezone,due_at=excluded.due_at,calendar_revision=excluded.calendar_revision
    where calendar_auto_stops.revoked_reason='calendar_changed';
    get diagnostics affected=row_count; n:=n+affected;
   end loop;
  end loop;
  update company_calendars set last_run_at=p_now where id=c.id;
 end loop;
 return n;
end $$;

create function public.supersede_calendar_stop() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update calendar_auto_stops set revoked_at=now(),revoked_reason='inspection_entered'
 where equipment_id=new.equipment_id and inspection_date=new.inspection_date and revoked_at is null;
 return new;
end $$;
create trigger inspection_supersedes_calendar_stop after insert or update of inspection_date,equipment_id on public.inspection_records
for each row execute function public.supersede_calendar_stop();
revoke all on function public.calendar_stop_due(date,text,boolean,text),public.save_company_calendar(text,uuid,integer,integer,text,boolean,boolean,date,jsonb),public.run_calendar_auto_stops(timestamptz),public.supersede_calendar_stop() from public,anon,authenticated;
grant execute on function public.calendar_stop_due(date,text,boolean,text),public.save_company_calendar(text,uuid,integer,integer,text,boolean,boolean,date,jsonb),public.run_calendar_auto_stops(timestamptz),public.supersede_calendar_stop() to service_role;
