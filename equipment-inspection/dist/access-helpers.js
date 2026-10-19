function accessCan(dept,resource,action='view'){
 if(profile?.role==='admin')return true;
 if(!data.access?.managed)return dept===profile?.department_id;
 return data.access.grants.some(g=>g.department_id===dept&&g.resource===resource&&g.actions.includes(action));
}
function accessAny(resource,action='view'){return profile?.role==='admin'||(!data.access?.managed?!!profile:data.access.grants.some(g=>g.resource===resource&&g.actions.includes(action)));}
function accessDepartment(id,resource){return profile?.role==='admin'||(data.access?.managed?accessCan(id,resource):id===profile?.department_id);}
function accessFormEditable(f){const resource=f.kind==='maintenance'?'maintenance_settings':'daily_settings';return profile?.role==='admin'||data.departments.some(d=>d.name_zh===f.department&&accessCan(d.id,resource,'edit'));}
