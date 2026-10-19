create table public.access_resources(resource text primary key,label jsonb not null,actions text[] not null,sort_order integer not null);
insert into access_resources values
('daily','{"zh":"QR18-03 機器日常點檢表","en":"QR18-03 Daily machine inspection","es":"QR18-03 Inspección diaria","vi":"QR18-03 Kiểm tra máy hằng ngày"}',array['view','create','edit','approve'],1),
('maintenance','{"zh":"QR18-04 預防保養記錄表","en":"QR18-04 Maintenance records","es":"QR18-04 Registros de mantenimiento","vi":"QR18-04 Hồ sơ bảo dưỡng"}',array['view','create','edit','approve'],2),
('cadre','{"zh":"QR18-13 幹部日常管理點檢表","en":"QR18-13 Cadre daily checklist","es":"QR18-13 Lista diaria de mandos","vi":"QR18-13 Kiểm tra quản lý"}',array['view','create','edit','approve'],3),
('crane_monthly','{"zh":"QR18-05 固定式起重機每月定期檢查表","en":"QR18-05 Monthly crane inspection","es":"QR18-05 Inspección mensual de grúa","vi":"QR18-05 Kiểm tra cầu trục hằng tháng"}',array['view','create','edit','approve'],4),
('crane_daily','{"zh":"HR07-10 固定式起重機每日檢點表","en":"HR07-10 Daily crane inspection","es":"HR07-10 Inspección diaria de grúa","vi":"HR07-10 Kiểm tra cầu trục hằng ngày"}',array['view','create','edit','approve'],5),
('daily_settings','{"zh":"機器日常點檢設定（項目與照片）","en":"Daily inspection items and photos","es":"Ítems y fotos de inspección diaria","vi":"Mục và ảnh kiểm tra hằng ngày"}',array['view','create','edit','delete'],6),
('maintenance_settings','{"zh":"QR18-04 預防保養設備設定","en":"QR18-04 Maintenance settings","es":"QR18-04 Configuración de mantenimiento","vi":"QR18-04 Thiết lập bảo dưỡng"}',array['view','create','edit','delete'],7),
('crane_settings','{"zh":"QR18-05 項目與照片設定","en":"QR18-05 Items and photos","es":"QR18-05 Ítems y fotos","vi":"QR18-05 Mục và ảnh"}',array['view','create','edit'],8),
('cadre_settings','{"zh":"QR18-13 點檢項目設定","en":"QR18-13 Checklist settings","es":"QR18-13 Configuración de ítems","vi":"QR18-13 Thiết lập mục kiểm tra"}',array['view','create','edit'],9),
('equipment','{"zh":"設備清單與基本資料／批量匯入","en":"Equipment directory and import","es":"Equipos e importación","vi":"Danh sách và nhập thiết bị"}',array['view','create','edit','delete'],10),
('assignment','{"zh":"設備點檢表分配與啟用","en":"Form assignment and activation","es":"Asignación y activación de formularios","vi":"Phân công và bật biểu mẫu"}',array['view','create','edit','delete'],11);
create table public.access_groups(id uuid primary key default gen_random_uuid(),country_code text not null check(country_code in ('TW','VM','MX')),name text not null check(length(btrim(name)) between 1 and 80),department_ids uuid[] not null default '{}',permissions jsonb not null default '{}',is_active boolean not null default true,revision integer not null default 1,updated_by uuid not null references operator_accounts(id),updated_at timestamptz not null default now(),unique(country_code,name),unique(country_code,id));
create table public.account_access_policies(country_code text not null check(country_code in ('TW','VM','MX')),account_id uuid not null references operator_accounts(id),managed boolean not null default true,revision integer not null default 1,updated_by uuid not null references operator_accounts(id),updated_at timestamptz not null default now(),primary key(country_code,account_id));
create table public.access_group_members(country_code text not null,group_id uuid not null,account_id uuid not null references operator_accounts(id),primary key(country_code,group_id,account_id),foreign key(country_code,group_id) references access_groups(country_code,id) on delete cascade);
create index access_member_account on access_group_members(country_code,account_id);
alter table access_resources enable row level security;
alter table access_groups enable row level security;
alter table account_access_policies enable row level security;
alter table access_group_members enable row level security;
revoke all on access_resources,access_groups,account_access_policies,access_group_members from anon,authenticated;
grant all on access_resources,access_groups,account_access_policies,access_group_members to service_role;

