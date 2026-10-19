alter table public.operator_accounts add column if not exists auth_version integer not null default 0;
create or replace function public.reset_account_password(p_country text,p_actor uuid,p_target uuid,p_password text,p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path=public,extensions,pg_temp as $$
declare target operator_accounts; saved operator_accounts;
begin
 if not exists(select 1 from operator_accounts where id=p_actor and is_active and role='admin') then raise exception 'forbidden';end if;
 if p_password is null or length(p_password)<6 or octet_length(p_password)>72 or jsonb_typeof(p_changes) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_changes) k where k not in ('full_name','role','department_id','is_active')) then raise exception 'invalid_password';end if;
 select * into target from operator_accounts where id=p_target and country_code=p_country for update;
 if target.id is null then raise exception 'account_not_found';end if;
 update operator_accounts set password_hash=extensions.crypt(p_password,extensions.gen_salt('bf',10)),auth_version=auth_version+1,must_change_password=false,
 full_name=case when p_changes ? 'full_name' then p_changes->>'full_name' else full_name end,
 role=case when p_changes ? 'role' then p_changes->>'role' else role end,
 department_id=case when p_changes ? 'department_id' then (p_changes->>'department_id')::uuid else department_id end,
 is_active=case when p_changes ? 'is_active' then (p_changes->>'is_active')::boolean else is_active end
 where id=p_target and country_code=p_country returning * into saved;
 if saved.password_hash<>extensions.crypt(p_password,saved.password_hash) then raise exception 'password_verification_failed';end if;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_actor,'password_reset','operator_account',p_target,jsonb_build_object('verified',true,'sessions_revoked',true,'changed_fields',to_jsonb(array(select jsonb_object_keys(p_changes)))));
 return jsonb_build_object('account',jsonb_build_object('id',saved.id,'account_code',saved.account_code,'role',saved.role,'is_active',saved.is_active,'full_name',saved.full_name),'password_updated',true,'sessions_revoked',true);
end $$;
revoke all on function public.reset_account_password(text,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reset_account_password(text,uuid,uuid,text,jsonb) to service_role;
