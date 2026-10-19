const inspectionExtraWords = `referencePhoto|項目參考照片|Item reference photo|Foto de referencia del ítem|Ảnh tham khảo của mục
uploadReference|上傳／更換照片|Upload / replace photo|Subir / reemplazar foto|Tải lên / thay ảnh
removeReference|移除參考照片|Remove reference photo|Quitar foto de referencia|Gỡ ảnh tham khảo
noReference|尚未設定參考照片|No reference photo yet|Sin foto de referencia|Chưa có ảnh tham khảo
referenceHelp|支援 JPG、PNG、WebP，選取後自動縮圖；儲存表單後生效。|JPG, PNG and WebP are resized automatically. Save the form to apply.|JPG, PNG y WebP se reducen automáticamente. Guarde el formulario para aplicar.|JPG, PNG và WebP được tự động thu nhỏ. Lưu biểu mẫu để áp dụng.
photoUploading|照片上傳中，請稍候|Uploading photo; please wait|Subiendo foto; espere|Đang tải ảnh; vui lòng đợi
photoLoadError|照片無法載入，按此重試|Photo unavailable; click to retry|Foto no disponible; pulse para reintentar|Không tải được ảnh; bấm để thử lại
photoInvalid|請選擇 10 MB 以下的 JPG、PNG 或 WebP 照片|Choose a JPG, PNG or WebP photo under 10 MB|Elija una foto JPG, PNG o WebP de menos de 10 MB|Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB
enlargePhoto|點擊放大照片|Click to enlarge photo|Pulse para ampliar|Bấm để phóng to
backfill|補設備點檢|Backfill equipment inspection|Registrar inspección atrasada|Bổ sung kiểm tra thiết bị
backfillHelp|選擇過去的點檢日期及班別後填寫。系統另保留實際補登時間，送出後仍須主管簽核。|Choose a past inspection date and shift. The actual entry time is retained; supervisor approval is still required.|Elija una fecha pasada y turno. Se conserva la hora real de registro y se requiere aprobación.|Chọn ngày kiểm tra trước đây và ca. Giữ thời gian nhập thực tế; vẫn cần quản lý duyệt.
inspectionDate|點檢日期|Inspection date|Fecha de inspección|Ngày kiểm tra
recordedAt|實際登錄時間|Actual entry time|Hora real de registro|Thời gian nhập thực tế
backfillReason|補登原因|Reason for late entry|Motivo del registro tardío|Lý do bổ sung
backfillTag|補登|Late entry|Registro tardío|Bổ sung
startBackfill|補填此設備|Backfill this equipment|Registrar este equipo|Bổ sung thiết bị này
pastDateRequired|請選擇今天以前的有效日期|Choose a valid date before today|Elija una fecha válida anterior a hoy|Chọn ngày hợp lệ trước hôm nay
backfillReasonRequired|請填寫補登原因|Enter a reason for late entry|Indique el motivo del registro tardío|Nhập lý do bổ sung
duplicateInspection|此設備於該日期、班別已有送出紀錄，請查看歷史紀錄|This equipment already has a submitted inspection for that date and shift; check history|Ya existe una inspección para este equipo, fecha y turno; revise el historial|Thiết bị đã có bản ghi cho ngày và ca này; xem lịch sử
normalEntry|一般點檢|Regular inspection|Inspección normal|Kiểm tra thông thường
entryType|登錄方式|Entry type|Tipo de registro|Loại nhập
usingCurrentForm|補登使用目前指定的點檢表，送出時保留項目與照片版本。|Late entries use the currently assigned form; item and photo versions are retained on submission.|Se usa el formulario asignado actualmente; se conserva la versión de ítems y fotos al enviar.|Bổ sung dùng biểu mẫu đang được chỉ định; giữ phiên bản mục và ảnh khi gửi.
dateFrom|起始日期|From date|Desde|Từ ngày
dateTo|結束日期|To date|Hasta|Đến ngày
photo_match_ambiguous|項目照片對應不明，請先檢查重複項目|Photo mapping is ambiguous; review duplicate items|Asignación de fotos ambigua; revise ítems duplicados|Ghép ảnh không rõ; kiểm tra mục trùng lặp
retrySubmission|重試原送出|Retry original submission|Reintentar envío original|Thử lại lần gửi ban đầu
submissionUncertain|尚未確認儲存結果；重試會沿用同一筆送出，避免重複。|Save status is unconfirmed. Retry reuses the same submission to avoid duplicates.|Guardado sin confirmar. Reintentar reutiliza el envío para evitar duplicados.|Chưa xác nhận lưu. Thử lại dùng cùng lần gửi để tránh trùng.`;
inspectionExtraWords.split('\n').forEach(line=>{const [k,...v]=line.split('|');translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,n)=>[l,v[n]]));});

const inspectionDayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'});
function inspectionDay(value=new Date()) {return inspectionDayFormatter.format(new Date(value));}
function previousInspectionDay() {const d=new Date(inspectionDay()+'T12:00:00+08:00');d.setUTCDate(d.getUTCDate()-1);return inspectionDay(d);}
function recordDay(r) {return r.inspection_date || inspectionDay(r.inspected_at);}
function dayLabel(day) {return /^\d{4}-\d{2}-\d{2}$/.test(day||'')?day:'—';}
function validPastDay(day) {return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day&&day<inspectionDay();}
let backfillDate=previousInspectionDay(),backfillShift='day',backfillName=localStorage.getItem('inspection_operator_name')||'',backfillNote='';
let historyFrom='',historyTo='',historyType='';
const photoCache=new Map();let photoCacheToken='';let pendingReferenceUploads=0;
function referencePhotoMarkup(item,context={}) {
  const id=item?.reference_photo_id;
  return id?`<div class="reference-photo-block"><strong>${txt('referencePhoto')}</strong><button type="button" class="reference-photo-button" data-reference-photo="${esc(id)}" data-photo-form="${esc(context.form_id||'')}" data-photo-record="${esc(context.record_id||'')}" aria-label="${txt('enlargePhoto')}"><span>${txt('loading')}</span></button></div>`:'';
}
async function getReferencePhoto(id,context={}) {
  const token=localStorage.getItem('inspection_token');
  if(token!==photoCacheToken){photoCache.clear();photoCacheToken=token;}
  const cached=photoCache.get(id);if(cached?.expires>Date.now())return cached.url;
  const r=await api({action:'reference_photo_get',photo_id:id,...context});
  if(token!==localStorage.getItem('inspection_token'))throw Error('session_changed');
  photoCache.set(id,{url:r.photo.url,expires:Date.now()+(r.photo.expires_in-30)*1000});return r.photo.url;
}
function bindReferencePhotos(container=document) {
  container.querySelectorAll('[data-reference-photo]').forEach(el=>{
    const loadPhoto=async()=>{
      try{
        const url=await getReferencePhoto(el.dataset.referencePhoto,{form_id:el.dataset.photoForm||undefined,record_id:el.dataset.photoRecord||undefined});
        if(!el.isConnected)return;
        el.innerHTML=`<img loading="lazy" src="${esc(url)}" alt="${txt('referencePhoto')}"><span>${txt('enlargePhoto')}</span>`;
        el.onclick=async()=>{try{const fresh=await getReferencePhoto(el.dataset.referencePhoto,{form_id:el.dataset.photoForm||undefined,record_id:el.dataset.photoRecord||undefined});const m=dialog('referencePhotoViewer',t('referencePhoto'),`<img class="reference-photo-large" src="${esc(fresh)}" alt="${txt('referencePhoto')}">`);m.style.zIndex='20';}catch{toast('error');}};
        el.querySelector('img').onerror=()=>{photoCache.delete(el.dataset.referencePhoto);el.textContent=t('photoLoadError');el.onclick=loadPhoto;};
      }catch{if(el.isConnected){el.textContent=t('photoLoadError');el.onclick=loadPhoto;}}
    };loadPhoto();
  });
}
async function resizeReferencePhoto(file) {
  if(!file||file.size>10*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('photoInvalid');
  const objectURL=URL.createObjectURL(file);
  try {
    const image=new Image();image.src=objectURL;await image.decode();
    if(!image.naturalWidth||!image.naturalHeight)throw Error('photoInvalid');
    const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    let output=canvas.toDataURL('image/jpeg',.82);
    if(output.length>2600000)output=canvas.toDataURL('image/jpeg',.6);
    if(output.length>2600000)throw Error('photoInvalid');return output;
  } finally {URL.revokeObjectURL(objectURL);}
}
const originalPhotoEditor=renderEditor;
renderEditor=function(){
  originalPhotoEditor();const form=editing,modal=$('#editor');
  modal.querySelectorAll('.dialog-body > .item').forEach((box,n)=>{
    const item=form.items[n],area=document.createElement('section');area.className='reference-editor';
    area.innerHTML=`<h4>${txt('referencePhoto')}</h4><p class="muted">${txt('referenceHelp')}</p>${referencePhotoMarkup(item,{form_id:form.id})||`<p>${txt('noReference')}</p>`}<div class="filter-row"><label class="btn secondary">${txt('uploadReference')}<input data-reference-upload="${n}" type="file" accept="image/jpeg,image/png,image/webp"></label>${item.reference_photo_id?button('removeReference',`data-remove-reference="${n}"`,'danger'):''}</div><p class="photo-progress" role="status"></p>`;
    box.append(area);
    area.querySelector('input').onchange=async e=>{
      const file=e.target.files[0];if(!file)return;const auth=localStorage.getItem('inspection_token');pendingReferenceUploads++;
      $('#saveForm').disabled=true;area.querySelector('.photo-progress').textContent=t('photoUploading');e.target.disabled=true;
      try{
        const photo=await resizeReferencePhoto(file),r=await api({action:'reference_photo_upload',photo,filename:file.name});
        if(auth!==localStorage.getItem('inspection_token'))return;
        photoCacheToken=auth;photoCache.set(r.photo.id,{url:r.photo.url,expires:Date.now()+(r.photo.expires_in-30)*1000});
        if(editing===form && form.items.includes(item))item.reference_photo_id=r.photo.id;
      }catch(error){toast(translations[error.message]?error.message:'error');}
      finally{pendingReferenceUploads--;if(editing===form){renderEditor();if($('#saveForm'))$('#saveForm').disabled=pendingReferenceUploads>0;}}
    };
    area.querySelector('[data-remove-reference]')?.addEventListener('click',()=>{item.reference_photo_id=null;renderEditor();});
  });
  if($('#saveForm'))$('#saveForm').disabled=pendingReferenceUploads>0;
  bindReferencePhotos(modal);
};
const originalPhotoFormDetail=formDetail;
formDetail=function(id){originalPhotoFormDetail(id);const f=data.forms.find(x=>x.id===id),modal=$('#detail');modal.querySelectorAll('tbody tr').forEach((row,n)=>{if(f.items[n]?.reference_photo_id)row.cells[1].insertAdjacentHTML('beforeend',referencePhotoMarkup(f.items[n],{form_id:id}));});bindReferencePhotos(modal);};

function recordsForDay(eid,day,selectedShift){return data.records.filter(r=>r.equipment_id===eid&&recordDay(r)===day&&r.shift===selectedShift).sort((a,b)=>String(b.recorded_at||b.inspected_at).localeCompare(String(a.recorded_at||a.inspected_at)));}
let latestIndexSource=null,latestIndexDay='',latestIndexShift='',latestIndex=new Map();
latest=function(e){
 const day=inspectionDay();
 if(latestIndexSource!==data.records||latestIndexDay!==day||latestIndexShift!==shift){
  latestIndexSource=data.records;latestIndexDay=day;latestIndexShift=shift;latestIndex=new Map();
  const rows=data.records.filter(r=>recordDay(r)===day&&r.shift===shift).sort((a,b)=>String(b.recorded_at||b.inspected_at).localeCompare(String(a.recorded_at||a.inspected_at)));
  for(const r of rows){const old=latestIndex.get(r.equipment_id);if(!old||((old.is_draft||old.approval_status==='rejected')&&!r.is_draft&&r.approval_status!=='rejected'))latestIndex.set(r.equipment_id,r);}
 }
 return latestIndex.get(e.id);
};
function renderBackfill(){
  const eligible=filteredEquipment();
  $('#content').innerHTML=filters()+`<div class="notice">${txt('backfillHelp')}<br>${txt('usingCurrentForm')}</div><div class="backfill-controls"><label>${txt('inspectionDate')}<input id="backfillDate" class="select" type="date" max="${previousInspectionDay()}" value="${esc(backfillDate)}" required></label><label>${txt('shift')}<select id="backfillShift" class="select">${['day','night'].map(k=>`<option value="${k}" ${backfillShift===k?'selected':''}>${txt(k)}</option>`).join('')}</select></label><label>${txt('inspector')}<input id="backfillName" class="select" value="${esc(backfillName)}" required></label><label class="backfill-reason">${txt('backfillReason')}<textarea id="backfillNote" maxlength="1000">${esc(backfillNote)}</textarea></label></div>`+table(['equipmentCode','equipmentName','status','actions'],eligible.map(e=>{
    const rs=recordsForDay(e.id,backfillDate,backfillShift),done=rs.find(r=>!r.is_draft&&r.approval_status!=='rejected'),draft=rs.find(r=>r.is_draft),form=data.forms.find(f=>f.kind==='daily'&&formMatches(f,e));
    return `<tr><td>${esc(e.equipment_code)}</td><td>${esc(nameOf(e))}</td><td>${txt(done?'completed':draft?'draft':'pending')}</td><td>${done?button('details',`data-record="${done.id}"`):form?button('startBackfill',`data-backfill="${e.id}"`,'primary'):txt('assignFirst')}</td></tr>`;
  }).join(''));
  $('#backfillDate').onchange=e=>{backfillDate=e.target.value;renderContent();};$('#backfillShift').onchange=e=>{backfillShift=e.target.value;renderContent();};
  $('#backfillName').oninput=e=>{backfillName=e.target.value;localStorage.setItem('inspection_operator_name',e.target.value);};$('#backfillNote').oninput=e=>backfillNote=e.target.value;
  $$('[data-backfill]').forEach(b=>b.onclick=()=>{
    if(!validPastDay(backfillDate)){toast('pastDateRequired');return;}
    if(!backfillName.trim()){toast('nameRequired');return;}
    if(!backfillNote.trim()){toast('backfillReasonRequired');return;}
    openInspection(b.dataset.backfill,{day:backfillDate,shift:backfillShift,backfill:true,reason:backfillNote,name:backfillName});
  });bindRecords();
}
function openInspection(eid,options={}) {
  const name=options.name||localStorage.getItem('inspection_operator_name')||'';
  if(!name.trim()){toast('nameRequired');return;}
  const e=data.equipment.find(e=>e.id===eid),forms=data.forms.filter(f=>f.kind==='daily'&&formMatches(f,e));
  if(!e||!forms.length){toast('noForm');return;}
  const day=options.day||inspectionDay(),selectedShift=options.shift||shift,rs=recordsForDay(eid,day,selectedShift);
  if(rs.some(r=>!r.is_draft&&r.approval_status!=='rejected')){toast('duplicateInspection');return;}
  check={equipment:e,forms,form:forms[0],answers:forms[0].items.map(item=>({item,value:'',note:'',photo:''})),inspection_date:day,shift:selectedShift,is_backfill:!!options.backfill,backfill_reason:options.reason||'',inspector_name:name,submission_key:crypto.randomUUID()};
  const draft=rs.find(r=>r.is_draft&&r.form_id===check.form.id&&JSON.stringify(r.answers?.map(a=>a.item))===JSON.stringify(check.form.items));
  if(draft){check.answers=structuredClone(draft.answers);if(check.is_backfill&&!check.backfill_reason)check.backfill_reason=draft.backfill_reason||'';}
  renderCheck();
}
startCheck=eid=>openInspection(eid);
const originalPhotoRenderCheck=renderCheck;
renderCheck=function(){
  originalPhotoRenderCheck();const c=check,modal=$('#check');
  modal.querySelector('.dialog-body').insertAdjacentHTML('afterbegin',`<div class="notice"><strong>${txt(c.is_backfill?'backfill':'normalEntry')}</strong> · ${txt('inspectionDate')}: ${esc(c.inspection_date)} · ${txt(c.shift)}${c.is_backfill?`<br>${txt('backfillReason')}: ${esc(c.backfill_reason)}`:''}</div>`);
  modal.querySelectorAll('.dialog-body > .item').forEach((box,n)=>box.querySelector('.answers').insertAdjacentHTML('beforebegin',referencePhotoMarkup(c.answers[n]?.item,{form_id:c.form.id})));
  bindReferencePhotos(modal);
  if(c.pendingAttempt){
    modal.querySelector('.dialog-body').insertAdjacentHTML('afterbegin',`<div class="empty-note">${txt('submissionUncertain')}</div>`);
    modal.querySelectorAll('.dialog-body button,.dialog-body input,.dialog-body select,.dialog-body textarea').forEach(el=>el.disabled=true);
    modal.querySelector('.dialog-foot').innerHTML=button('retrySubmission','id="retryInspection"','primary');
    $('#retryInspection').onclick=()=>saveCheck(c.pendingAttempt.is_draft);
  }
};
saveCheck=async function(draft){
  const c=check;if(!c||c.saving)return;
  if(!draft&&c.answers.some(a=>!a.value||(a.value!=='normal'&&!a.note.trim()))){toast('incomplete');return;}
  if(c.is_backfill&&(!validPastDay(c.inspection_date)||!c.backfill_reason.trim())){toast('pastDateRequired');return;}
  c.saving=true;$('#check')?.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);
  try{
    c.pendingAttempt ||= structuredClone({action:'record_save',equipment_id:c.equipment.id,form_id:c.form.id,form_updated_at:c.form.updated_at,inspector_name:c.inspector_name,shift:c.shift,is_draft:draft,answers:c.answers,inspection_date:c.inspection_date,is_backfill:c.is_backfill,backfill_reason:c.backfill_reason,submission_key:c.submission_key});
    await api(c.pendingAttempt);
    check=null;$('#check')?.remove();await load();toast('saved');
  }catch(error){const messages={form_not_assigned:'formChanged',form_changed:'formChanged',duplicate_inspection:'duplicateInspection',invalid_inspection_date:'pastDateRequired',backfill_reason_required:'backfillReasonRequired'};toast(messages[error.message]||'error');if(messages[error.message])delete c.pendingAttempt;c.saving=false;if(check===c)renderCheck();}
};

