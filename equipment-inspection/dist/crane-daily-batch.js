/* HR07-10 uses the existing department-scoped crane_save API and revision guard. */
(()=>{
const words={
craneDailyBatch:['HR07-10 每日檢點批次完成','HR07-10 Batch daily crane inspection','HR07-10 Inspección diaria por lote','HR07-10 Kiểm tra hằng ngày hàng loạt'],
cdbHelp:['選擇部門與起訖日期（含起訖日、最多31天），預覽後批次填報合格 ˇ。已有紀錄、停用或無機器編號的設備會排除。填報完成後另由主管確認。','Select department and an inclusive range of up to 31 days, preview and submit passing results ˇ. Existing records, inactive equipment and machines without numbers are excluded. Supervisor confirmation follows separately.','Seleccione departamento y fechas inclusivas de hasta 31 días. Revise y registre resultados conformes ˇ. Se excluyen registros existentes y equipos inactivos o sin número. La confirmación del supervisor es posterior.','Chọn bộ phận và khoảng tối đa 31 ngày, gồm hai đầu. Xem trước rồi nhập kết quả đạt ˇ. Loại bản ghi đã có, thiết bị ngừng dùng hoặc thiếu mã máy. Quản lý xác nhận riêng.'],
cdbConfirm:['我確認所選設備在各日期均已實際完成檢查，所有項目合格。','I confirm actual inspection of all selected equipment on each date; all items passed.','Confirmo la inspección real de todos los equipos en cada fecha; todos los ítems conformes.','Tôi xác nhận đã kiểm tra thực tế từng thiết bị vào mỗi ngày, mọi mục đều đạt.'],
cdbLoading:['正在逐台讀取紀錄…','Loading equipment records…','Cargando registros…','Đang tải bản ghi…'],
cdbExisting:['已有紀錄，跳過','Existing record; skipped','Registro existente; omitido','Đã có bản ghi; bỏ qua'],
cdbRequired:['請選設備日期、填點檢人，並勾選實際查核確認。','Select equipment dates, enter inspector and confirm actual checks.','Seleccione fechas y equipos, indique inspector y confirme.','Chọn thiết bị và ngày, nhập người kiểm tra và xác nhận.'],
cdbError:['未完成，請重新預覽後重試。','Incomplete. Preview again and retry.','Sin completar. Revise de nuevo y reintente.','Chưa hoàn tất. Xem trước lại rồi thử lại.'],
cdbNoEquipment:['目前部門沒有可用且具填報權限的固定式起重機。','No eligible cranes with entry permission in this department.','No hay grúas elegibles con permiso en este departamento.','Bộ phận không có cầu trục đủ điều kiện và quyền nhập.']
};for(const[k,v]of Object.entries(words))translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,i)=>[l,v[i]]));
let scope='',dept='',start='',end='',name='',leader='',rows=[],loaded=false,running=false,loading=false,ticket=0,message='';
const key=()=>activeCountry+':'+countryGeneration+':'+profile?.account_id;
const allowed=()=>canManage()&&accessAny('crane_daily','view')&&accessAny('crane_daily','create');
const departments=()=>data.departments.filter(d=>d.is_active!==false&&accessCan(d.id,'crane_daily','view')&&accessCan(d.id,'crane_daily','create'));
const equipment=()=>data.equipment.filter(e=>!e.archived_at&&e.machine_no&&departments().some(d=>d.id===e.department_id)&&(!dept||e.department_id===dept)&&/天車|起重機/.test(e.name_zh+' '+(e.equipment_groups?.name_zh||data.groups.find(g=>g.id===e.equipment_group_id)?.name_zh||'')));
const oldContent=renderContent;renderContent=function(){if(view!=='craneDailyBatch')return oldContent();if(!activeCountry||!allowed()){$('#content').innerHTML=`<p class="notice">${txt('accessNoRights')}</p>`;return;}draw();};
const oldRender=render;render=function(){oldRender();if(!activeCountry||!allowed())return;const section=$('.side details[data-section="supervisor"] .nav-section-items');if(!section)return;const b=document.createElement('button');b.className='nav'+(view==='craneDailyBatch'?' active':'');b.dataset.view='craneDailyBatch';b.innerHTML='▶ '+txt('craneDailyBatch');b.onclick=()=>{view='craneDailyBatch';render();};section.append(b);if(view==='craneDailyBatch')section.parentElement.open=true;};
function draw(){
 if(scope!==key()){scope=key();dept='';end=inspectionDay();start=end;rows=[];loaded=false;message='';name='';leader='';ticket++;}
 $('.page-title h1').innerHTML=txt('craneDailyBatch');
 $('#content').innerHTML=`<p class="notice">${txt('cdbHelp')}</p><div class="editor-fields"><label>${txt('department')}<select id="cdbDept" class="select"><option value="">${t('all')}</option>${departments().map(d=>`<option value="${esc(d.id)}" ${d.id===dept?'selected':''}>${esc(nameOf(d))}</option>`).join('')}</select></label><label>${txt('batchRangeStart')}<input id="cdbStart" type="date" class="select" value="${start}" max="${inspectionDay()}"></label><label>${txt('batchRangeEnd')}<input id="cdbEnd" type="date" class="select" value="${end}" max="${inspectionDay()}"></label><label>${txt('inspector')}<input id="cdbInspector" class="select" maxlength="100" value="${esc(name)}"></label><label>${formHtml('f40_38')}<input id="cdbLeader" class="select" maxlength="100" value="${esc(leader)}"></label></div><button id="cdbLoad" class="btn secondary">${txt('batchPreview')}</button><p id="cdbStatus" role="status">${esc(message)}</p><div id="cdbRows">${loaded?`<label><input id="cdbAll" type="checkbox" checked>${txt('batchSelectAll')}</label>${table(['inspectionDate','department','equipmentCode','equipmentName','status'],rows.map((r,i)=>`<tr><td><label><input data-cdb-row="${i}" type="checkbox" ${r.state==='pending'?'checked':'disabled'}>${esc(r.date)}</label></td><td>${esc(nameOf(data.departments.find(d=>d.id===r.equipment.department_id)))}</td><td>${esc(r.equipment.machine_no)}</td><td>${esc(nameOf(r.equipment))}</td><td>${txt(r.state==='done'?'batchDone':r.state==='existing'?'cdbExisting':r.state==='failed'?'cdbError':'batchReady')}</td></tr>`).join(''))}<label><input id="cdbActual" type="checkbox">${txt('cdbConfirm')}</label>${powerCheckButton('craneDailyBatch','id="cdbSubmit"')}`:''}</div>`;
 const invalidate=()=>{dept=$('#cdbDept').value;start=$('#cdbStart').value;end=$('#cdbEnd').value;rows=[];loaded=false;message='';ticket++;draw();};for(const id of ['cdbDept','cdbStart','cdbEnd'])$('#'+id).onchange=invalidate;
 $('#cdbInspector').oninput=e=>{name=e.target.value;};$('#cdbLeader').oninput=e=>{leader=e.target.value;};
 $('#cdbLoad').onclick=preview;if(loaded){$('#cdbAll').onchange=e=>{$$('[data-cdb-row]:not(:disabled)').forEach(x=>x.checked=e.target.checked);$('#cdbActual').checked=false;};$$('[data-cdb-row]').forEach(x=>x.onchange=()=>{$('#cdbActual').checked=false;});$('#cdbSubmit').onclick=submit;$('#cdbSubmit').disabled=!rows.some(r=>r.state==='pending');}
 if(running||loading)$('#content').querySelectorAll('button,input,select').forEach(x=>x.disabled=true);
}
async function preview(){
 if(running||loading)return;let dates;try{dates=InspectionNormalRange.dates(start,end,inspectionDay());}catch{message=t('batchRangeHelp');draw();return;}
 const machines=equipment();if(!machines.length){message=t('cdbNoEquipment');draw();return;}
 const own=key(),n=++ticket;loaded=false;rows=[];loading=true;message=t('cdbLoading');draw();
 try{const months=[...new Set(dates.map(d=>d.slice(0,7)))],result=[];for(const e of machines){const records=[];for(const month of months){const r=await api({action:'crane_month',equipment_id:e.id,kind:'daily',month});if(own!==key()||n!==ticket||view!=='craneDailyBatch')return;records.push(...r.records);}for(const date of dates)result.push({equipment:e,date,state:records.some(r=>r.inspection_date===date)?'existing':'pending'});}
 if(own===key()&&n===ticket){rows=result;loaded=true;message=t('batchReady')+'：'+rows.filter(r=>r.state==='pending').length+' / '+rows.length;}
 }catch{if(own===key()&&n===ticket)message=t('cdbError');}finally{loading=false;if(own===key()&&view==='craneDailyBatch')draw();}
}
async function submit(){
 if(running||loading||!allowed())return;const selected=$$('[data-cdb-row]:checked').map(x=>rows[+x.dataset.cdbRow]).filter(r=>r.state==='pending'),inspector=name.trim(),leaderName=leader.trim();
 if(!selected.length||!inspector||!$('#cdbActual').checked){$('#cdbStatus').textContent=t('cdbRequired');return;}
 const own=key();running=true;countryBusy++;let done=0,skipped=0,failed=0;draw();
 try{for(const r of selected){if(own!==key())break;try{await api({action:'crane_save',equipment_id:r.equipment.id,kind:'daily',inspection_date:r.date,revision:0,template_revision:0,results:CRANE_TEMPLATE.daily.items.map(i=>({id:i.id,value:'ˇ'})),details:{location:r.equipment.location||'',measures:''},inspector_name:inspector,leader_name:leaderName,supervisor_name:'',completed:true,confirmed:false});r.state='done';done++;}
 catch(e){if(['record_changed','equipment_changed','invalid_crane'].includes(e.message)){r.state='existing';skipped++;}else{failed++;r.state='failed';message=t('cdbError');break;}}
 message=t('batchDone')+'：'+done+'；'+t('batchSkipped')+'：'+skipped+'；'+t('batchPending')+'：'+(selected.length-done-skipped);if(own===key()&&view==='craneDailyBatch')$('#cdbStatus').textContent=message;
 }}finally{countryBusy--;running=false;if(own===key()){message=t('batchDone')+'：'+done+'；'+t('batchSkipped')+'：'+skipped+'；'+t('batchPending')+'：'+(selected.length-done-skipped)+(failed?' — '+t('cdbError'):'');if(view==='craneDailyBatch')draw();}}
}
if(profile&&activeCountry)render();
})();
