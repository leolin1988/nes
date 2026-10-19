(function(){
const I=window.fireI18n;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=s=>document.querySelector(s)?.value?.trim()||'';
const show=v=>esc(v).replace(/\n/g,'<br>')||'&nbsp;';
const td=(v,attr='')=>`<td ${attr}>${v||'&nbsp;'}</td>`;
const L=k=>I.html(k);
const mark=s=>{const v=val(s);return v==='NA'?'—':esc(v)||'&nbsp;';};
const heading=(n,key)=>`<header class="fire-print-heading"><span>${L('appendix')} ${n}</span><h1>${L(key)}</h1></header>`;
const footer=sheet=>`<footer class="fire-print-footer"><div>${sheet.querySelector('.fire-legend')?.innerHTML||L('legend')}</div><div>${sheet.querySelector('.fire-notice')?.innerHTML||L('notice')}</div></footer>`;
const department=id=>show(document.querySelector(id)?.selectedOptions?.[0]?.textContent?.trim());
const sign=(sheet,id)=>{const section=sheet.querySelector('#'+id);return {action:(id==='fireAttachmentManager'?val('#fireAttachmentDisposition'):'')||section?.querySelector('[data-fire-print-action]')?.textContent?.trim()||'',name:(id==='fireAttachmentManager'?val('#fireAttachmentManagerName'):'')||section?.querySelector('[data-fire-print-name]')?.textContent?.trim()||'',signature:(id==='fireAttachmentManager'?val('#fireAttachmentSignature'):'')||section?.querySelector('[data-fire-print-signature]')?.textContent?.trim()||''};};
function daily(sheet){
 const checks=['fireUse','fireWiring','fireCigarette','fireShutdown','fireCombustibles'];
 const rows=Array.from({length:31},(_,i)=>`<tr>${td(i+1,'class="fire-print-day"')}${checks.map(k=>td(mark(`[data-fire-day="${i+1}"][data-fire-key="${k}"]`),'class="fire-print-result"')).join('')}${td(show(val(`[data-fire-note="${i+1}"]`)),'class="fire-print-note"')}</tr>`).join('');
 const disposition=val('#fireDisposition')||sheet.querySelector('.fire-disposition .fire-cell-value')?.textContent?.trim()||'';
 const signature=[val('#fireManagerName'),val('#fireSignature')].filter(Boolean).join(' / ')||sheet.querySelector('.fire-signature .fire-cell-value')?.textContent?.trim()||'';
 return `${heading(1,'dailyTitle')}<table class="fire-print-table fire-print-daily"><colgroup><col class="day"><col span="5" class="check"><col class="note"></colgroup><tbody>
 <tr class="fire-print-meta">${td(L('implementer'),'colspan="2"')}${td(show(val('#fireImplementer')),'colspan="2"')}${td(L('area'))}${td(show(val('#fireArea')),'colspan="2"')}</tr>
 <tr class="fire-print-meta">${td(L('month'),'colspan="2"')}${td(show(val('#fireMonth')),'colspan="2"')}${td(L('department'))}${td(department('#fireDept'),'colspan="2"')}</tr>
 <tr class="fire-print-head">${td(L('day'),'rowspan="3"')}${td(L('dailyGroup'),'colspan="5"')}${td(L('notes'),'rowspan="3"')}</tr>
 <tr class="fire-print-head">${['fireUse','electrical','cigarettes','shutdown','combustibles'].map(k=>td(L(k))).join('')}</tr>
 <tr class="fire-print-head">${['useCondition','wiring','buttCondition','endConfirmation','combustibleCondition'].map(k=>td(L(k))).join('')}</tr>${rows}
 <tr class="fire-print-sign-title">${td(L('managerSection'),'colspan="7"')}</tr><tr class="fire-print-sign-label">${td(L('disposition'),'colspan="5"')}${td(L('signature'),'colspan="2"')}</tr>
 <tr class="fire-print-sign-value">${td(show(disposition),'colspan="5"')}${td(show(signature),'colspan="2"')}</tr></tbody></table>${footer(sheet)}`;
}
function attachment(sheet,type){
 const meta=`<tr class="fire-print-meta">${td(L('implementer'),'colspan="2"')}${td(show(val('#fireAttachmentImplementer')),'colspan="2"')}${td(L('area'),'colspan="2"')}${td(show(val('#fireAttachmentArea')),'colspan="2"')}</tr>
 <tr class="fire-print-meta">${td(L('date'),'colspan="2"')}${td(show(val('#fireAttachmentDate')),'colspan="2"')}${type===2?td(L('date'),'colspan="2"')+td('&nbsp;','colspan="2"'):td(L('department'),'colspan="2"')+td(department('#fireAttachmentDept'),'colspan="2"')}</tr>`;
 const rows=[...sheet.querySelectorAll('.fire-grid tbody tr')];
 const manager=sign(sheet,'fireAttachmentManager'),owner=sign(sheet,'fireAttachmentOwner');
 const signRows=`<tr class="fire-print-sign-title">${td(L('managerSection'),'colspan="4"')}${td(L('ownerSection'),'colspan="4"')}</tr>
 <tr class="fire-print-sign-label">${td(L('disposition'),'colspan="3"')}${td(L('signature'))}${td(L('disposition'),'colspan="3"')}${td(L('signature'))}</tr>
 <tr class="fire-print-sign-value">${td(show(manager.action),'colspan="3"')}${td(show([manager.name,manager.signature].filter(Boolean).join(' / ')))}${td(show(owner.action),'colspan="3"')}${td(show(owner.signature))}</tr>`;
 if(type===2){
  const body=rows.map((row,i)=>`<tr>${td(row.querySelector('.fire-attachment-criterion')?.innerHTML,'colspan="3" class="fire-print-criterion"')}${td(mark(`[data-attachment-status="${i}"]`),'class="fire-print-result"')}${td(show(val(`[data-attachment-note="${i}"]`)),'colspan="2" class="fire-print-note"')}${td('&nbsp;','class="fire-print-result"')}${td('&nbsp;','class="fire-print-note"')}</tr>`).join('');
  return `${heading(2,'escapeTitle')}<table class="fire-print-table fire-print-escape"><tbody>${meta}<tr class="fire-print-head">${td(L('criterion'),'colspan="3"')}${td(L('result'))}${td(L('note'),'colspan="2"')}${td(L('result'))}${td(L('note'))}</tr>${body}<tr class="fire-print-sign-title">${td(L('report'),'colspan="8"')}</tr><tr>${td(show(val('#fireAttachmentReport')),'colspan="8" class="fire-print-report"')}</tr>${signRows}</tbody></table>${footer(sheet)}`;
 }
 const body=rows.map((row,i)=>`<tr>${td(row.querySelector('.fire-attachment-equipment')?.innerHTML,'colspan="2" class="fire-print-equipment"')}${td(row.querySelector('.fire-attachment-criterion')?.innerHTML,'colspan="4" class="fire-print-criterion"')}${td(mark(`[data-attachment-status="${i}"]`),'class="fire-print-result"')}${td(show(val(`[data-attachment-note="${i}"]`)),'class="fire-print-note"')}</tr>`).join('');
 return `${heading(3,'equipmentTitle')}<table class="fire-print-table fire-print-equipment-table"><tbody>${meta}<tr class="fire-print-head">${td(L('equipment'),'colspan="2"')}${td(L('criterion'),'colspan="4"')}${td(L('result'))}${td(L('note'))}</tr>${body}${signRows}</tbody></table>${footer(sheet)}`;
}
function cleanup(){document.body.classList.remove('printing-fire-form');document.querySelector('#firePrintSheet')?.remove();}
window.printFireForm=function(){const sheet=document.querySelector('#content .fire-sheet');if(!sheet)return;cleanup();const type=Number(document.querySelector('[data-fire-form-tab].active')?.dataset.fireFormTab)||1;const output=document.createElement('article');output.id='firePrintSheet';output.setAttribute('aria-hidden','true');output.innerHTML=type===1?daily(sheet):attachment(sheet,type);document.body.appendChild(output);document.body.classList.add('printing-fire-form');window.print();};
window.addEventListener('afterprint',cleanup);
})();