create function public.account_can(p_account uuid,p_country text,p_department uuid,p_resource text,p_action text) returns boolean language plpgsql stable set search_path=public,pg_temp as $$
declare u operator_accounts; managed_mode boolean;
begin
 select * into u from operator_accounts where id=p_account and is_active;
 if not found then return false;end if;
 if not exists(select 1 from departments where id=p_department and country_code=p_country and is_active) then return false;end if;
 if u.role='admin' then return true;end if;
 if not exists(select 1 from departments where id=u.department_id and country_code=p_country) then return false;end if;
 select managed into managed_mode from account_access_policies where country_code=p_country and account_id=p_account;
 if not coalesce(managed_mode,false) then return u.department_id=p_department;end if;
 if u.role<>'supervisor' then return false;end if;
 return exists(select 1 from access_group_members m join access_groups g on g.id=m.group_id and g.country_code=m.country_code join access_resources r on r.resource=p_resource where m.country_code=p_country and m.account_id=p_account and g.is_active and p_department=any(g.department_ids) and p_action=any(r.actions) and coalesce((g.permissions->p_resource->>'view')::boolean,false) and coalesce((g.permissions->p_resource->>p_action)::boolean,false));
end $$;

create function public.save_access_group(p_country text,p_actor uuid,p_id uuid,p_revision integer,p_name text,p_departments uuid[],p_permissions jsonb,p_active boolean) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare old access_groups; saved access_groups; kv record; op record;
begin
 if not exists(select 1 from operator_accounts where id=p_actor and role='admin' and is_active) then raise exception 'forbidden';end if;
 if p_country not in ('TW','VM','MX') or p_country is null or p_name is null or length(btrim(p_name)) not between 1 and 80 or p_active is null or p_revision is null or p_revision<0 or p_departments is null or cardinality(p_departments)=0 or cardinality(p_departments)>100 or cardinality(p_departments)<>(select count(distinct x) from unnest(p_departments)x) or exists(select 1 from unnest(p_departments)x where not exists(select 1 from departments where id=x and country_code=p_country and is_active and in_equipment_directory)) or jsonb_typeof(p_permissions) is distinct from 'object' then raise exception 'invalid_access_group';end if;
 for kv in select * from jsonb_each(p_permissions) loop
  if not exists(select 1 from access_resources where resource=kv.key) or jsonb_typeof(kv.value) is distinct from 'object' then raise exception 'invalid_permissions';end if;
  for op in select * from jsonb_each(kv.value) loop
   if jsonb_typeof(op.value) is distinct from 'boolean' or not exists(select 1 from access_resources where resource=kv.key and op.key=any(actions)) then raise exception 'invalid_permissions';end if;
   if op.value='true'::jsonb and coalesce(kv.value->'view','false'::jsonb)<>'true'::jsonb then raise exception 'view_required';end if;
  end loop;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('access-groups:'||p_country,0));
 select * into old from access_groups where id=p_id and country_code=p_country for update;
 if p_id is not null and old.id is null then raise exception 'invalid_access_group';end if;
 if coalesce(old.revision,0)<>p_revision then raise exception 'record_changed';end if;
 if old.id is null and (select count(*) from access_groups where country_code=p_country)>=20 then raise exception 'group_limit';end if;
 insert into access_groups(id,country_code,name,department_ids,permissions,is_active,revision,updated_by) values(coalesce(p_id,gen_random_uuid()),p_country,btrim(p_name),p_departments,p_permissions,p_active,p_revision+1,p_actor)
 on conflict(id) do update set name=excluded.name,department_ids=excluded.department_ids,permissions=excluded.permissions,is_active=excluded.is_active,revision=excluded.revision,updated_by=p_actor,updated_at=now() returning * into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_actor,'access_group_save','access_group',saved.id,jsonb_build_object('before',to_jsonb(old),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $$;

create function public.save_access_memberships(p_country text,p_actor uuid,p_account uuid,p_revision integer,p_groups uuid[],p_managed boolean) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare old account_access_policies; saved account_access_policies; before_groups jsonb;
begin
 if not exists(select 1 from operator_accounts where id=p_actor and role='admin' and is_active) then raise exception 'forbidden';end if;
 if not exists(select 1 from operator_accounts a join departments d on d.id=a.department_id where a.id=p_account and a.role='supervisor' and a.is_active and d.country_code=p_country) or p_managed is null or p_revision is null or p_revision<0 or p_groups is null or cardinality(p_groups)>20 or cardinality(p_groups)<>(select count(distinct x) from unnest(p_groups)x) or exists(select 1 from unnest(p_groups)x where not exists(select 1 from access_groups where id=x and country_code=p_country)) or (not p_managed and cardinality(p_groups)>0) then raise exception 'invalid_membership';end if;
 perform pg_advisory_xact_lock(hashtextextended('access-groups:'||p_country,0));
 select * into old from account_access_policies where country_code=p_country and account_id=p_account for update;
 if coalesce(old.revision,0)<>p_revision then raise exception 'record_changed';end if;
 select coalesce(jsonb_agg(group_id),'[]') into before_groups from access_group_members where country_code=p_country and account_id=p_account;
 delete from access_group_members where country_code=p_country and account_id=p_account;
 insert into access_group_members(country_code,account_id,group_id) select p_country,p_account,x from unnest(p_groups)x;
 insert into account_access_policies(country_code,account_id,managed,revision,updated_by) values(p_country,p_account,p_managed,p_revision+1,p_actor)
 on conflict(country_code,account_id) do update set managed=p_managed,revision=excluded.revision,updated_by=p_actor,updated_at=now() returning * into saved;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_actor,'access_membership_save','operator_account',p_account,jsonb_build_object('before',to_jsonb(old),'before_groups',before_groups,'after',to_jsonb(saved),'groups',to_jsonb(p_groups)));
 return to_jsonb(saved);
