alter table public.inspection_forms add column if not exists form_name text not null default '';
update public.inspection_forms set form_name=coalesce(nullif(source_department,''),nullif(department,''),'共用') || '_' || equipment_name || '_' || coalesce(nullif(source_sheet,''),left(id::text,8)) || '.csv' where form_name='';
create table if not exists public.equipment_form_assignments(
 equipment_id uuid not null references public.equipments(id) on delete cascade,
 kind text not null check(kind in ('daily','maintenance')),
 form_id uuid not null references public.inspection_forms(id) on delete cascade,
 assigned_by uuid not null references public.operator_accounts(id),
 assigned_at timestamptz not null default now(),
 primary key(equipment_id,kind)
);
create index if not exists equipment_form_assignments_form_idx on public.equipment_form_assignments(form_id);
alter table public.equipment_form_assignments enable row level security;
revoke all on public.equipment_form_assignments from anon,authenticated;
grant all on public.equipment_form_assignments to service_role;
alter table public.inspection_records add column if not exists form_id uuid references public.inspection_forms(id) on delete set null;
create index if not exists inspection_records_form_idx on public.inspection_records(form_id);
