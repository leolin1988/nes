(()=>{
const words={
cbEntry:['點檢填報','Inspection entry','Registro de inspección','Nhập kiểm tra'],cbReview:['主管審核','Supervisor approval','Aprobación del supervisor','Quản lý duyệt'],
cbEntryHelp:['先實際完成點檢，再批次填報：僅將所選日期的空白項目填為正常，保留既有結果、備註及值班姓名。已簽核或待改善紀錄不處理；填報後須另到主管審核。','After actual inspection, fill only blank items as normal. Existing results, notes and duty names are retained. Signed or unresolved records are excluded. Supervisor approval is a separate step.','Tras inspeccionar, complete solo vacíos como normales. Se conservan resultados, notas y responsables. Se excluyen registros firmados o pendientes. La aprobación es independiente.','Sau khi kiểm tra thực tế, chỉ điền ô trống là bình thường. Giữ kết quả, ghi chú và tên người trực. Loại bản ghi đã ký hoặc chưa xử lý. Duyệt là bước riêng.'],
cbEntryConfirm:['我確認所選部門與日期均已實際點檢，空白項目可填報正常。','I confirm actual inspection of all selected departments and dates; blank items may be recorded as normal.','Confirmo la inspección real de las fechas y departamentos; los vacíos pueden registrarse como normales.','Tôi xác nhận đã kiểm tra thực tế các ngày và bộ phận đã chọn; có thể điền ô trống là bình thường.'],
cbEntryReady:['可填報','Ready for entry','Disponible','Có thể nhập'],cbEntryExcluded:['已填完整、已簽核或待改善，排除','Complete, signed or unresolved; excluded','Completo, firmado o pendiente; excluido','Đầy đủ, đã ký hoặc chưa xử lý; loại trừ'],
cbEntryLoad:['讀取點檢清單','Load inspection list','Cargar inspecciones','Tải danh sách kiểm tra'],
cbEntrySubmit:['批次完成點檢填報','Complete inspection entry','Completar inspecciones','Hoàn tất nhập kiểm tra'],

cadreBulk:['QR18-13 幹部批次點檢與審核','QR18-13 Batch inspection and approval','QR18-13 Inspección y aprobación por lote','QR18-13 Kiểm tra và duyệt hàng loạt'],
cbHelp:['依目前國家、部門及日期區間審核已有紀錄。不補填空白，不更改原點檢結果；只納入完整、無待改善且尚未簽核的紀錄。','Review existing records by country, department and date range. No missing inspections are filled or results changed. Only complete, resolved, unsigned records qualify.','Revise registros por país, departamento y fechas. No se rellenan vacíos ni se cambian resultados. Solo registros completos, resueltos y sin firma.','Duyệt bản ghi theo quốc gia, bộ phận và khoảng ngày. Không điền thay hay đổi kết quả. Chỉ duyệt bản ghi đầy đủ, đã xử lý và chưa ký.'],
cbStart:['開始日期','Start date','Fecha inicial','Từ ngày'],cbEnd:['結束日期','End date','Fecha final','Đến ngày'],cbPreview:['讀取審核清單','Load review list','Cargar lista','Tải danh sách'],
cbAll:['全部門','All departments','Todos los departamentos','Tất cả bộ phận'],cbSelect:['選取／取消全部可審核紀錄','Select / deselect all eligible records','Seleccionar / desmarcar elegibles','Chọn / bỏ chọn bản ghi hợp lệ'],
cbConfirm:['我已查核所選日期與部門的點檢結果，確認批次簽核。','I reviewed the selected dates, departments and results and confirm approval.','He revisado las fechas, departamentos y resultados seleccionados y confirmo la aprobación.','Tôi đã kiểm tra ngày, bộ phận và kết quả đã chọn, xác nhận duyệt.'],
cbReady:['可審核','Eligible','Elegible','Có thể duyệt'],cbExcluded:['已簽核、未填完整或待改善，排除','Signed, incomplete or unresolved; excluded','Firmado, incompleto o pendiente; excluido','Đã ký, thiếu hoặc chưa xử lý; loại trừ'],
cbInvalid:['請選有效日期區間（最多 367 天），並重新讀取清單。','Choose a valid date range (up to 367 days) and load the list.','Elija fechas válidas (hasta 367 días) y cargue la lista.','Chọn khoảng ngày hợp lệ (tối đa 367 ngày) và tải danh sách.'],
cbRequired:['請選取紀錄、填審核姓名並勾選查核確認。','Select records, enter reviewer name and confirm review.','Seleccione registros, indique el revisor y confirme.','Chọn bản ghi, nhập tên người duyệt và xác nhận.'],
cbSummary:['成功／未完成／待處理','Approved / incomplete / remaining','Aprobados / incompletos / restantes','Đã duyệt / chưa xong / còn lại'],
cbEmpty:['此區間沒有紀錄。','No records in this range.','No hay registros en este período.','Không có bản ghi trong khoảng này.'],
cbChanged:['資料已變更或已簽核，請重新讀取。','Record changed or already signed. Reload.','El registro cambió o ya está firmado. Recargue.','Bản ghi đã đổi hoặc đã ký. Tải lại.']
};for(const[k,v]of Object.entries(words))translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,i)=>[l,v[i]]));
let scope='',rows=[],running=false,ticket=0,loaded=false,message='',start='',end='',dept='',mode='entry';
const currentScope=()=>activeCountry+':'+countryGeneration+':'+profile?.account_id;
const priorRender=render;render=function(){if(view==='cadreBulk'&&profile?.role!=='admin')view='board';priorRender();if(profile?.role==='admin'&&activeCountry){const b=document.createElement('button');b.className='nav'+(view==='cadreBulk'?' active':'');b.dataset.view='cadreBulk';b.innerHTML=txt('cadreBulk');b.onclick=()=>{view='cadreBulk';render();};$('.side').append(b);}};
const priorContent=renderContent;renderContent=function(){if(view!=='cadreBulk'||profile?.role!=='admin'||!activeCountry)return priorContent();draw();};
function draw(){
 if(scope!==currentScope()){scope=currentScope();rows=[];loaded=false;message='';end=inspectionDay();start=end.slice(0,7)+'-01';dept='';mode='entry';}
 $('.page-title h1').innerHTML=txt('cadreBulk');
 $('#content').innerHTML=`<div class="filter-row" role="tablist"><button role="tab" aria-selected="${mode==='entry'}" class="btn ${mode==='entry'?'primary':'secondary'}" id="cbEntryTab">${txt('cbEntry')}</button><button role="tab" aria-selected="${mode==='review'}" class="btn ${mode==='review'?'primary':'secondary'}" id="cbReviewTab">${txt('cbReview')}</button></div><p class="notice">${txt(mode==='entry'?'cbEntryHelp':'cbHelp')}</p><div class="filter-row"><label>${txt('department')}<select id="cbDept" class="select"><option value="">${t('cbAll')}</option>${data.departments.filter(d=>d.is_active!==false).map(d=>`<option value="${esc(d.id)}" ${dept===d.id?'selected':''}>${esc(nameOf(d))}</option>`).join('')}</select></label><label>${txt('cbStart')}<input class="select" id="cbStart" type="date" value="${start}"></label><label>${txt('cbEnd')}<input class="select" id="cbEnd" type="date" value="${end}" max="${inspectionDay()}"></label><button class="btn secondary" id="cbLoad">${txt(mode==='entry'?'cbEntryLoad':'cbPreview')}</button></div><section class="notice"><label>${txt(mode==='entry'?'cadreDuty':'reviewerName')}<input id="cbName" class="select" maxlength="100" value="${esc(localStorage.getItem(mode==='entry'?'inspection_operator_name':'inspection_reviewer_name')||'')}"></label><label><input type="checkbox" id="cbChecked">${txt(mode==='entry'?'cbEntryConfirm':'cbConfirm')}</label>${powerCheckButton(mode==='entry'?'cbEntrySubmit':'cbReview','id="cbSubmit"')}<p id="cbStatus" role="status">${esc(message)}</p></section><label><input type="checkbox" id="cbAll">${txt('cbSelect')}</label><div class="table-wrap"><table><thead><tr><th></th><th>${txt('department')}</th><th>${txt('inspectionDate')}</th><th>${txt('cadreDuty')}</th><th>${txt('result')}</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><input type="checkbox" data-cb-row="${i}" ${r.eligible?'checked':'disabled'} aria-label="${esc(r.inspection_date+' '+nameOf(data.departments.find(d=>d.id===r.department_id)))}"></td><td>${esc(nameOf(data.departments.find(d=>d.id===r.department_id)))}</td><td>${esc(r.inspection_date)}</td><td>${esc(r.duty_name)}</td><td>${txt(mode==='entry'?(r.eligible?'cbEntryReady':'cbEntryExcluded'):(r.eligible?'cbReady':'cbExcluded'))}</td></tr>`).join('')}</tbody></table></div>${loaded&&!rows.length?`<p>${txt('cbEmpty')}</p>`:''}`;
 for(const [id,value] of [['cbEntryTab','entry'],['cbReviewTab','review']])$('#'+id).onclick=()=>{if(running)return;mode=value;rows=[];loaded=false;message='';ticket++;draw();};
 const invalidate=()=>{dept=$('#cbDept').value;start=$('#cbStart').value;end=$('#cbEnd').value;rows=[];loaded=false;message=t('cbInvalid');ticket++;draw();};
 for(const id of ['cbDept','cbStart','cbEnd'])$('#'+id).onchange=invalidate;
 $('#cbAll').onchange=e=>$$('[data-cb-row]:not(:disabled)').forEach(x=>x.checked=e.target.checked);
 $('#cbLoad').onclick=preview;$('#cbSubmit').onclick=submit;
 if(running)$('#content').querySelectorAll('input,select,button').forEach(x=>x.disabled=true);else $('#cbSubmit').disabled=!loaded||!rows.some(r=>r.eligible);
}
async function preview(){
 if(running)return;const s=$('#cbStart').value,e=$('#cbEnd').value,d=$('#cbDept').value;
 if(!s||!e||e<s||(Date.parse(e)-Date.parse(s))/86400000>366){$('#cbStatus').textContent=t('cbInvalid');return;}
 const own=scope,n=++ticket;$('#cbLoad').disabled=true;$('#cbSubmit').disabled=true;
 try{const r=await api({action:'cadre_bulk_list',start:s,end:e,department_id:d,mode});if(own!==currentScope()||n!==ticket||view!=='cadreBulk')return;rows=r.records;loaded=true;message=t(mode==='entry'?'cbEntryReady':'cbReady')+'：'+rows.filter(x=>x.eligible).length+' / '+rows.length;draw();}catch(e){if(own===currentScope()&&view==='cadreBulk'){$('#cbStatus').textContent=t('error');$('#cbLoad').disabled=false;}}
}
async function submit(){
 if(running)return;const chosen=$$('[data-cb-row]:checked').map(x=>rows[+x.dataset.cbRow]).filter(r=>r?.eligible),name=$('#cbName').value.trim();
 if(!chosen.length||!name||!$('#cbChecked').checked){$('#cbStatus').textContent=t('cbRequired');return;}
 const own=currentScope();running=true;countryBusy++;let done=0,failed=0,processed=0;draw();
 try{for(const r of chosen){if(own!==currentScope())break;
  try{await api(mode==='entry'?{action:'cadre_bulk_entry',department_id:r.department_id,inspection_date:r.inspection_date,revision:r.revision,template_revision:r.template_revision,duty_name:name,inspection_confirmed:true}:{action:'cadre_bulk_confirm',id:r.id,revision:r.revision,reviewer_name:name,review_confirmed:true});r.eligible=false;done++;}catch(e){failed++;if(!['record_changed','not_qualified'].includes(e.message)){message=t(e.message==='forbidden'?'accessDenied':'error');processed++;break;}}
  processed++;message=t('cbSummary')+'：'+done+' / '+failed+' / '+(chosen.length-processed);if(view==='cadreBulk'&&own===currentScope())$('#cbStatus').textContent=message;
 }}finally{countryBusy--;running=false;localStorage.setItem(mode==='entry'?'inspection_operator_name':'inspection_reviewer_name',name);if(own===currentScope()){message=t('cbSummary')+'：'+done+' / '+failed+' / '+(chosen.length-processed)+(failed?' — '+t('cbChanged'):'');if(view==='cadreBulk')draw();}}
}
})();
