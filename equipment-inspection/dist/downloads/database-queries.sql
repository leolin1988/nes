-- Supabase PostgreSQL project: dpenlftkwzqwhgpvutwk
-- Read-only queries. Run in the project's SQL Editor.
-- 1. Verify a real database connection.
select current_database() as database_name, now() as checked_at;

-- 2. Authoritative departments from the imported equipment directory.
select id, name_zh, name_en, name_es, name_vi
from public.departments
where in_equipment_directory and is_active
order by name_zh;

-- 3. Counts of directory equipment, imported forms, assignments and records.
select 'directory_equipment' as data_type, count(*) as row_count
from public.equipments e join public.departments d on d.id=e.department_id
where d.in_equipment_directory
union all select 'forms', count(*) from public.inspection_forms
union all select 'assignments', count(*) from public.equipment_form_assignments
union all select 'inspection_records', count(*) from public.inspection_records;

-- 4. One imported form per filename, including the latest source and update.
select id,form_name,kind,department,equipment_name,machine_no,property_no,
       jsonb_array_length(items) as item_count,source_filename,source_sheet,updated_at
from public.inspection_forms order by form_name;

-- 5. Check which equipment is enabled by an explicit assignment.
select d.name_zh as department,e.equipment_code,e.name_zh as equipment_name,
       a.kind,f.form_name,a.assigned_at,
       case when a.form_id is null then 'not_assigned' else 'enabled' end as state
from public.equipments e
join public.departments d on d.id=e.department_id
left join public.equipment_form_assignments a on a.equipment_id=e.id
left join public.inspection_forms f on f.id=a.form_id
where d.in_equipment_directory
order by d.name_zh,e.equipment_code,a.kind;

-- 6. Persisted inspection history. The answers column retains submitted item snapshots.
select r.id,e.equipment_code,r.inspector_name,r.inspected_at,r.overall_status,
       r.approval_status,r.is_draft,r.form_id,jsonb_array_length(r.answers) as answer_count
from public.inspection_records r join public.equipments e on e.id=r.equipment_id
order by r.inspected_at desc limit 100;
