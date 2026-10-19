create table public.navigation_settings (
 country_code text primary key check(country_code in ('TW','VM','MX')),
 config jsonb not null check(jsonb_typeof(config)='object'),
 revision integer not null default 1 check(revision>0),
 updated_by uuid not null references public.operator_accounts(id),
 updated_at timestamptz not null default now()
);
alter table public.navigation_settings enable row level security;
revoke all on public.navigation_settings from anon,authenticated;
grant all on public.navigation_settings to service_role;
create or replace function public.save_navigation_settings(p_country text,p_account uuid,p_revision integer,p_config jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_row navigation_settings; result_row navigation_settings;
begin
 if p_country not in ('TW','VM','MX') or not exists(select 1 from operator_accounts where id=p_account and role='admin' and is_active) then raise exception 'forbidden'; end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_config) is distinct from 'object' or jsonb_typeof(p_config->'items') is distinct from 'array' or jsonb_array_length(p_config->'items')<>25 then raise exception 'invalid_navigation'; end if;
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
alter table public.crane_monthly_templates alter column updated_by drop not null;
comment on column public.crane_monthly_templates.updated_by is 'Authenticated editor; NULL for connected administrative synchronization, with source and operation recorded in audit_logs.';
