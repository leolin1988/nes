/* The monthly list shares the onscreen panel layout, with numeric weights. */
(()=>{
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rn='http://schemas.openxmlformats.org/officeDocument/2006/relationships',dec='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const xml=v=>String(v??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const clean=el=>{const c=el.cloneNode(true);c.querySelectorAll('br').forEach(x=>x.replaceWith('\n'));return c.textContent.trim();};
async function append(zip,wb,rels,style,html,groups){
 const name='製造各廠下腳料報廢清單',sheets=[...wb.getElementsByTagName('sheet')],index=sheets.findIndex(x=>x.getAttribute('name')===name);if(index<0)throw Error('detail sheet missing');
 const rid=sheets[index].getAttributeNS(rn,'id'),target=[...rels.getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===rid)?.getAttribute('Target');if(!target)throw Error('detail relationship missing');const path=target.startsWith('/')?target.slice(1):'xl/'+target;
 const paper=new DOMParser().parseFromString(html,'text/html').querySelector('.sc-detail');if(!paper)throw Error('detail layout missing');const panels=[...paper.querySelectorAll('.sc-panel')],cells=new Map(),merges=[],heights=new Map(),across=panels.length>12?6:3,panelWidth=5,gap=1,columns=across*panelWidth+(across-1)*gap,columnWidths=Array.from({length:columns},(_,i)=>i%6===5?3.2:(across===6?[3,4,4,4,10]:[4,5,5,5,13])[i%6]*1.6);
 const counts=new Map();for(const g of groups)for(const r of g.rows){const note=String(r.note||'').trim();if(note.length>=40)counts.set(note,(counts.get(note)||0)+1);}const notes=[...counts].filter(([,n])=>n>1).map(([note],i)=>({note,code:'N'+(i+1)})),noteMap=new Map(notes.map(n=>[n.note,n.code]));
 const short=values=>values[typeof primary==='string'?primary:'zh']||values.zh,headers=[{zh:'桶號',en:'Barrel',es:'Barril',vi:'Số thùng'},{zh:'總重',en:'Gross',es:'Bruto',vi:'Tổng'},{zh:'桶重',en:'Tare',es:'Tara',vi:'Bì'},{zh:'淨重',en:'Net',es:'Neto',vi:'Tịnh'},{zh:'備註',en:'Notes',es:'Notas',vi:'Ghi chú'}].map(short),refLabel=short({zh:'對應編號',en:'Reference',es:'Referencia',vi:'Mã đối chiếu'});let last=1;
 function put(row,start,span,value,format=style.body){last=Math.max(last,row);if(span>1)merges.push(`${col(start)}${row}:${col(start+span-1)}${row}`);for(let i=0;i<span;i++){const v=i===0?value:'',ref=col(start+i)+row;if(!cells.has(row))cells.set(row,[]);cells.get(row).push(typeof v==='number'&&Number.isFinite(v)?`<c r="${ref}" s="${format}"><v>${v}</v></c>`:`<c r="${ref}" s="${format}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`);}
 const lines=String(value??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil([...line].reduce((w,c)=>w+(c.charCodeAt(0)>255?2:1),0)/Math.max(3,columnWidths.slice(start,start+span).reduce((n,w)=>n+w,0)-2))),0);heights.set(row,Math.max(heights.get(row)||0,lines*12+6));
 }
 put(1,0,columns,clean(paper.querySelector('h2')),style.title);heights.set(1,30);let start=3;
 for(let band=0;band<panels.length;band+=across){const batch=panels.slice(band,band+across),maxRows=Math.max(...batch.map((p,i)=>Math.max(3,groups[band+i]?.rows.length||0))),total=start+2+maxRows;
 batch.forEach((panel,i)=>{const group=groups[band+i],offset=i*(panelWidth+gap),widths=[1,1,1,1,1],starts=widths.map((_,c)=>widths.slice(0,c).reduce((a,b)=>a+b,0));put(start,offset,panelWidth,clean(panel.querySelector('h3')),style.header);headers.forEach((h,c)=>put(start+1,offset+starts[c],widths[c],h+(c>0&&c<4?' (kg)':''),style.header));
 const trs=[...panel.querySelectorAll('tbody tr:not(.sc-detail-total)')];for(let n=0;n<maxRows;n++){const source=group?.rows[n],tds=trs[n]?.cells;for(let c=0;c<5;c++){let value=tds?.[c]?clean(tds[c]):'';if(source&&c===4&&noteMap.has(String(source.note||'').trim()))value=[noteMap.get(String(source.note).trim()),source.scrap_no].filter(Boolean).join('；');if(source&&[1,2,3].includes(c))value=[source.gross,source.tare,source.net][c-1];put(start+2+n,offset+starts[c],widths[c],value,c===4?style.left:source&&[1,2,3].includes(c)?style.weight:style.body);}}
 const totals=panel.querySelector('.sc-detail-total').cells;for(let c=0;c<5;c++)put(total,offset+starts[c],widths[c],c===0?short({zh:'合計',en:'Total',es:'Total',vi:'Tổng'}):c===1?group.gross:c===2?group.tare:c===3?group.net:'',c>=1&&c<=3?style.weight:style.header);
 put(total+1,offset,panelWidth,refLabel+'：'+group.reference,style.left);
 });start=total+3;}
 if(!panels.length)put(3,0,columns,clean(paper.querySelector('p')),style.plain);
 for(const note of notes)put(start++,0,columns,note.code+'：'+note.note,style.left);
 put(start,0,columns,clean(paper.querySelector('.sc-mismatch')),style.plain);
 const rows=[...cells].sort(([a],[b])=>a-b).map(([r,cs])=>`<row r="${r}" ht="${heights.get(r)||18}" customHeight="1">${cs.join('')}</row>`).join('');
 zip.file(path,dec+`<worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${col(columns-1)}${last}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${columnWidths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.2" right="0.2" top="0.2" bottom="0.3" header="0.1" footer="0.1"/><pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="1"/><headerFooter><oddFooter>&amp;R&amp;P / &amp;N</oddFooter></headerFooter></worksheet>`);
 let names=wb.getElementsByTagName('definedNames')[0];if(!names){names=wb.createElementNS(ns,'definedNames');wb.documentElement.append(names);}for(const n of [...names.children])if(['_xlnm.Print_Area','_xlnm.Print_Titles'].includes(n.getAttribute('name'))&&Number(n.getAttribute('localSheetId'))===index)n.remove();const area=wb.createElementNS(ns,'definedName');area.setAttribute('name','_xlnm.Print_Area');area.setAttribute('localSheetId',index);area.textContent=`'${name}'!$A$1:$${col(columns-1)}$${last}`;names.append(area);
}
window.ScrapDetailExcel={append};
})();

