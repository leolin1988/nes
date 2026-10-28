function pmDefaultSchedule(item){
 if(item.schedule?.length)return item.schedule;
 const text=Object.values(item.cycle||{}).join(' ');
 if(/半年|half.?year|semi.?annual|six.?month|6.?month|六個?月/i.test(text))return [];
 const code=/每季|季度|季保養|quarter|trimestr|hằng quý|hàng quý/i.test(text)||text.trim()==='季'?'Q':/每月|月保養|monthly|mensual|hằng tháng|hàng tháng/i.test(text)||text.trim()==='月'?'M':'';
 return (code==='Q'?[3,6,9,12]:code==='M'?Array.from({length:12},(_,i)=>i+1):[]).map(month=>({month,cycle_code:code}));
}
let pmDetailEquipment="";
function pmHasText(value){return Object.values(value||{}).some(v=>String(v||'').trim()&&!/^[—–\-\s]+$/.test(String(v)));}
/* QR18-04 annual matrix; persisted maintenance records remain the source of truth. */
`pmBackCards|返回設備卡片|Back to equipment cards|Volver a equipos|Quay lại danh sách thiết bị
pmSelectCard|點選設備卡片開啟完整保養表。|Select equipment to open its maintenance sheet.|Seleccione un equipo para abrir su formulario.|Chọn thiết bị để mở biểu mẫu bảo dưỡng.
pmBoardHelp|點選週期符號安排保養，或點選月份格新增該月保養；完成並確認後，空心符號會變成實心。|Select a cycle symbol or month cell to schedule maintenance. Confirmed completion fills the symbol.|Seleccione un símbolo o mes para programar el mantenimiento. Al confirmar la finalización, el símbolo se rellena.|Chọn ký hiệu chu kỳ hoặc ô tháng để lên lịch bảo dưỡng. Xác nhận hoàn thành sẽ tô kín ký hiệu.
pmPlanned|已排定／未完成|Scheduled / pending|Programado / pendiente|Đã lên lịch / chưa hoàn thành
pmDone|已確認完成|Confirmed complete|Finalización confirmada|Đã xác nhận hoàn thành
pmAdd|安排保養|Schedule maintenance|Programar mantenimiento|Lên lịch bảo dưỡng
pmChoose|選擇週期與月份|Choose cycle and month|Elegir ciclo y mes|Chọn chu kỳ và tháng
pmContinue|進入設備保養|Open equipment maintenance|Abrir mantenimiento|Mở bảo dưỡng thiết bị
pmNoPlan|尚未排定|Not scheduled|Sin programar|Chưa lên lịch
pmRecords|查看保養紀錄清單|View maintenance records|Ver registros de mantenimiento|Xem hồ sơ bảo dưỡng
pmAnnual|年度保養圖表|Annual maintenance chart|Gráfico anual de mantenimiento|Bảng bảo dưỡng hằng năm
pmCycleHint|優先依原表月份安排；未標月份時，月保養預設每月，季保養預設 3／6／9／12 月。可用＋追加保養。|Use source months first; otherwise monthly means every month and quarterly means March, June, September and December.|Se respetan los meses del original; sin meses indicados, mensual es cada mes y trimestral es marzo, junio, septiembre y diciembre.|Ưu tiên tháng trong biểu mẫu; nếu chưa có, hằng tháng là mỗi tháng và hằng quý là tháng 3, 6, 9, 12.
pmSavedElsewhere|此設備另有舊版或未指定月份的保養紀錄，請查看紀錄清單。|This equipment has earlier-form or undated records; see the records list.|Este equipo tiene registros anteriores o sin mes; consulte la lista.|Thiết bị có hồ sơ biểu mẫu cũ hoặc chưa có tháng; xem danh sách.
pmSourcePlan|原表預定保養|Source maintenance schedule|Plan del formulario original|Lịch bảo dưỡng từ biểu mẫu gốc
pmMonth|月份|Month|Mes|Tháng`.split('\n').forEach(line=>{const[k,...v]=line.split('|');translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,n)=>[l,v[n]]));});
function renderPMVisual(ctx,detail=!!$('#pmEquipmentDialog')){
 if(!detail)pmDetailEquipment='';
 const equipment=filteredEquipment();if(!equipment.some(e=>e.id===ctx.selected)){ctx.selected='';ctx.setEquipment('');}
 const filtered=equipment.filter(e=>!ctx.selected||e.id===ctx.selected);
 if(!filtered.some(e=>e.id===pmDetailEquipment))pmDetailEquipment='';
 const visible=pmDetailEquipment?filtered.filter(e=>e.id===pmDetailEquipment):filtered,forms=new Map(data.forms.map(f=>[f.id,f])),cards=[];
 const rows=(data.maintenanceRecords||[]).filter(r=>r.year===ctx.year),monthNames=Array.from({length:12},(_,i)=>i+1);
 const buttons=(e,f,i,month)=>{
  const entries=rows.filter(r=>r.equipment_id===e.id&&r.form_id===f.id).flatMap(r=>r.rows.map((row,n)=>({r,row,n}))).filter(x=>x.row.item_index===i&&JSON.stringify(x.row.item.name)===JSON.stringify(f.items[i].name)&&x.row.planned_start?.slice(0,7)===`${ctx.year}-${String(month).padStart(2,'0')}`);
  const used={};entries.forEach(({row})=>used[row.cycle_code]=(used[row.cycle_code]||0)+1);
  const presets=pmDefaultSchedule(f.items[i]).filter(x=>x.month===month).filter(x=>{if(used[x.cycle_code]>0){used[x.cycle_code]--;return false;}return true;});
  return presets.map(x=>`<button class="pm-mark pm-pending" data-pm-preset="${e.id}" data-form="${f.id}" data-item="${i}" data-month="${month}" data-code="${x.cycle_code}" title="${t(f.items[i].schedule?.length?'pmSourcePlan':'pmPlanned')} · ${ctx.year}-${String(month).padStart(2,'0')}">${ctx.symbols[x.cycle_code][0]}<small>${x.cycle_code}</small></button>`).join('')+entries.map(({r,row,n})=>{const done=r.status==='confirmed'&&!!row.completed_date,code=row.cycle_code;return `<button class="pm-mark ${done?'pm-complete':'pm-pending'}" data-pm-record="${r.id}" title="${esc(row.planned_start+' ~ '+row.planned_end+' · '+t(done?'pmDone':'pmPlanned')+(done?' · '+row.completed_date+' · '+r.performer_name:''))}" aria-label="${esc(e.equipment_code+' '+multilingual(row.item.name)+' '+month+' '+t('pmMonth')+' '+code+' '+t(done?'pmDone':'pmPlanned'))}">${ctx.symbols[code]?.[done?1:0]||code}<small>${code}</small></button>`;}).join('')+`<button class="pm-add" data-pm-add="${e.id}" data-form="${f.id}" data-item="${i}" data-month="${month}" title="${t('pmAdd')}" aria-label="${esc(e.equipment_code+' '+multilingual(f.items[i].name)+' '+month+' '+t('pmMonth')+' '+t('pmAdd'))}">+</button>`;
 };
 for(const e of visible){
  const assignment=(data.assignments||[]).find(a=>a.equipment_id===e.id&&a.kind==='maintenance'),f=forms.get(assignment?.form_id),dept=data.departments.find(d=>d.id===e.department_id);
  if(!pmDetailEquipment){
   const cycles=[...new Set((f?.items||[]).flatMap(item=>pmDefaultSchedule(item).map(x=>x.cycle_code)))];
   cards.push(`<button type="button" class="pm-equipment-card" data-pm-open="${e.id}"><div class="eq-head"><strong>${esc(e.equipment_code)}</strong><span>${window.maintenanceFormCode(f)} · ${ctx.year}</span></div><h3>${esc(nameOf(e))}</h3><p>${esc(nameOf(dept))} · ${esc(nameOf(e.equipment_groups)||'—')}</p><p>${txt('machineNo')}：${esc(e.machine_no||'—')}<br>${txt('propertyNo')}：${esc(e.property_no||'—')}</p><div class="pm-card-footer">${f?`${cycles.map(c=>esc(c+' '+ctx.symbols[c][0])).join('　')}<span>${txt('pmContinue')} →</span>`:txt('assignFirst')}</div></button>`);continue;
  }
  const heading=`<div class="pm-sheet-heading"><div><strong>${esc(e.equipment_code)} · ${esc(nameOf(e))}</strong><p>${txt('department')}: ${esc(nameOf(dept))} · ${txt('group')}: ${esc(nameOf(e.equipment_groups)||'—')}</p></div><div><strong>${ctx.year} · ${window.maintenanceFormCode(f)}</strong><p>${txt('propertyNo')}: ${esc(e.property_no||'—')} · ${txt('machineNo')}: ${esc(e.machine_no||'—')}</p></div></div>`;
  if(!f){cards.push(`<section class="pm-sheet">${heading}<p class="pm-no-form">${txt('assignFirst')}</p></section>`);continue;}
  const orphan=rows.some(r=>r.equipment_id===e.id&&(r.form_id!==f.id||r.rows.some(row=>!row.planned_start||!f.items[row.item_index]||JSON.stringify(row.item.name)!==JSON.stringify(f.items[row.item_index].name))));
  cards.push(`<section class="pm-sheet" data-pm-equipment="${e.id}">${heading}${orphan?`<p class="notice">${txt('pmSavedElsewhere')}</p>`:''}<div class="pm-table-wrap"><table class="pm-table"><thead><tr><th>${txt('item')}</th><th>${txt('cycle')}</th>${monthNames.map(m=>`<th scope="col">${m}<small>${txt('pmMonth')}</small></th>`).join('')}</tr></thead><tbody>${f.items.map((item,i)=>{const code=ctx.cycleCode(Object.values(item.cycle||{}).join(' '));return `<tr><th scope="row"><strong>${i+1}. ${esc(multilingual(item.name))}</strong>${pmHasText(item.standard)?`<p>${txt('standard')}: ${esc(multilingual(item.standard))}</p>`:''}${pmHasText(item.method)?`<p>${txt('method')}: ${esc(multilingual(item.method))}</p>`:''}${referencePhotoMarkup(item,{form_id:f.id})}</th><td><button class="pm-cycle" data-pm-add="${e.id}" data-form="${f.id}" data-item="${i}" data-code="${code}">${code} ${ctx.symbols[code][0]}</button><small>${esc(multilingual(item.cycle))}</small></td>${monthNames.map(m=>`<td data-pm-month="${m}">${buttons(e,f,i,m)}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div></section>`);
 }
 if(!detail){
 $('#content').innerHTML=filters()+`<div class="filter-row"><label>${txt('equipmentName')}<select id="pmEquipment" class="select"><option value="">${txt('all')}</option>${equipment.map(e=>`<option value="${e.id}" ${ctx.selected===e.id?'selected':''}>${esc(e.equipment_code+' · '+nameOf(e))}</option>`).join('')}</select></label><label>${txt('year')}<input id="pmYear" type="number" class="select" min="2000" max="2100" value="${ctx.year}"></label>${button('pmRecords','id="pmRecords"')}</div>${pmDetailEquipment?button('pmBackCards','id="pmBackCards"'):''}<div class="pm-key">${['W','M','Q','Y'].map(c=>`<span>${txt('cycle'+c)} </span>`).join('')}</div><p>${txt(pmDetailEquipment?'pmBoardHelp':'pmSelectCard')}</p>${pmDetailEquipment?`<p class="muted">${txt('pmCycleHint')}</p>`:''}<div class="${pmDetailEquipment?'pm-sheets':'pm-equipment-grid'}">${cards.join('')||`<div class="empty-note">${txt('noData')}</div>`}</div>`;
 $('#pmEquipment').onchange=e=>{ctx.setEquipment(e.target.value);renderContent();};$('#pmYear').onchange=e=>{const y=Number(e.target.value);if(Number.isInteger(y)&&y>=2000&&y<=2100)ctx.setYear(y);renderContent();};
 $('#pmRecords').onclick=()=>{ctx.legacy();const content=$('#content');content.insertAdjacentHTML('afterbegin',button('pmAnnual','id="pmReturn"'));$('#pmReturn').onclick=renderContent;$$('#deptFilter,#groupFilter').forEach(el=>el.onchange=()=>{department=$('#deptFilter').value;group=el.id==='deptFilter'?'':$('#groupFilter').value;renderContent();});};
 }else{
  const detailForm=forms.get((data.assignments||[]).find(a=>a.equipment_id===pmDetailEquipment&&a.kind==='maintenance')?.form_id);
  const m=dialog('pmEquipmentDialog',window.inspectionFormTitle(detailForm),`<p>${txt('pmBoardHelp')}</p><p class="muted">${txt('pmCycleHint')}</p>${cards.join('')}`,button('pmBackCards','id="pmBackCards"','primary'));
  m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label',window.inspectionFormTitle(detailForm));
  const close=()=>{m.remove();pmDetailEquipment='';document.querySelector(`[data-pm-open="${m.dataset.equipment}"]`)?.focus({preventScroll:true});};
  m.dataset.equipment=pmDetailEquipment;
  m.querySelector('.x').onclick=close;$('#pmBackCards').onclick=close;
  m.onclick=event=>{if(event.target===m)close();};
  m.onkeydown=event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
   if(event.key==='Tab'){const focusable=[...m.querySelectorAll('button,input,select,[tabindex="0"]')].filter(e=>!e.disabled),first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  };
  m.querySelector('.x').focus({preventScroll:true});
 }
 $$('[data-pm-record]').forEach(b=>b.onclick=()=>ctx.open(rows.find(r=>r.id===b.dataset.pmRecord)));
 $$('[data-pm-add]').forEach(b=>b.onclick=()=>{const e=data.equipment.find(e=>e.id===b.dataset.pmAdd),f=forms.get(b.dataset.form),i=Number(b.dataset.item),code=b.dataset.code||ctx.cycleCode(Object.values(f.items[i].cycle||{}).join(' '));openPMSchedule(ctx,e,f,i,code,Number(b.dataset.month)||Number(inspectionDay().slice(5,7)));});
 $$('[data-pm-preset]').forEach(b=>b.onclick=()=>{const e=data.equipment.find(e=>e.id===b.dataset.pmPreset),f=forms.get(b.dataset.form),month=Number(b.dataset.month),start=`${ctx.year}-${String(month).padStart(2,'0')}-01`,end=start.slice(0,8)+String(new Date(Date.UTC(ctx.year,month,0)).getUTCDate());ctx.create(e,f,Number(b.dataset.item),b.dataset.code,start,end);});
 $$('[data-pm-open]').forEach(b=>b.onclick=()=>{pmDetailEquipment=b.dataset.pmOpen;renderPMVisual(ctx,true);});

 bindReferencePhotos();
}
function openPMSchedule(ctx,e,f,index,code,month){
 const m=dialog('pmSchedule',t('pmChoose'),`<p>${esc(e.equipment_code+' · '+multilingual(f.items[index].name))}</p><div class="pm-cycle-options">${['W','M','Q','Y','E'].map(c=>`<button class="pm-cycle ${c===code?'selected':''}" data-pm-cycle="${c}">${txt('cycle'+c)} <b>${ctx.symbols[c][0]}</b></button>`).join('')}</div><label>${txt('pmMonth')}<select id="pmScheduleMonth" class="select">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${month===i+1?'selected':''}>${ctx.year}-${String(i+1).padStart(2,'0')}</option>`).join('')}</select></label>`,button('pmContinue','id="pmContinue"','primary'));
 m.querySelectorAll('[data-pm-cycle]').forEach(b=>b.onclick=()=>{code=b.dataset.pmCycle;m.querySelectorAll('[data-pm-cycle]').forEach(x=>x.classList.toggle('selected',x===b));});
 $('#pmContinue').onclick=()=>{month=Number($('#pmScheduleMonth').value);const start=`${ctx.year}-${String(month).padStart(2,'0')}-01`,days=new Date(Date.UTC(ctx.year,month,0)).getUTCDate(),end=`${ctx.year}-${String(month).padStart(2,'0')}-${String(code==='W'?7:days).padStart(2,'0')}`;m.remove();ctx.create(e,f,index,code,start,end);};
}
