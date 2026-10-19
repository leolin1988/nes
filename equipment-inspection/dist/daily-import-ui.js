/* This module does not import records on load or file selection. */
const dailyImportWords = `originalPreview|讀取原表並預覽|Read original file and preview|Leer archivo original y previsualizar|Đọc biểu mẫu gốc và xem trước
originalHelp|可直接上傳原始 Excel 或系統匯出的 CSV；自動讀取所有工作表。先預覽，確認後才匯入。|Upload original Excel files or exported CSVs. All worksheets are read; nothing is saved until you confirm.|Suba archivos Excel originales o CSV exportados. Se leen todas las hojas; solo se guarda al confirmar.|Tải lên Excel gốc hoặc CSV đã xuất. Đọc tất cả các trang tính; chỉ lưu khi xác nhận.
previewOnly|尚未匯入；請核對來源、部門、四欄內容及四種語言。|Not imported yet. Check source, department, all four fields and languages.|Aún no importado. Revise origen, departamento, los cuatro campos e idiomas.|Chưa nhập. Kiểm tra nguồn, bộ phận, bốn trường và bốn ngôn ngữ.
glossaryHelp|依原表與既有詞庫補齊四語；未收錄的新內容會標示待補翻譯，不會猜填。|Four languages are filled from the source and glossary. New terms are flagged for translation.|Los cuatro idiomas se completan con el original y el glosario. Los términos nuevos quedan pendientes.|Bổ sung bốn ngôn ngữ từ bản gốc và từ điển. Nội dung mới được đánh dấu cần dịch.
confirmImport|確認匯入|Confirm import|Confirmar importación|Xác nhận nhập
importNew|新增|New|Nuevo|Thêm mới
importUpdate|更新既有表單|Update existing form|Actualizar formulario|Cập nhật biểu mẫu
importSkip|內容相同，略過|Unchanged; skip|Sin cambios; omitir|Không đổi; bỏ qua
importBlocked|待補正|Needs correction|Requiere corrección|Cần sửa
importReady|可匯入|Ready to import|Listo para importar|Sẵn sàng nhập
importSourceRow|原始列|Source row|Fila original|Dòng gốc
importSummary|辨識結果|Recognition results|Resultados de lectura|Kết quả nhận dạng
sheetEmpty|空白工作表，略過|Empty worksheet; skipped|Hoja vacía; omitida|Trang trống; bỏ qua
unrecognized|無法辨識點檢欄位，請檢查表頭|Checklist columns not recognized; check headers|Columnas no reconocidas; revise encabezados|Không nhận dạng được cột; kiểm tra tiêu đề
dailyDefault|原表未列週期，依日常點檢表補入「每日」|Cycle absent; Daily added for a daily checklist|Sin ciclo; se añade Diario para la lista diaria|Thiếu chu kỳ; thêm Hằng ngày cho bảng kiểm tra hằng ngày
selectedDepartment|採用本次選擇的部門|Using the selected department|Se usa el departamento seleccionado|Dùng bộ phận đã chọn
departmentMissing|請選擇設備清單中的部門|Select a department from the equipment directory|Seleccione un departamento del directorio|Chọn bộ phận trong danh mục thiết bị
departmentConflict|原表部門與設備清單不一致，請先核對|Source department differs from equipment directory; review first|El departamento no coincide con el directorio; revise|Bộ phận gốc khác danh mục thiết bị; cần kiểm tra
ambiguousEquipment|設備編號對應多台設備，請先核對|Equipment number matches multiple records; review first|El número coincide con varios equipos; revise|Mã thiết bị khớp nhiều bản ghi; cần kiểm tra
equipmentMissing|缺少設備名稱|Equipment name missing|Falta nombre del equipo|Thiếu tên thiết bị
kindMismatch|表單類型與目前頁面不一致|Form type differs from this page|El tipo de formulario no corresponde|Loại biểu mẫu không khớp trang hiện tại
itemLimit|每份表單需有 1 至 200 個項目|Each form needs 1–200 items|Cada formulario requiere 1–200 ítems|Mỗi biểu mẫu cần 1–200 mục
missing|缺少內容或翻譯|Missing content or translation|Falta contenido o traducción|Thiếu nội dung hoặc bản dịch
tooLong|內容超過系統長度限制|Content exceeds the length limit|El contenido supera el límite|Nội dung vượt giới hạn độ dài
inconsistent|同一表單的基本資料不一致|Inconsistent metadata within a form|Datos del formulario inconsistentes|Thông tin trong cùng biểu mẫu không nhất quán
importCollision|同名或同來源對應不明，請先核對，避免覆蓋錯誤設備|Ambiguous name or source; review to avoid overwriting another device|Nombre u origen ambiguo; revise para evitar sobrescribir otro equipo|Tên hoặc nguồn không rõ; kiểm tra để tránh ghi đè thiết bị khác
importLimits|單批最多 500 份表單；每個檔案最多 20 MB|Up to 500 forms per batch; 20 MB per file|Hasta 500 formularios por lote; 20 MB por archivo|Tối đa 500 biểu mẫu mỗi đợt; 20 MB mỗi tệp
importFailed|匯入中止；已完成的表單已保留。請重新讀取預覽，勿直接重送。|Import stopped; completed forms were retained. Reload the preview before retrying.|Importación detenida; se conservan los formularios completados. Vuelva a cargar la vista previa.|Đã dừng nhập; giữ các biểu mẫu đã hoàn tất. Đọc lại bản xem trước trước khi thử lại.
importDone|已完成匯入|Import complete|Importación completada|Đã nhập xong
importingNow|正在匯入，請勿關閉視窗|Importing; keep this window open|Importando; no cierre esta ventana|Đang nhập; không đóng cửa sổ
importCounts|檔案／有內容表單／項目／空白工作表|Files / forms / items / empty sheets|Archivos / formularios / ítems / hojas vacías|Tệp / biểu mẫu / mục / trang trống
importReviewAll|請補正所有待確認內容，再重新讀取預覽。|Correct all flagged content, then reload the preview.|Corrija todo el contenido señalado y vuelva a cargar.|Sửa tất cả nội dung được đánh dấu rồi đọc lại.
originalFileError|檔案讀取失敗，請確認為可開啟的 Excel 或 CSV|Cannot read file; use a valid Excel or CSV file|No se puede leer; use un Excel o CSV válido|Không đọc được tệp; dùng Excel hoặc CSV hợp lệ`;
dailyImportWords.split('\n').forEach(line=>{const [k,...v]=line.split('|');translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,n)=>[l,v[n]]));});
let importPreviewBusy = false;
const originalRenderForms = renderForms;
renderForms = function () {
  originalRenderForms();
  if (kind !== 'daily' || !$('#formFile')) return;
  $('#formFile').multiple = true;
  $('#import').innerHTML = txt('originalPreview');
  $('#import').onclick = previewDailyForms;
  const help = $('#formFile').closest('.approval').nextElementSibling;
  if (help) help.textContent = t('originalHelp');
};
async function previewDailyForms() {
  if (importPreviewBusy) return;
  const files = [...($('#formFile')?.files || [])];
  if (!files.length) {toast('selectFile');return;}
  const trigger = $('#import');trigger.disabled = true;importPreviewBusy = true;
  try {
    if (files.some(f=>f.size>20*1024*1024)) throw Error('importLimits');
    const dailyImportGlossary=DailyChecklistImport.glossaryFromForms(data.forms);
    const session = {forms:[], sheets:[], files:files.length, phase:'preview', kind:'daily', authToken:localStorage.getItem('inspection_token')};
    const options = {kind:'daily',glossary:dailyImportGlossary,department:data.departments.find(d=>d.id===department)?.name_zh || '',equipment:data.equipment,departments:data.departments,groups:data.groups};
    for (const file of files) {
      let book;
      try {book = XLSX.read(await file.arrayBuffer(),{type:'array'});} catch {throw Error('originalFileError');}
      for (const name of book.SheetNames) {
        const sheet = book.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:true,range:0});
        const result = DailyChecklistImport.parseSheet(rows,file.name,name,{...options,merges:sheet['!merges'] || []});
        if (result.error || result.skipped) session.sheets.push({file:file.name,sheet:name,code:result.error || 'sheetEmpty'});
        for (const f of result.forms) {
          f._initialIssues=structuredClone(f._issues);f._sourceDepartment=f.department;
          DailyChecklistImport.complete(f,options);session.forms.push(f);
        }
      }
    }
    if (session.forms.length>500) throw Error('importLimits');
    renderDailyImportPreview(session,options);
  } catch(e) {toast(translations[e.message]?e.message:'originalFileError');}
  finally {trigger.disabled=false;importPreviewBusy=false;}
}
function dailyImportStatus(f, preceding) {
  const equal = (a,b)=>DailyChecklistImport.content(a)===DailyChecklistImport.content(b);
  if(f._issues.length) return 'importBlocked';
  if(data.forms.some(x=>equal(x,f)) || preceding.some(x=>equal(x,f))) return 'importSkip';
  const sameName=data.forms.filter(x=>x.kind===f.kind && x.department===f.department && x.form_name===f.form_name);
  const sourceMatches=data.forms.filter(x=>x.kind===f.kind && x.department===f.department && x.source_filename===f.source_filename && x.source_sheet===f.source_sheet && x.equipment_name===f.equipment_name && x.machine_no===f.machine_no && x.property_no===f.property_no);
  const matches=sameName.length?sameName:sourceMatches;
  if(matches.length>1 || matches.some(x=>x.equipment_name!==f.equipment_name || x.machine_no!==f.machine_no || x.property_no!==f.property_no) || preceding.some(x=>x.department===f.department && x.form_name===f.form_name && !equal(x,f))) {
    f._collision=true;return 'importBlocked';
  }
  if(matches.length===1) {
    f._targetName=matches[0].form_name;
    if(data.forms.filter(x=>x.department===f.department && x.kind===f.kind && x.form_name===f._targetName).length>1 || preceding.some(x=>(x._targetName||x.form_name)===f._targetName && x.department===f.department && !equal(x,f))) {f._collision=true;return 'importBlocked';}
    return 'importUpdate';
  }
  return 'importNew';
}
function renderDailyImportPreview(session, options) {
  const labels={name:'item',standard:'standard',method:'method',cycle:'cycle'};
  session.forms.forEach((f,n)=>{delete f._collision;delete f._targetName;f._status=dailyImportStatus(f,session.forms.slice(0,n));});
  const blocked=session.forms.some(f=>f._status==='importBlocked') || session.sheets.some(s=>s.code!=='sheetEmpty');
  const ready=session.forms.filter(f=>['importNew','importUpdate'].includes(f._status));
  const counts=['importNew','importUpdate','importSkip','importBlocked'].map(k=>`${t(k)}: ${session.forms.filter(f=>f._status===k).length}`).join(' · ');
  const body=`<div class="notice">${txt('previewOnly')}<br>${txt('glossaryHelp')}</div><p>${txt('importCounts')}: <strong>${session.files} / ${session.forms.length} / ${session.forms.reduce((n,f)=>n+f.items.length,0)} / ${session.sheets.filter(s=>s.code==='sheetEmpty').length}</strong></p><p>${esc(counts)}</p>${blocked?`<p class="empty-note">${txt('importReviewAll')}</p>`:''}<div id="dailyImportResult" role="status"></div>${session.forms.map((f,n)=>`<details class="import-form" ${n===0?'open':''}><summary><strong>${esc(f.equipment_name || f.source_sheet)}</strong> · ${f.items.length} · <span class="${f._status==='importBlocked'?'import-problem':''}">${txt(f._status)}</span></summary><p>${txt('source')}: ${esc(f.source_filename)} / ${esc(f.source_sheet)}<br>${txt('machineNo')}: ${esc(f.machine_no||'—')} · ${txt('propertyNo')}: ${esc(f.property_no||'—')}</p><label>${txt('department')}<select class="select" data-import-dept="${n}"><option value="">${txt('departmentMissing')}</option>${data.departments.filter(d=>accessDepartment(d.id,'daily_settings')).map(d=>`<option value="${esc(d.name_zh)}" ${d.name_zh===f.department?'selected':''}>${esc(nameOf(d))}</option>`).join('')}</select></label>${f._notes.map(k=>`<p class="muted">${txt(k)}</p>`).join('')}${f._collision?`<p class="import-problem">${txt('importCollision')}</p>`:''}${f._issues.length?`<ul class="import-problem">${f._issues.map(x=>`<li>${x.row?`${txt('importSourceRow')} ${x.row} · `:''}${x.field?txt(labels[x.field])+' · ':''}${esc(localeNames[x.extra]||x.extra||'')} ${txt(x.code)}</li>`).join('')}</ul>`:''}<div class="table-wrap"><table class="import-preview-table"><thead><tr><th>${txt('importSourceRow')}</th>${DailyChecklistImport.fields.map(k=>`<th>${txt(labels[k])}</th>`).join('')}</tr></thead><tbody>${f.items.map(i=>`<tr><td>${i._row}</td>${DailyChecklistImport.fields.map(k=>`<td>${DailyChecklistImport.languages.map(l=>`<div lang="${l}"><span class="muted">${esc(localeNames[l])}</span><br>${esc(i[k][l]||t('missingTranslation'))}</div>`).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`).join('')}${session.sheets.length?`<details class="import-form"><summary>${txt('importSummary')} (${session.sheets.length})</summary><ul>${session.sheets.map(s=>`<li>${esc(s.file)} / ${esc(s.sheet)} — ${txt(s.code)}</li>`).join('')}</ul></details>`:''}`;
  const modal=dialog('dailyImportPreview',t('originalPreview'),body,button('close','id="cancelDailyImport"')+button('confirmImport',`id="confirmDailyImport" ${blocked||!ready.length?'disabled':''}`,'primary'));
  modal.classList.add('daily-import-modal');
  $('#cancelDailyImport').onclick=()=>modal.remove();
  modal.querySelectorAll('[data-import-dept]').forEach(select=>select.onchange=()=>{
    const f=session.forms[+select.dataset.importDept];f.department=select.value;f._issues=structuredClone(f._initialIssues);f._notes=f._notes.filter(x=>x!=='selectedDepartment');
    // A manual department choice is explicit; retain the original source in provenance.
    const others={...options,department:select.value};DailyChecklistImport.complete(f,others);renderDailyImportPreview(session,options);
  });
  $('#confirmDailyImport').onclick=async()=>{
    if(session.phase!=='preview' || blocked || !ready.length || !canManage() || localStorage.getItem('inspection_token')!==session.authToken)return;
    session.phase='saving';modal.querySelectorAll('button,select').forEach(b=>b.disabled=true);
    $('#dailyImportResult').textContent=t('importingNow');let completed=0;
    try {
      for(const f of ready){const p=DailyChecklistImport.payload(f);p.form_name=f._targetName||f.form_name;await api({action:'forms_import',forms:[p],filename:f.source_filename});completed++;$('#dailyImportResult').textContent=t('importingNow')+` (${completed}/${ready.length})`;}
      session.phase='done';$('#dailyImportResult').textContent=t('importDone')+` (${completed})`;await load();
    }catch{session.phase='failed';$('#dailyImportResult').textContent=t('importFailed')+` (${completed}/${ready.length})`;}
    finally{modal.querySelector('.x').disabled=false;$('#cancelDailyImport').disabled=false;}
  };
}
if (['daily','maintenance','items'].includes(view)) renderContent();
