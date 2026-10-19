begin;
alter table public.inspection_records add column if not exists reviewer_name text;
alter table public.inspection_records add column if not exists reviewed_by uuid references public.operator_accounts(id);
alter table public.inspection_records add column if not exists reviewed_at timestamptz;
alter table public.inspection_records add column if not exists review_note text;
alter table public.equipments add column if not exists archived_at timestamptz;
create table if not exists public.maintenance_records (
 id uuid primary key,
 equipment_id uuid not null references public.equipments(id),
 form_id uuid not null references public.inspection_forms(id),
 form_name text not null,
 year integer not null check(year between 2000 and 2100),
 rows jsonb not null check(jsonb_typeof(rows)='array' and jsonb_array_length(rows) between 1 and 500),
 performer_name text not null,
 status text not null check(status in ('draft','confirmed')),
 created_by uuid not null references public.operator_accounts(id),
 updated_by uuid not null references public.operator_accounts(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 confirmed_at timestamptz
);
create index if not exists maintenance_records_equipment_year on public.maintenance_records(equipment_id,year);
alter table public.maintenance_records enable row level security;
revoke all on public.maintenance_records from public,anon,authenticated;
grant all on public.maintenance_records to service_role;
commit;
