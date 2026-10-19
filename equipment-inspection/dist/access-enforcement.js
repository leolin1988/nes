(function(){
const resources={scrap:'scrap',scrapDetails:'scrap',environment:'environment',environmentManage:'environment_settings',board:'daily',visual:'daily',qr03:'daily',history:'daily',backfill:'daily',formExport:'daily',qr04:'maintenance',maintenance:'maintenance_settings',items:'daily_settings',cadre:'cadre',cadreManage:'cadre',craneMonthly:'crane_monthly',craneDaily:'crane_daily',craneMonthlyManage:'crane_settings',equipmentAdmin:'equipment',mapping:'equipment',assignment:'assignment'};
const restricted=()=>!!profile&&profile.role!=='admin'&&data.access?.managed;
const hasView=key=>key==='approval'?accessAny('daily','approve')||accessAny('maintenance','approve'):!resources[key]||accessAny(resources[key]);
const priorContent=renderContent;renderContent=function(){if(restricted()&&activeCountry&&!hasView(view)){$('#content').innerHTML=`<p class="notice">${txt('accessNoRights')}</p>`;return;}priorContent();prune();};
const priorRender=render;render=function(){priorRender();if(restricted())$$('.side [data-view]').forEach(b=>{if(!hasView(b.dataset.view))b.remove();});prune();};
const oldEquipment=filteredEquipment;filteredEquipment=function(){const list=oldEquipment();return restricted()&&resources[view]?list.filter(e=>accessCan(e.department_id,resources[view])):list;};
const oldForms=formList;formList=function(){const list=oldForms();if(!restricted()||!['items','maintenance'].includes(view))return list;return list.filter(f=>data.departments.some(d=>d.name_zh===f.department&&accessCan(d.id,f.kind==='maintenance'?'maintenance_settings':'daily_settings')));};
function deptForForm(id){const f=data.forms.find(f=>f.id===id);return data.departments.find(d=>d.name_zh===f?.department)?.id;}
function disable(el,allowed){if(el&&!allowed){el.disabled=true;el.setAttribute('aria-disabled','true');el.title=t('readOnly');}}
function prune(){if(!restricted()||!activeCountry)return;
 for(const el of $$('[data-review]')){const r=data.records.find(x=>x.id===el.dataset.review),e=data.equipment.find(x=>x.id===r?.equipment_id);disable(el,accessCan(e?.department_id,'daily','approve'));}
 disable($('#confirmMaintenance'),accessAny('maintenance','approve'));

 for(const [selector,resource,action,attribute]of [['[data-edit]','daily_settings','edit','edit'],['[data-delete]','daily_settings','delete','delete'],['[data-item-photos]','daily_settings','edit','itemPhotos']])for(const el of $$(selector)){const f=data.forms.find(f=>f.id===el.dataset[attribute]);disable(el,accessCan(deptForForm(f?.id),f?.kind==='maintenance'?'maintenance_settings':resource,action));}
 for(const el of $$('[data-check],[data-backfill]')){const e=data.equipment.find(x=>x.id===(el.dataset.check||el.dataset.backfill));disable(el,accessCan(e?.department_id,'daily','create')||accessCan(e?.department_id,'daily','edit'));}
 if(['items','maintenance'].includes(view)){const resource=view==='items'?'daily_settings':'maintenance_settings';disable($('#add'),accessAny(resource,'create'));disable($('#import'),accessAny(resource,'create')||accessAny(resource,'edit'));disable($('#formFile'),accessAny(resource,'create')||accessAny(resource,'edit'));}
 if(view==='craneMonthlyManage'){const id=$('#craneManageDept')?.value;disable($('#craneTemplateEdit'),accessCan(id,'crane_settings','create')||accessCan(id,'crane_settings','edit'));}
 if(['craneMonthly','craneDaily'].includes(view)){const id=$('#craneDept')?.value,resource=resources[view];disable($('#craneEdit'),accessCan(id,resource,'create')||accessCan(id,resource,'edit'));disable($('#craneForm [name=confirmed]'),accessCan(id,resource,'approve'));}
 if(['cadre','cadreManage'].includes(view)){const id=$('#cadreDept')?.value;for(const el of $$('[data-cadre-day],#cadreEdit'))disable(el,accessCan(id,'cadre','create')||accessCan(id,'cadre','edit'));disable($('#cadreTemplateEdit'),accessCan(id,'cadre_settings','create')||accessCan(id,'cadre_settings','edit'));disable($('#cadreForm [name=confirmed]'),accessCan(id,'cadre','approve'));}
 if(view==='equipmentAdmin'){disable($('#addEquipment'),accessAny('equipment','create'));for(const el of $$('[data-edit-equipment],[data-toggle-equipment]')){const id=el.dataset.editEquipment||el.dataset.toggleEquipment,e=data.equipment.find(x=>x.id===id);disable(el,accessCan(e?.department_id,'equipment','edit'));}}
 for(const el of $$('[data-unassign]'))disable(el,accessCan(el.dataset.department,'assignment','delete'));
 // Keep confirmation controls tied to the selected department. The API resolves and checks stored targets again.
}
const observer=new MutationObserver(()=>{observer.disconnect();prune();observer.observe(document.body,{childList:true,subtree:true});});observer.observe(document.body,{childList:true,subtree:true});
const apiBefore=api;api=async function(payload){try{return await apiBefore(payload);}catch(e){if(e.message==='forbidden')toast('accessDenied');throw e;}};
render();
})();
