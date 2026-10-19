begin;
create table if not exists public.fire_daily_records (
 id uuid primary key default gen_random_uuid(),
 country_code text not null check (country_code in ('TW','VM','MX')),
 department_id uuid not null references public.departments(id),
 inspection_month date not null check (extract(day from inspection_month)=1),
 responsible_area text not null check (length(trim(responsible_area)) between 1 and 200),
 implementer_name text not null check (length(trim(implementer_name)) between 1 and 100),
 entries jsonb not null check (jsonb_typeof(entries)='array' and jsonb_array_length(entries) between 28 and 31),
 manager_disposition text not null default '',
 manager_signature text not null default '',
 manager_name text not null default '',
 status text not null default 'draft' check (status in ('draft','submitted','confirmed')),
 created_by uuid not null references public.operator_accounts(id),
 updated_by uuid not null references public.operator_accounts(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 confirmed_at timestamptz,
 unique (department_id, inspection_month, responsible_area)
);
create index if not exists fire_daily_records_department_month_idx
 on public.fire_daily_records(department_id, inspection_month desc);
create index if not exists fire_daily_records_country_department_month_idx
 on public.fire_daily_records(country_code, department_id, inspection_month desc);
alter table public.fire_daily_records enable row level security;
revoke all on public.fire_daily_records from public, anon, authenticated;
grant all on public.fire_daily_records to service_role;
commit;