end $$;

create function public.delete_access_group(p_country text,p_actor uuid,p_id uuid,p_revision integer) returns void language plpgsql set search_path=public,pg_temp as $$
declare old access_groups;
begin
 if not exists(select 1 from operator_accounts where id=p_actor and role='admin' and is_active) then raise exception 'forbidden';end if;
 perform pg_advisory_xact_lock(hashtextextended('access-groups:'||p_country,0));
 select * into old from access_groups where id=p_id and country_code=p_country for update;
 if old.id is null or old.revision<>p_revision then raise exception 'record_changed';end if;
 if exists(select 1 from access_group_members where group_id=p_id and country_code=p_country) then raise exception 'group_in_use';end if;
 delete from access_groups where id=p_id;
 insert into audit_logs(country_code,account_id,action,entity_type,entity_id,payload) values(p_country,p_actor,'access_group_delete','access_group',p_id,jsonb_build_object('before',to_jsonb(old)));
end $$;
revoke all on function public.account_can(uuid,text,uuid,text,text),public.save_access_group(text,uuid,uuid,integer,text,uuid[],jsonb,boolean),public.save_access_memberships(text,uuid,uuid,integer,uuid[],boolean),public.delete_access_group(text,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.account_can(uuid,text,uuid,text,text),public.save_access_group(text,uuid,uuid,integer,text,uuid[],jsonb,boolean),public.save_access_memberships(text,uuid,uuid,integer,uuid[],boolean),public.delete_access_group(text,uuid,uuid,integer) to service_role;
