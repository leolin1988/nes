/* Bulk review uses the existing per-record authorization and audit trail. */
(()=>{
const labels={
bulkApprove:['合格設備一鍵完成簽核','Approve all qualified records','Aprobar todos los registros conformes','Duyệt tất cả bản ghi đạt'],
bulkHelp:['僅處理目前部門／群組篩選內，已送出、待簽核且全部項目合格的紀錄；不代填未點檢設備。','Only submitted, pending records with every item normal in the current department/group filters are included. Uninspected equipment is not filled in.','Solo registros enviados y pendientes con todos los ítems normales dentro de los filtros. No se rellenan inspecciones faltantes.','Chỉ bản ghi đã gửi, chờ duyệt và mọi mục bình thường trong bộ lọc; không điền thay thiết bị chưa kiểm tra.'],
bulkSignatureHelp:['簽核人會由目前登入帳號帶入；請先核對清單，再勾選確認執行。每筆結果會逐一寫入簽核紀錄。','The reviewer is filled from your signed-in account. Review the list and confirm to proceed; each approval is recorded individually.','El revisor se completa con la cuenta activa. Revise la lista y confirme; cada aprobación queda registrada.','Người duyệt được điền từ tài khoản đang đăng nhập. Hãy xem danh sách và xác nhận; từng lần duyệt sẽ được ghi lại.'],
bulkCount:['合格紀錄筆數','Qualified records','Registros conformes','Số bản ghi đạt'],
bulkNote:['已查核本批次所有設備及點檢項目，結果皆合格。','Reviewed all equipment and inspection items in this batch; all qualified.','Se revisaron todos los equipos e ítems del lote; todos conformes.','Đã kiểm tra mọi thiết bị và hạng mục trong đợt; tất cả đạt.'],
bulkDone:['本次成功簽核','Approved in this batch','Aprobados en este lote','Đã duyệt trong đợt'],
bulkRemaining:['未完成（可關閉後重新整理，再重試剩餘紀錄）','Not completed (close, refresh and retry remaining records)','Sin completar (cierre, actualice y reintente los restantes)','Chưa hoàn tất (đóng, tải lại và thử các bản ghi còn lại)'],
bulkProgress:['簽核進度','Approval progress','Progreso de aprobación','Tiến độ duyệt'],
bulkChanged:['資料已變更，請重新整理後再簽核。','Data changed. Refresh before approving.','Los datos cambiaron. Actualice antes de aprobar.','Dữ liệu đã đổi. Tải lại trước khi duyệt.'],
bulkSkipped:['待簽核但不符合一鍵簽核條件','Pending but not eligible for bulk approval','Pendientes no aptos para aprobación masiva','Chờ duyệt nhưng không đủ điều kiện duyệt hàng loạt'],
bulkNoEligible:['目前沒有可一鍵簽核的紀錄。需為已送出的待簽核資料，且所有點檢項目均為正常；其他紀錄請逐筆查核。','No records are eligible for bulk approval. Records must be submitted, pending, and have every inspection item marked normal. Review other records individually.','No hay registros aptos para aprobación masiva. Deben estar enviados, pendientes y con todos los ítems normales. Revise los demás individualmente.','Không có bản ghi đủ điều kiện duyệt hàng loạt. Bản ghi phải đã gửi, đang chờ duyệt và mọi mục kiểm tra đều bình thường. Hãy duyệt từng bản ghi khác.'],
bulkConfirmCount:['確認簽核 {count} 筆合格紀錄','Confirm approval of {count} qualified records','Confirmar {count} registros conformes','Xác nhận duyệt {count} bản ghi đạt'],
bulkReviewerRequired:['請輸入簽核人姓名。','Enter the reviewer name.','Ingrese el nombre del revisor.','Nhập tên người duyệt.'],
bulkNoteRequired:['請填寫簽核說明。','Enter an approval note.','Ingrese una nota de aprobación.','Nhập ghi chú phê duyệt.'],
bulkCheckRequired:['請先勾選確認，系統才會執行簽核。','Check the confirmation box before approving.','Marque la casilla de confirmación antes de aprobar.','Đánh dấu ô xác nhận trước khi duyệt.'],
bulkSessionRequired:['登入狀態已失效，請重新登入後重試；本次尚未送出簽核。','Session expired. Sign in again; no approvals were sent.','Sesión caducada. Inicie sesión; no se enviaron aprobaciones.','Phiên đã hết hạn. Đăng nhập lại; chưa gửi phê duyệt.'],
bulkServerDenied:['伺服器拒絕簽核請求，請重新整理後重試；若仍失敗，請提供下列紀錄編號。','Server rejected the approval. Refresh and retry; if it persists, provide the record ID below.','El servidor rechazó la aprobación. Actualice; si persiste, facilite el ID.','Máy chủ từ chối phê duyệt. Tải lại; nếu vẫn lỗi, cung cấp mã bản ghi.']
};for(const[k,v]of Object.entries(labels))translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,i)=>[l,v[i]]));
function qualifiedRecords(){const ids=new Set(filteredEquipment().filter(e=>!e.archived_at&&accessCan(e.department_id,'daily','approve')).map(e=>e.id));return data.records.filter(r=>ids.has(r.equipment_id)&&r.approval_status==='pending'&&!r.is_draft&&r.overall_status==='normal'&&Array.isArray(r.answers)&&r.answers.length&&r.answers.every(a=>a?.value==='normal'));}
const singleRender=renderApprovals;
renderApprovals=function(){singleRender();if(!canManage())return;const records=qualifiedRecords(),equipmentIds=new Set(filteredEquipment().map(e=>e.id)),pending=data.records.filter(r=>equipmentIds.has(r.equipment_id)&&r.approval_status==='pending'&&!r.is_draft),skipped=Math.max(0,pending.length-records.length),row=$('#content .filter-row');if(row)row.insertAdjacentHTML('afterend',`<section class="notice"><p>${txt('bulkHelp')}</p><p>${txt('bulkCount')}：${records.length}　·　${txt('bulkSkipped')}：${skipped}</p>${records.length?'':`<p role="status">${txt('bulkNoEligible')}</p>`}</section>`);$('#content').insertAdjacentHTML('afterbegin',button('bulkApprove',`id="bulkApprove" ${records.length?'':'disabled'}`,'primary'));$('#bulkApprove').onclick=()=>{const eligible=qualifiedRecords();if(eligible.length)openBulkReview(eligible);};};
function openBulkReview(records){
 if(!canManage()||!records.length)return;
 const country=activeCountry,generation=countryGeneration,account=profile.account_id;
 const reviewer=localStorage.getItem('inspection_reviewer_name')||profile.full_name||profile.account_code||'';
 const modal=dialog('bulkReview',t('bulkApprove'),`<p>${txt('bulkHelp')}</p><p><strong>${txt('bulkConfirmCount').replace('{count}',String(records.length))}</strong></p><p class="muted">${txt('bulkSignatureHelp')}</p><label>${txt('reviewerName')}<input class="select" id="bulkReviewer" maxlength="100" autocomplete="name" required value="${esc(reviewer)}"></label><label>${txt('reviewNote')}<textarea class="select" id="bulkNote" maxlength="2000">${esc(translations.bulkNote[primary])}</textarea></label><label class="checkbox-line"><input type="checkbox" id="bulkChecked">${txt('reviewChecked')}</label><p id="bulkStatus" role="alert" aria-live="assertive" style="min-height:1.6em;padding:8px 10px;background:#fff4d6;border-radius:6px;font-weight:700"></p>${table(['inspectionDate','equipmentCode','inspector'],records.map(r=>`<tr><td>${esc(recordDay(r))}</td><td>${esc(data.equipment.find(e=>e.id===r.equipment_id)?.equipment_code)}</td><td>${esc(r.inspector_name||'—')}</td></tr>`).join(''))}`,button('approve','id="bulkConfirm"','primary')+button('close','id="bulkClose"'));
 const status=modal.querySelector('#bulkStatus');status.textContent=txt('bulkSignatureHelp');let running=false;
 modal.querySelector('#bulkClose').onclick=()=>{if(!running){modal.remove();load();}};
 modal.querySelector('.x').onclick=()=>{if(!running){modal.remove();load();}};
 const confirmButton=modal.querySelector('#bulkConfirm');confirmButton.textContent=t('bulkConfirmCount').replace('{count}',String(records.length));
 confirmButton.onclick=async()=>{
  if(running)return;
  const name=modal.querySelector('#bulkReviewer').value.trim(),note=modal.querySelector('#bulkNote').value.trim();
  if(!name){status.textContent=t('bulkReviewerRequired');modal.querySelector('#bulkReviewer').focus();return;}
  if(!note){status.textContent=t('bulkNoteRequired');modal.querySelector('#bulkNote').focus();return;}
  if(!modal.querySelector('#bulkChecked').checked){status.textContent=t('bulkCheckRequired');modal.querySelector('#bulkChecked').focus();return;}
  if(country!==activeCountry||generation!==countryGeneration||account!==profile?.account_id){status.textContent=t('bulkChanged');confirmButton.disabled=true;return;}
  running=true;modal.querySelectorAll('button,input,textarea').forEach(e=>e.disabled=true);let done=0,failed=0,processed=0,lastError='';
  // Keep country switching blocked throughout the whole batch, including gaps between requests.
  countryBusy++;
  try{
   try{const session=await api({action:'session'});if(session.profile?.account_id!==account)throw Error('auth');}
   catch(error){failed=records.length;lastError=t('bulkSessionRequired');return;}
   for(const r of records){
   if(country!==activeCountry||generation!==countryGeneration||account!==profile?.account_id){failed+=records.length-processed;break;}
   try{await api({action:'record_approve',id:r.id,approve:true,normal_only:true,reviewer_name:name,review_note:note,review_confirmed:true});r.approval_status='approved';done++;}
   catch(error){lastError=['already_reviewed','not_qualified'].includes(error.message)?t('bulkChanged'):t(error.message==='forbidden'?'accessDenied':error.message==='review_required'?'reviewRequired':'bulkServerDenied');lastError+=' ['+r.id+']';failed++;if(!['already_reviewed','not_qualified'].includes(error.message)){failed+=records.length-processed-1;processed++;break;}}
   processed++;status.textContent=t('bulkProgress')+' '+processed+' / '+records.length;
  }}finally{countryBusy--;running=false;localStorage.setItem('inspection_reviewer_name',name);modal.querySelectorAll('button').forEach(e=>e.disabled=false);confirmButton.disabled=true;status.textContent=t('bulkDone')+'：'+done+'；'+t('bulkRemaining')+'：'+failed+(lastError?' — '+lastError:'');if(view==='approval'&&country===activeCountry)renderContent();}
 };
 if(!reviewer)modal.querySelector('#bulkReviewer').focus();
}
})();
