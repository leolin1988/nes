create table if not exists public.fire_attachment_records (
 id uuid primary key default gen_random_uuid(),
 country_code text not null check (country_code in ('TW','VM','MX')),
 department_id uuid not null references public.departments(id),
 form_type smallint not null check (form_type in (2,3)),
 inspection_date date not null,
 responsible_area text not null check (length(trim(responsible_area)) between 1 and 200),
 implementer_name text not null check (length(trim(implementer_name)) between 1 and 100),
 entries jsonb not null check (jsonb_typeof(entries)='array' and jsonb_array_length(entries)=9),
 situation_report text not null default '',
 manager_name text not null default '',
 manager_disposition text not null default '',
 manager_signature text not null default '',
 owner_disposition text not null default '',
 owner_signature text not null default '',
 status text not null default 'draft' check (status in ('draft','submitted','confirmed')),
 created_by uuid not null references public.operator_accounts(id),
 updated_by uuid not null references public.operator_accounts(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 confirmed_at timestamptz,
 unique (country_code, department_id, form_type, inspection_date, responsible_area)
);
create index if not exists fire_attachment_records_lookup_idx on public.fire_attachment_records(country_code,department_id,form_type,inspection_date desc);
alter table public.fire_attachment_records enable row level security;
revoke all on public.fire_attachment_records from public,anon,authenticated;
grant all on public.fire_attachment_records to service_role;
