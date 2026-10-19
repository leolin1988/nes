-- Additive change: preserve all existing records and their original timestamps.
alter table public.inspection_records
  add column if not exists inspection_date date,
  add column if not exists recorded_at timestamptz,
  add column if not exists is_backfill boolean not null default false,
  add column if not exists backfill_reason text not null default '',
  add column if not exists submission_key uuid;
update public.inspection_records
set inspection_date = coalesce(inspection_date, (inspected_at at time zone 'Asia/Taipei')::date),
    recorded_at = coalesce(recorded_at, inspected_at)
where inspection_date is null or recorded_at is null;
alter table public.inspection_records
  alter column inspection_date set default ((now() at time zone 'Asia/Taipei')::date),
  alter column inspection_date set not null,
  alter column recorded_at set default now(),
  alter column recorded_at set not null;
create unique index if not exists inspection_records_submission_key_idx
  on public.inspection_records(submission_key) where submission_key is not null;
create index if not exists inspection_records_equipment_date_shift_idx
  on public.inspection_records(equipment_id, inspection_date, shift);

create table if not exists public.inspection_reference_photos (
  id uuid primary key,
  object_path text not null unique,
  uploaded_by uuid not null references public.operator_accounts(id),
  original_name text not null,
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check(size_bytes between 1 and 2000000),
  created_at timestamptz not null default now()
);
alter table public.inspection_reference_photos enable row level security;
revoke all on public.inspection_reference_photos from anon, authenticated;
grant all on public.inspection_reference_photos to service_role;
create index if not exists inspection_reference_photos_uploader_idx on public.inspection_reference_photos(uploaded_by);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('inspection-reference-photos','inspection-reference-photos',false,2000000,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
do $$ begin
  if exists(select 1 from storage.buckets where id='inspection-reference-photos' and public) then
    raise exception 'Reference photo bucket must be private';
  end if;
end $$;

-- Service-only, invoker privileges, serialized per machine/date/shift.
create or replace function public.save_inspection_submission(
  p_equipment_id uuid, p_form_id uuid, p_account_id uuid,
  p_inspector_name text, p_shift text, p_answers jsonb, p_is_draft boolean,
  p_inspection_date date, p_is_backfill boolean, p_reason text, p_submission_key uuid
) returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare result_id uuid; current_day date := (now() at time zone 'Asia/Taipei')::date;
begin
  if p_submission_key is null or p_inspection_date is null
     or p_inspection_date > current_day
     or (p_is_backfill and (p_inspection_date >= current_day or length(trim(coalesce(p_reason,''))) = 0))
     or (not p_is_backfill and p_inspection_date <> current_day)
     or p_shift not in ('day','night') then
    raise exception 'invalid_inspection_date' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_submission_key::text,1));
  select id into result_id from public.inspection_records
    where submission_key=p_submission_key and operator_account_id=p_account_id;
  if found then return result_id; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_equipment_id::text||'/'||p_inspection_date::text||'/'||p_shift,0));
  if not p_is_draft and exists(select 1 from public.inspection_records
    where equipment_id=p_equipment_id and inspection_date=p_inspection_date and shift=p_shift
      and not is_draft and approval_status <> 'rejected') then
    raise exception 'duplicate_inspection' using errcode='23505';
  end if;
  insert into public.inspection_records(equipment_id,form_id,operator_account_id,inspector_name,shift,answers,
    is_draft,overall_status,approval_status,inspection_date,recorded_at,is_backfill,backfill_reason,submission_key)
  values(p_equipment_id,p_form_id,p_account_id,p_inspector_name,p_shift,p_answers,p_is_draft,
    case when p_is_draft then 'draft' when exists(select 1 from jsonb_array_elements(p_answers) a where a->>'value'<>'normal') then 'abnormal' else 'normal' end,
    'pending',p_inspection_date,now(),p_is_backfill,case when p_is_backfill then trim(p_reason) else '' end,p_submission_key)
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.save_inspection_submission(uuid,uuid,uuid,text,text,jsonb,boolean,date,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.save_inspection_submission(uuid,uuid,uuid,text,text,jsonb,boolean,date,boolean,text,uuid) to service_role;
