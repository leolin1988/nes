(function(root){
 const codes={'○':'W','◯':'W','●':'W','△':'M','▲':'M','◇':'Q','◆':'Q','□':'Y','■':'Y'};
 const norm=v=>String(v||'').replace(/[^\u3400-\u9fff0-9]/g,'');
 function parse(rows,merges,existing){
  const cn=['一','二','三','四','五','六','七','八','九','十','十一','十二'];
  const header=rows.findIndex(row=>row.some(v=>String(v).includes('一月份')));if(header<0)return null;
  const cols=[];rows[header].forEach((v,c)=>{const m=cn.indexOf(String(v).split('月')[0]);if(m>=0)cols.push([c,m+1]);});if(cols.length!==12)throw Error('unrecognized');
  const expanded=rows.map(r=>r.slice());for(const m of merges||[])for(let r=m.s.r;r<=m.e.r;r++)for(let c=m.s.c;c<=m.e.c;c++){expanded[r]||=[];expanded[r][c]=rows[m.s.r]?.[m.s.c]||'';}
  const end=rows.findIndex((r,n)=>n>header&&/備\s*註|填寫說明|填表說明|Remarks/i.test(String(r[0]||''))),limit=end<0?rows.length:end;
  let items=existing?.items,positions=[];
  if(items){for(const item of items){const needle=norm(item.name.zh),candidates=[];for(let r=header+2;r<limit;r++){if(!norm(rows[r]?.[0]))continue;const hay=norm(rows.slice(r,r+6).map(row=>row[0]||'').join('\n'));let n=0;while(n<needle.length&&needle[n]===hay[n])n++;if(n>=Math.min(6,needle.length))candidates.push({r,n});}candidates.sort((a,b)=>b.n-a.n);if(!candidates.length||candidates[1]?.n===candidates[0].n)throw Error('importCollision');positions.push(candidates[0].r);}}
  else{
   const blocks=[];for(let r=header+2;r<limit;r++){const name=String(rows[r]?.[0]||'').trim(),cycle=String(rows[r]?.[1]||'').trim();if(!name||/保養人|主\s*管|如下為|Maintenance person|Manager/i.test(name))continue;if(cycle||/^\d+[.、]/.test(name)||!blocks.length)blocks.push({r,name,cycle:cycle||String(expanded[r]?.[1]||'')});else blocks.at(-1).name+='\n'+name;}
   items=blocks.map((b,i)=>({order:i+1,name:root.DailyChecklistImport.splitText(b.name),standard:{zh:'',en:'',es:'',vi:''},method:{zh:'',en:'',es:'',vi:''},cycle:root.DailyChecklistImport.splitText(b.cycle)}));positions=blocks.map(b=>b.r);
  }
  return items.map((item,i)=>({...structuredClone(item),schedule:cols.flatMap(([c,month])=>[...String(expanded[positions[i]]?.[c]||'')].filter(s=>codes[s]).map(s=>({month,cycle_code:codes[s]})))})).map(item=>({...item,schedule:typeof root.pmDefaultSchedule==='function'?root.pmDefaultSchedule(item):item.schedule}));
 }
 root.MaintenanceSource={parse};if(typeof module!=='undefined')module.exports=root.MaintenanceSource;
})(typeof globalThis!=='undefined'?globalThis:window);
if(typeof window!=='undefined'){
 const baseImport=importForms;
 importForms=async function(){
  if(kind!=='maintenance')return baseImport();
  const file=$('#formFile')?.files[0];if(!file){toast('selectFile');return;}
  try{
   const book=XLSX.read(await file.arrayBuffer(),{type:'array'}),prepared=[];
   for(const sheetName of book.SheetNames){const ws=book.Sheets[sheetName],rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,blankrows:true,range:0});
    const chosen=data.departments.find(d=>d.id===department)?.name_zh;
    const matches=data.forms.filter(f=>f.kind==='maintenance'&&f.source_filename===file.name&&f.source_sheet===sheetName&&(!chosen||f.department===chosen));if(matches.length>1)throw Error('importCollision');
    const existing=matches[0],items=MaintenanceSource.parse(rows,ws['!merges']||[],existing);if(!items)continue;
    const dep=chosen||existing?.department||String(rows[3]?.[1]||'').split('\n')[0].trim(),name=existing?.equipment_name||String(rows[3]?.[7]||'').split('\n')[0].trim();
    if(!data.departments.some(d=>d.name_zh===dep)||!name||!items.length)throw Error('departmentMissing');
    const f=existing?structuredClone(existing):{kind:'maintenance',department:dep,equipment_name:name,equipment_group:'',machine_no:String(rows[4]?.[1]||''),property_no:String(rows[4]?.[7]||''),form_name:dep+'_'+name+'_預保養.csv',source_filename:file.name,source_sheet:sheetName};f.items=items;prepared.push(f);
   }
   if(!prepared.length)return baseImport();
   const count=prepared.reduce((n,f)=>n+f.items.reduce((a,i)=>a+i.schedule.length,0),0);
   const modal=dialog('pmImportPreview',t('originalPreview'),`<p>${esc(file.name)}</p><p>${prepared.length} ${txt('fileName')} · ${count} ○／△／◇／□</p><p>${txt('previewOnly')}</p>`+table(['department','equipmentName','rowCount'],prepared.map(f=>`<tr><td>${esc(f.department)}</td><td>${esc(f.equipment_name)}</td><td>${f.items.length}</td></tr>`).join('')),button('confirmImport','id="pmImportConfirm"','primary'));
   $('#pmImportConfirm').onclick=async()=>{const b=$('#pmImportConfirm');b.disabled=true;try{for(const f of prepared)await api({action:f.id?'form_save':'forms_import',...(f.id?{form:f}:{forms:[f]}),filename:file.name});modal.remove();await load();toast('importDone');}catch{toast('importFailed');b.disabled=false;}};
  }catch(e){toast(translations[e.message]?e.message:'invalidFile');}
 };
}
