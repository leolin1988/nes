-- Body parameters avoid putting multilingual answers in the REST URL.
-- Service-only SECURITY INVOKER; API still checks account, country and department permissions.
create or replace function public.approve_qualified_inspection(
 p_id uuid, p_country text, p_answers jsonb,
 p_reviewer text, p_note text, p_account uuid
) returns table(id uuid)
language sql security invoker set search_path = ''
as $function$
 update public.inspection_records as r
 set approval_status='approved', reviewer_name=p_reviewer,
     review_note=p_note, reviewed_by=p_account, reviewed_at=now()
 where r.id=p_id and r.country_code=p_country
   and r.approval_status='pending' and r.is_draft=false
   and r.overall_status='normal' and r.answers=p_answers
   and jsonb_typeof(p_answers)='array' and jsonb_array_length(p_answers)>0
   and not exists(select 1 from jsonb_array_elements(p_answers) a where a->>'value' is distinct from 'normal')
   and length(btrim(p_reviewer)) between 1 and 100
   and length(btrim(p_note)) between 1 and 2000
 returning r.id;
$function$;
revoke all on function public.approve_qualified_inspection(uuid,text,jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function public.approve_qualified_inspection(uuid,text,jsonb,text,text,uuid) to service_role;

