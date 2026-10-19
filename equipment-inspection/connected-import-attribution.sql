-- Connected imports have a named source, without impersonating a local user.
alter table public.equipment_form_assignments add column assignment_source text not null default 'account' check (assignment_source in ('account','connected_import'));
alter table public.equipment_form_assignments alter column assigned_by drop not null;
alter table public.equipment_form_assignments add constraint assignment_actor_required check (assigned_by is not null or assignment_source='connected_import');