function recordMeta(r){return `<p>${txt('inspectionDate')}: <strong>${esc(dayLabel(recordDay(r)))}</strong> · ${txt(r.shift==='night'?'night':'day')}<br>${txt('recordedAt')}: ${dateText(r.recorded_at||r.inspected_at)} · ${esc(r.inspector_name||'—')}<br>${txt('entryType')}: ${txt(r.is_backfill?'backfillTag':'normalEntry')}${r.is_backfill?`<br>${txt('backfillReason')}: ${esc(r.backfill_reason)}`:''}</p>`;}
recordDetail=function(id){const r=data.records.find(x=>x.id===id);if(!r)return;const modal=dialog('detail',t('history'),recordMeta(r)+table(['item','result','reason','photo'],(r.answers||[]).map(a=>`<tr><td>${esc(multilingual(a.item?.name))}${referencePhotoMarkup(a.item,{record_id:r.id})}</td><td>${a.value?txt(a.value==='maintenance'?'maintenanceResult':a.value):txt('pending')}</td><td>${esc(a.note)}</td><td>${/^data:image\/(png|jpeg|webp);base64,/.test(a.photo||'')?`<img class="record-photo" src="${esc(a.photo)}" alt="${txt('photo')}">`:'—'}</td></tr>`).join('')));bindReferencePhotos(modal);};
renderHistory=function(){
  const ids=new Set(filteredEquipment().map(e=>e.id));
  $('#content').innerHTML=filters()+`<div class="filter-row"><label>${txt('dateFrom')}<input class="select" id="historyFrom" type="date" value="${esc(historyFrom)}"></label><label>${txt('dateTo')}<input class="select" id="historyTo" type="date" value="${esc(historyTo)}"></label><label>${txt('entryType')}<select class="select" id="historyType">${['','normalEntry','backfillTag'].map(k=>`<option value="${k}" ${k===historyType?'selected':''}>${txt(k||'all')}</option>`).join('')}</select></label></div>`+table(['inspectionDate','recordedAt','equipmentCode','equipmentName','inspector','entryType','result','approval','actions'],data.records.filter(r=>ids.has(r.equipment_id)&&(!historyFrom||recordDay(r)>=historyFrom)&&(!historyTo||recordDay(r)<=historyTo)&&(!historyType||(historyType==='backfillTag'?r.is_backfill:!r.is_backfill))).sort((a,b)=>recordDay(b).localeCompare(recordDay(a))||String(b.recorded_at||b.inspected_at).localeCompare(String(a.recorded_at||a.inspected_at))).map(r=>{const e=data.equipment.find(e=>e.id===r.equipment_id);return `<tr><td>${esc(recordDay(r))}<br>${txt(r.shift==='night'?'night':'day')}</td><td>${dateText(r.recorded_at||r.inspected_at)}</td><td>${esc(e?.equipment_code)}</td><td>${esc(nameOf(e))}</td><td>${esc(r.inspector_name||'—')}</td><td>${txt(r.is_backfill?'backfillTag':'normalEntry')}</td><td>${txt(r.overall_status)}</td><td>${txt(r.approval_status==='pending'?'awaiting':r.approval_status)}</td><td>${button('details',`data-record="${r.id}"`)}</td></tr>`;}).join(''));
  $('#historyFrom').onchange=e=>{historyFrom=e.target.value;renderContent();};$('#historyTo').onchange=e=>{historyTo=e.target.value;renderContent();};$('#historyType').onchange=e=>{historyType=e.target.value;renderContent();};bindRecords();
};
const originalDatedApprovals=renderApprovals;
renderApprovals=function(){originalDatedApprovals();$$('[data-record]').forEach(b=>{const r=data.records.find(x=>x.id===b.dataset.record);if(r)b.closest('tr').cells[0].innerHTML=esc(recordDay(r))+`<br>${txt(r.is_backfill?'backfillTag':'normalEntry')}`;});};
Object.assign(translations,{
 monthlySymbols:{zh:'每月點檢狀態',en:'Monthly inspection status',es:'Estado mensual de inspección',vi:'Trạng thái kiểm tra hằng tháng'},
 monthlyPriority:{zh:'同月多筆紀錄以停用 ╳ 優先，其次維修 △，再正常 ○；無有效紀錄顯示 —。',en:'For multiple records in a month: Disabled ╳ takes priority, then Maintenance △, then Normal ○. No valid record: —.',es:'Si hay varios registros en un mes: Detener ╳ tiene prioridad, después Mantenimiento △ y Normal ○. Sin registro válido: —.',vi:'Nếu có nhiều bản ghi trong tháng: ưu tiên Ngừng dùng ╳, rồi Bảo trì △, rồi Bình thường ○. Không có bản ghi hợp lệ: —.'}
});
function visualMonthStatus(records){
 const valid=records.filter(r=>!r.is_draft&&r.approval_status!=='rejected');
 if(!valid.length)return {symbol:'—',label:'noRecord',style:''};
 const answers=valid.flatMap(r=>r.answers||[]);
 if(answers.some(a=>a.value==='disable')||valid.some(r=>r.overall_status==='disable'))return {symbol:'╳',label:'disable',style:'visual-disabled'};
 if(answers.some(a=>a.value==='maintenance')||valid.some(r=>['abnormal','maintenance'].includes(r.overall_status)))return {symbol:'△',label:'maintenanceResult',style:'visual-maintenance'};
 if(valid.some(r=>r.overall_status==='normal')||answers.length&&answers.every(a=>a.value==='normal'))return {symbol:'○',label:'normal',style:'normal'};
 return {symbol:'—',label:'noRecord',style:''};
}
Object.assign(translations,{
 visualDay:{zh:'日',en:'Day',es:'Día',vi:'Ngày'},
 visualMonth:{zh:'月份',en:'Month',es:'Mes',vi:'Tháng'},
 dailySymbols:{zh:'每日點檢狀態（依點檢日期）',en:'Daily inspection status (by inspection date)',es:'Estado diario (por fecha de inspección)',vi:'Trạng thái hằng ngày (theo ngày kiểm tra)'},
 dailyPriority:{zh:'橫軸為所選月份日期。同日多筆紀錄以停用 ╳ 優先，其次維修 △，再正常 ○。草稿及退回紀錄不計入；今天以前無有效結果預設顯示 X（停止使用），今天及未來日期顯示 —。預設 X 僅為顯示，補登後依實際結果更新。',en:'Columns show dates in the selected month. Priority: Disabled ╳, Maintenance △, Normal ○. Draft and rejected records are excluded. Without a valid result, past dates display X (stopped); today and future dates display —. Default X is display only and is replaced by actual inspection results.',es:'Las columnas muestran fechas del mes. Prioridad: Detener ╳, Mantenimiento △, Normal ○. Se excluyen borradores y rechazados. Sin resultado válido, fechas pasadas muestran X (detenido); hoy y fechas futuras muestran —. La X predeterminada es solo visual y se sustituye con resultados reales.',vi:'Các cột hiển thị ngày trong tháng. Ưu tiên: Ngừng dùng ╳, Bảo trì △, Bình thường ○. Không tính bản nháp và bị từ chối. Khi chưa có kết quả hợp lệ, ngày trước hôm nay hiển thị X (ngừng dùng); hôm nay và tương lai hiển thị —. X mặc định chỉ để hiển thị, được thay bằng kết quả thực tế.'},
 defaultPastStop:{zh:'X 停止使用（過去日期無有效結果，預設顯示）',en:'X Stopped (past date without a valid result; default display)',es:'X Detenido (fecha pasada sin resultado válido; visualización predeterminada)',vi:'X Ngừng dùng (ngày đã qua chưa có kết quả hợp lệ; hiển thị mặc định)'}
});
function visualToday(now=new Date()) {
 const zone=data?.calendar?.timezone||({TW:'Asia/Taipei',VM:'Asia/Ho_Chi_Minh',MX:'America/Mexico_City'}[activeCountry])||'Asia/Taipei';
 return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function visualDailyStatus(records,date,today,autoStop) {
 const result=visualMonthStatus(records);
 if(result.symbol!=='—')return result;
 if(date>=today)return result;
 if(!records.length&&autoStop)return {symbol:'X',label:'calendarAutoStop',style:'visual-disabled calendar-auto'};
 return {symbol:'X',label:'defaultPastStop',style:'visual-disabled visual-default-stop'};
}
let visualSelectedMonth=Number(inspectionDay().slice(5,7));
renderVisual=function(){
 // Cranes are managed in HR07-10 and QR18-05; retain their equipment and history elsewhere.
 const equipment=filteredEquipment().filter(e=>!/天車|起重機/.test(e.name_zh+' '+(e.equipment_groups?.name_zh||data.groups?.find(g=>g.id===e.equipment_group_id)?.name_zh||'')));
 const today=visualToday(),currentYear=Number(today.slice(0,4)),year=years[0]||currentYear,month=visualSelectedMonth;
 const available=[...new Set([currentYear,year,...Array.from({length:12},(_,i)=>currentYear-6+i),...data.records.map(r=>Number(recordDay(r).slice(0,4)))])].filter(Number.isFinite).sort((a,b)=>b-a);
 const days=Array.from({length:new Date(Date.UTC(year,month,0)).getUTCDate()},(_,i)=>i+1);
 const dateFor=day=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 const autoStops=new Map((data.autoStops||[]).filter(r=>!r.revoked_at).map(r=>[r.equipment_id+'|'+r.inspection_date,r]));
 const grouped=new Map();for(const r of data.records){const key=r.equipment_id+'|'+recordDay(r);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r);}
 $('#content').innerHTML=filters()+`<div class="filter-row"><label>${txt('year')}<select class="select" data-year="0">${available.map(v=>`<option ${v===year?'selected':''}>${v}</option>`).join('')}</select></label><label>${txt('visualMonth')}<select class="select" id="visualMonth">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===month?'selected':''}>${String(i+1).padStart(2,'0')}</option>`).join('')}</select></label></div><p>${txt('dailySymbols')}</p><div class="form-legend visual-legend"><strong>填表說明 Distinction Symbol (Símbolo de distinción):</strong><p>正常 Normal (Normal) : ○<br>維修 Maintenance (Mantenimiento) : △<br>停用 Disable (Detener) : ╳</p>${primary==='vi'||secondary==='vi'?'<p>Bình thường: ○<br>Bảo trì: △<br>Ngừng dùng: ╳</p>':''}</div><p class="muted">${txt('dailyPriority')}</p><p class="muted">${txt('calendarLegend')}</p><h2>${year}-${String(month).padStart(2,'0')}</h2><div class="table-wrap daily-visual-wrap"><table class="matrix daily-visual"><thead><tr><th>${txt('equipmentCode')}</th>${days.map(day=>`<th scope="col" title="${dateFor(day)}">${day}<small class="visual-day-unit">${txt('visualDay')}</small></th>`).join('')}</tr></thead><tbody>${equipment.map(e=>`<tr><th scope="row">${esc(e.equipment_code)}</th>${days.map(day=>{const date=dateFor(day),dayRecords=grouped.get(e.id+'|'+date)||[],autoStop=autoStops.get(e.id+'|'+date),result=visualDailyStatus(dayRecords,date,today,autoStop);return `<td data-inspection-day="${date}"><span class="tag visual-symbol ${result.style}" title="${date} · ${esc(t(result.label))}${result.label==='calendarAutoStop'?' · '+esc(autoStop.holiday_label||t('calendarWeekend')):''}" aria-label="${date} · ${esc(t(result.label))}${result.label==='calendarAutoStop'?' · '+esc(autoStop.holiday_label||t('calendarWeekend')):''}">${result.symbol}</span></td>`;}).join('')}</tr>`).join('')||`<tr><td colspan="${days.length+1}">${txt('noData')}</td></tr>`}</tbody></table></div>`;
 $('[data-year]').onchange=e=>{years=[Number(e.target.value)];renderContent();};
 $('#visualMonth').onchange=e=>{visualSelectedMonth=Number(e.target.value);renderContent();};
};
const originalExtrasLogout=logout;
logout=function(){photoCache.clear();photoCacheToken='';check=null;editing=null;$$('.modal').forEach(m=>m.remove());originalExtrasLogout();};
render();

translations.alreadyInspected={zh:'已點檢',en:'Inspected',es:'Inspeccionado',vi:'Đã kiểm tra'};
