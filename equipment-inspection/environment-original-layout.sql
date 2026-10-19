create table public.environment_sources (
 country_code text not null check(country_code in ('TW','VM','MX')),source_key text not null,
 source_filename text not null,items jsonb not null,layout jsonb not null,primary key(country_code,source_key)
);
alter table public.environment_sources enable row level security;
revoke all on public.environment_sources from anon,authenticated;
grant all on public.environment_sources to service_role;
alter table public.environment_templates add column source_key text,add column source_map_enabled boolean not null default false;
alter table public.environment_records add column source_key_snapshot text,add column source_map_enabled boolean not null default false;
create or replace function public.save_environment_template_v2(p_country text,p_account uuid,p_department uuid,p_revision integer,p_items jsonb,p_map uuid,p_source text,p_source_map boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved jsonb;
begin
 if p_source is not null and not exists(select 1 from environment_sources where country_code=p_country and source_key=p_source) then raise exception 'invalid_environment';end if;
 saved:=save_environment_template(p_country,p_account,p_department,p_revision,p_items,p_map);
 update environment_templates set source_key=p_source,source_map_enabled=coalesce(p_source_map,false) where country_code=p_country and department_id=p_department returning to_jsonb(environment_templates.*) into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_account,'environment_source_save','environment_template',p_department,jsonb_build_object('source_key',p_source,'source_map_enabled',p_source_map));
 return saved;
end $$;
create or replace function public.save_environment_record_v2(p_country text,p_account uuid,p_department uuid,p_date date,p_revision integer,p_template_revision integer,p_results jsonb,p_inspector text,p_confirm boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved jsonb; selected_source text; map_enabled boolean;
begin
 saved:=save_environment_record(p_country,p_account,p_department,p_date,p_revision,p_template_revision,p_results,p_inspector,p_confirm);
 if p_revision=0 then
  select source_key,source_map_enabled into selected_source,map_enabled from environment_templates where country_code=p_country and department_id=p_department;
  update environment_records set source_key_snapshot=selected_source,source_map_enabled=coalesce(map_enabled,false) where id=(saved->>'id')::uuid returning to_jsonb(environment_records.*) into saved;
 end if;
 return saved;
end $$;
revoke all on function public.save_environment_template_v2(text,uuid,uuid,integer,jsonb,uuid,text,boolean),public.save_environment_record_v2(text,uuid,uuid,date,integer,integer,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.save_environment_template_v2(text,uuid,uuid,integer,jsonb,uuid,text,boolean),public.save_environment_record_v2(text,uuid,uuid,date,integer,integer,jsonb,text,boolean) to service_role;
