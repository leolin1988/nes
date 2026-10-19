begin;
-- All data present before this change belongs to Taiwan. Country codes follow the user's site convention.
alter table public.departments add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index departments_country_idx on public.departments(country_code);
alter table public.equipment_groups add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index equipment_groups_country_idx on public.equipment_groups(country_code);
alter table public.equipments add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index equipments_country_idx on public.equipments(country_code);
alter table public.inspection_forms add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index inspection_forms_country_idx on public.inspection_forms(country_code);
alter table public.equipment_form_assignments add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index equipment_form_assignments_country_idx on public.equipment_form_assignments(country_code);
alter table public.inspection_records add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index inspection_records_country_idx on public.inspection_records(country_code);
alter table public.maintenance_records add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index maintenance_records_country_idx on public.maintenance_records(country_code);
alter table public.inspection_reference_photos add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index inspection_reference_photos_country_idx on public.inspection_reference_photos(country_code);
alter table public.operator_accounts add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index operator_accounts_country_idx on public.operator_accounts(country_code);
alter table public.audit_logs add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index audit_logs_country_idx on public.audit_logs(country_code);
alter table public.import_jobs add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index import_jobs_country_idx on public.import_jobs(country_code);
alter table public.preventive_maintenance_plans add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index preventive_maintenance_plans_country_idx on public.preventive_maintenance_plans(country_code);
alter table public.preventive_maintenance_records add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index preventive_maintenance_records_country_idx on public.preventive_maintenance_records(country_code);
alter table public.inspection_templates add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index inspection_templates_country_idx on public.inspection_templates(country_code);
alter table public.inspection_record_details add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index inspection_record_details_country_idx on public.inspection_record_details(country_code);
alter table public.inspection_templates_library add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index inspection_templates_library_country_idx on public.inspection_templates_library(country_code);
alter table public.inspection_template_revisions add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index inspection_template_revisions_country_idx on public.inspection_template_revisions(country_code);
alter table public.supervisor_approvals add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index supervisor_approvals_country_idx on public.supervisor_approvals(country_code);
alter table public.operator_sessions add column country_code text not null default 'TW' check(country_code in ('TW','VM','MX'));
create index operator_sessions_country_idx on public.operator_sessions(country_code);
alter table public.equipments drop constraint equipments_equipment_code_key;
alter table public.equipments add constraint equipments_country_equipment_code_key unique(country_code,equipment_code);
alter table public.departments drop constraint departments_name_zh_key;
alter table public.departments add constraint departments_country_name_zh_key unique(country_code,name_zh);
alter table public.departments drop constraint departments_code_key;
alter table public.departments add constraint departments_country_code_key unique(country_code,code);
alter table public.inspection_forms drop constraint inspection_forms_content_key_key;
alter table public.inspection_forms add constraint inspection_forms_country_content_key_key unique(country_code,content_key);

-- Preserve country identity; validate linked business objects on every write.
create or replace function public.validate_country_links() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare expected text; linked text; n integer; reference_id uuid;
begin
 if TG_OP='UPDATE' and new.country_code<>old.country_code then raise exception 'country_immutable'; end if;
 for n in 0..(TG_NARGS/2-1) loop
  reference_id := nullif(to_jsonb(new)->>TG_ARGV[n*2],'')::uuid;
  if reference_id is not null then
   execute format('select country_code from public.%I where id=$1',TG_ARGV[n*2+1]) into linked using reference_id;
   if linked is null then raise exception 'country_reference_missing'; end if;
   if expected is null then expected:=linked; elsif expected<>linked then raise exception 'country_mismatch'; end if;
  end if;
 end loop;
 -- RPC inserts derive the country from the equipment, never the current account's home country.
 if TG_TABLE_NAME='inspection_records' and TG_OP='INSERT' then new.country_code:=coalesce(expected,new.country_code); end if;
 if expected is not null and new.country_code<>expected then raise exception 'country_mismatch'; end if;
 return new;
end $$;
revoke all on function public.validate_country_links() from public,anon,authenticated;
grant execute on function public.validate_country_links() to service_role;
create trigger departments_country_guard before insert or update on public.departments for each row execute function public.validate_country_links();
create trigger equipment_groups_country_guard before insert or update on public.equipment_groups for each row execute function public.validate_country_links('department_id','departments');
create trigger equipments_country_guard before insert or update on public.equipments for each row execute function public.validate_country_links('department_id','departments','equipment_group_id','equipment_groups');
create trigger inspection_forms_country_guard before insert or update on public.inspection_forms for each row execute function public.validate_country_links();
create trigger equipment_form_assignments_country_guard before insert or update on public.equipment_form_assignments for each row execute function public.validate_country_links('equipment_id','equipments','form_id','inspection_forms');
create trigger inspection_records_country_guard before insert or update on public.inspection_records for each row execute function public.validate_country_links('equipment_id','equipments','form_id','inspection_forms');
create trigger maintenance_records_country_guard before insert or update on public.maintenance_records for each row execute function public.validate_country_links('equipment_id','equipments','form_id','inspection_forms');
create trigger inspection_reference_photos_country_guard before insert or update on public.inspection_reference_photos for each row execute function public.validate_country_links();
create trigger operator_accounts_country_guard before insert or update on public.operator_accounts for each row execute function public.validate_country_links('department_id','departments');
create trigger audit_logs_country_guard before insert or update on public.audit_logs for each row execute function public.validate_country_links();
create trigger import_jobs_country_guard before insert or update on public.import_jobs for each row execute function public.validate_country_links();
create trigger preventive_maintenance_plans_country_guard before insert or update on public.preventive_maintenance_plans for each row execute function public.validate_country_links('equipment_id','equipments','assigned_department_id','departments');
create trigger preventive_maintenance_records_country_guard before insert or update on public.preventive_maintenance_records for each row execute function public.validate_country_links('plan_id','preventive_maintenance_plans');
create trigger inspection_templates_country_guard before insert or update on public.inspection_templates for each row execute function public.validate_country_links('equipment_id','equipments');
create trigger inspection_record_details_country_guard before insert or update on public.inspection_record_details for each row execute function public.validate_country_links('record_id','inspection_records','template_id','inspection_templates');
create trigger inspection_templates_library_country_guard before insert or update on public.inspection_templates_library for each row execute function public.validate_country_links('department_id','departments');
create trigger inspection_template_revisions_country_guard before insert or update on public.inspection_template_revisions for each row execute function public.validate_country_links('department_id','departments','template_id','inspection_templates');
create trigger supervisor_approvals_country_guard before insert or update on public.supervisor_approvals for each row execute function public.validate_country_links('record_id','inspection_records');
create trigger operator_sessions_country_guard before insert or update on public.operator_sessions for each row execute function public.validate_country_links();
notify pgrst,'reload schema';
commit;
