alter table public.equipments add column if not exists machine_no text not null default '', add column if not exists property_no text not null default '';
create table if not exists public.inspection_forms (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('daily','maintenance')),
 department text not null, equipment_group text not null default '', equipment_name text not null,
 machine_no text not null default '', property_no text not null default '', items jsonb not null default '[]',
 source_filename text not null default '', source_sheet text not null default '', content_key text not null unique,
 updated_at timestamptz not null default now(), updated_by uuid references public.operator_accounts(id)
);
alter table public.inspection_forms enable row level security;
revoke all on public.inspection_forms from anon,authenticated;
grant all on public.inspection_forms to service_role;
create index if not exists inspection_forms_department_kind_idx on public.inspection_forms(department,kind);
alter table public.inspection_records add column if not exists answers jsonb not null default '[]', add column if not exists inspector_name text;
create index if not exists inspection_records_equipment_time_idx on public.inspection_records(equipment_id,inspected_at);


alter table departments add column if not exists in_equipment_directory boolean not null default false;
alter table inspection_forms add column if not exists source_department text not null default '';
