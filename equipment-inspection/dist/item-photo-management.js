/* Photo-only management for imported checklist items; saves through existing form permissions. */
(function(){
  const words=`itemPhotos|項目照片|Item photos|Fotos de los ítems|Ảnh của các mục
photoCoverage|已附照片／項目總數|With photos / total items|Con fotos / total de ítems|Có ảnh / tổng số mục
photoManagerHelp|依匯入表單的每個點檢項目配上參考照片，儲存後人員開啟點檢就能看到。|Add a reference photo to each imported checklist item. Staff see it when opening the inspection after you save.|Añada una foto de referencia a cada ítem importado. El personal la verá al abrir la inspección después de guardar.|Thêm ảnh tham khảo cho từng mục đã nhập. Sau khi lưu, nhân viên sẽ thấy ảnh khi mở kiểm tra.
saveItemPhotos|儲存項目照片|Save item photos|Guardar fotos de los ítems|Lưu ảnh của các mục
photoUnsaved|照片尚未儲存到表單|Photos have not been saved to the form|Las fotos aún no se han guardado en el formulario|Ảnh chưa được lưu vào biểu mẫu
photoSaving|正在儲存照片設定|Saving photo settings|Guardando fotos|Đang lưu cài đặt ảnh
itemPhotoHint|按「項目照片」替已匯入的點檢項目上傳照片；人員點檢時會直接顯示。|Use Item photos to add photos to imported items; they appear directly during inspection.|Use Fotos de los ítems para añadir fotos a los ítems importados; se muestran durante la inspección.|Dùng Ảnh của các mục để thêm ảnh cho mục đã nhập; ảnh hiển thị trực tiếp khi kiểm tra.
photoRequiredFirst|請先上傳此項目的參考照片|Upload a reference photo for this item|Suba una foto de referencia para este ítem|Tải ảnh tham khảo cho mục này`;
  words.split('\n').forEach(line=>{const [k,...v]=line.split('|');translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,n)=>[l,v[n]]));});
  let session=null;
  const editable=f=>canManage()&&accessFormEditable(f);
  const count=f=>f.items.filter(i=>i.reference_photo_id).length;
  const originalForms=renderForms;
  renderForms=function(){
    originalForms();
    if(!['items','daily','maintenance'].includes(view))return;
    const content=$('#content'),matrix=content.querySelector('.matrix');if(!matrix)return;
    const header=matrix.tHead?.rows[0];if(header){const th=document.createElement('th');th.textContent=t('itemPhotos');header.insertBefore(th,header.lastElementChild);}
    matrix.querySelectorAll('tbody tr').forEach(row=>{
      const detail=row.querySelector('[data-form]');
      if(!detail){if(row.cells[0])row.cells[0].colSpan=header?.cells.length||10;return;}
      const f=data.forms.find(x=>x.id===detail.dataset.form);if(!f)return;
      const td=document.createElement('td');td.className='item-photo-summary';
      td.innerHTML=`<span class="photo-coverage ${count(f)===f.items.length?'photo-complete':''}" title="${txt('photoCoverage')}">${count(f)} / ${f.items.length}</span>${editable(f)?button('itemPhotos',`data-item-photos="${esc(f.id)}"`,'primary'):''}`;
      row.insertBefore(td,row.lastElementChild);
      td.querySelector('button')?.addEventListener('click',()=>open(f));
    });
    if(view==='items'&&canManage()){const note=document.createElement('p');note.className='notice';note.textContent=t('itemPhotoHint');content.insertBefore(note,matrix.closest('.table-wrap'));}
  };
  function open(form){if(!editable(form))return;session={form:structuredClone(form),token:localStorage.getItem('inspection_token'),pending:new Set(),dirty:false,saving:false};renderPhotoManager();}
  function renderPhotoManager(){
    const current=session;if(!current)return;const f=current.form;
    const old=$('#itemPhotoManager .dialog-body'),scroll=old?.scrollTop||0;
    const body=`<div class="notice">${txt('photoManagerHelp')}</div><div class="photo-manager-meta"><strong>${esc(f.form_name||f.equipment_name)}</strong><p>${txt('source')}: ${esc(f.source_filename||'—')} / ${esc(f.source_sheet||'—')}<br>${txt('department')}: ${esc(localName(f.department||''))} · ${txt('equipmentName')}: ${esc(localName(f.equipment_name))}</p><span class="photo-coverage">${txt('photoCoverage')}: ${count(f)} / ${f.items.length}</span></div><p class="photo-manager-status" role="status">${current.saving?txt('photoSaving'):current.pending.size?txt('photoUploading'):current.dirty?txt('photoUnsaved'):''}</p><div class="photo-item-list">${f.items.map((item,n)=>`<article class="photo-item-card"><div class="photo-item-copy"><h3>${n+1}. ${esc(multilingual(item.name))}</h3><dl>${[['standard','standard'],['method','method'],['cycle','cycle']].map(([key,label])=>`<div><dt>${txt(label)}</dt><dd>${esc(multilingual(item[key]))}</dd></div>`).join('')}</dl></div><section class="photo-item-upload">${referencePhotoMarkup(item,{form_id:f.id})||`<div class="photo-item-empty">${txt('noReference')}<br><span>${txt('photoRequiredFirst')}</span></div>`}<label class="btn secondary">${txt('uploadReference')}<input type="file" accept="image/jpeg,image/png,image/webp" data-manage-photo="${n}" ${current.pending.has(n)||current.saving?'disabled':''}></label>${item.reference_photo_id?button('removeReference',`data-manage-remove="${n}" ${current.pending.has(n)||current.saving?'disabled':''}`,'danger'):''}${current.pending.has(n)?`<p role="status">${txt('photoUploading')}</p>`:''}</section></article>`).join('')}</div>`;
    const modal=dialog('itemPhotoManager',t('itemPhotos')+' · '+localName(f.equipment_name),body,button('close','id="closePhotoManager"')+button('saveItemPhotos',`id="savePhotoManager" ${!current.dirty||current.pending.size||current.saving?'disabled':''}`,'primary'));
    modal.classList.add('item-photo-manager');modal.querySelector('.dialog-body').scrollTop=scroll;
    const close=()=>{if(current.saving)return;session=null;modal.remove();};$('#closePhotoManager').onclick=close;modal.querySelector('.x').onclick=close;
    if(current.saving){$('#closePhotoManager').disabled=true;modal.querySelector('.x').disabled=true;}
    modal.querySelectorAll('[data-manage-photo]').forEach(input=>input.onchange=async()=>{
      const file=input.files[0],n=+input.dataset.managePhoto;if(!file||current.pending.has(n)||current.saving)return;
      current.pending.add(n);renderPhotoManager();
      try{
        const photo=await resizeReferencePhoto(file);const r=await api({action:'reference_photo_upload',photo,filename:file.name});
        if(session!==current||current.token!==localStorage.getItem('inspection_token')||!$('#itemPhotoManager'))return;
        photoCacheToken=current.token;photoCache.set(r.photo.id,{url:r.photo.url,expires:Date.now()+(r.photo.expires_in-30)*1000});
        f.items[n].reference_photo_id=r.photo.id;current.dirty=true;
      }catch(error){if(session===current)toast(translations[error.message]?error.message:'error');}
      finally{current.pending.delete(n);if(session===current&&$('#itemPhotoManager'))renderPhotoManager();}
    });
    modal.querySelectorAll('[data-manage-remove]').forEach(button=>button.onclick=()=>{f.items[+button.dataset.manageRemove].reference_photo_id=null;current.dirty=true;renderPhotoManager();});
    $('#savePhotoManager').onclick=async()=>{
      if(current.pending.size||current.saving||!current.dirty||session!==current||current.token!==localStorage.getItem('inspection_token')||!editable(f))return;
      current.saving=true;renderPhotoManager();
      try{await api({action:'form_save',form:f});session=null;$('#itemPhotoManager')?.remove();await load();toast('saved');}
      catch(error){current.saving=false;renderPhotoManager();toast(error.message==='form_changed'?'formChanged':'error');}
    };
    bindReferencePhotos(modal);
  }
  const originalLanguage=changeLanguage;
  changeLanguage=function(){originalLanguage();if(session&&$('#itemPhotoManager'))renderPhotoManager();};
  const previousLogout=logout;
  logout=function(){session=null;previousLogout();};
  if(['items','daily','maintenance'].includes(view)&&profile)renderContent();
})();
