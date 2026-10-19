/* Generate the approved application layout inside the existing multi-sheet Excel export. */
(()=>{
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',relNs='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const dec='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const xml=x=>String(x??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const text=el=>{const copy=el.cloneNode(true);copy.querySelectorAll('a,select,.sc-screen-only').forEach(e=>e.remove());copy.querySelectorAll('br').forEach(e=>e.replaceWith('\n'));return copy.textContent.trim();};
const primaryText=el=>{const copy=el.cloneNode(true);copy.querySelectorAll('.secondary-note').forEach(e=>e.remove());return text(copy);};
const doc=s=>new DOMParser().parseFromString(s,'application/xml');
const serialize=d=>new XMLSerializer().serializeToString(d);
function styles(source){const d=doc(source),root=d.documentElement;const block=name=>{let b=root.getElementsByTagName(name)[0];if(!b){b=d.createElementNS(ns,name);root.insertBefore(b,root.firstChild);}return b;};
 const append=(name,fragment)=>{const b=block(name),index=b.children.length,n=doc(`<root xmlns="${ns}">${fragment}</root>`).documentElement.firstElementChild;b.append(d.importNode(n,true));b.setAttribute('count',b.children.length);return index;};
 const font=append('fonts','<font><sz val="11"/><name val="Calibri"/></font>'),bold=append('fonts','<font><b/><sz val="11"/><name val="Calibri"/></font>'),title=append('fonts','<font><b/><sz val="14"/><name val="Calibri"/></font>');
 const border=append('borders','<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom></border>');
 let id=Math.max(163,...[...block('numFmts').children].map(e=>Number(e.getAttribute('numFmtId'))))+1;const weight=id++,price=id++;
 append('numFmts',`<numFmt numFmtId="${weight}" formatCode="#,##0.###"/>`);append('numFmts',`<numFmt numFmtId="${price}" formatCode="#,##0.####"/>`);
 const xf=(f,b,num=0,align='center',wrap=true)=>append('cellXfs',`<xf numFmtId="${num}" fontId="${f}" fillId="0" borderId="${b}" xfId="0" applyAlignment="1" applyNumberFormat="1" applyBorder="1" applyFont="1"><alignment horizontal="${align}" vertical="center" wrapText="${wrap?1:0}"/></xf>`);
 const currencyStyles=new Map();
 return {moneyFor(currency){if(!currencyStyles.has(currency)){const fmt=id++;append('numFmts',`<numFmt numFmtId="${fmt}" formatCode="#,##0.00&quot; ${xml(currency)}&quot;"/>`);currencyStyles.set(currency,xf(font,border,fmt,'right',false));}return currencyStyles.get(currency);},title:xf(title,0),plain:xf(font,0,0,'left'),header:xf(bold,border),body:xf(font,border),left:xf(font,border,0,'left'),weight:xf(font,border,weight,'right',false),price:xf(font,border,price,'right',false),money:xf(font,border,4,'right',false),get final(){return serialize(d);}};
}
async function download(workbook,html,numericRows,filename,detailHtml,detailGroups){
 if(typeof JSZip==='undefined')throw Error('zip unavailable');
 const zip=await JSZip.loadAsync(XLSX.write(workbook,{type:'array',bookType:'xlsx'})),wb=doc(await zip.file('xl/workbook.xml').async('string')),rels=doc(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
 const sheets=[...wb.getElementsByTagName('sheet')],index=sheets.findIndex(s=>s.getAttribute('name')==='處份申請彙總');if(index<0)throw Error('application sheet missing');
 const rid=sheets[index].getAttributeNS(relNs,'id'),relationship=[...rels.getElementsByTagName('Relationship')].find(r=>r.getAttribute('Id')===rid),target=relationship.getAttribute('Target'),path=target.startsWith('/')?target.slice(1):'xl/'+target;
 const s=styles(await zip.file('xl/styles.xml').async('string')),root=new DOMParser().parseFromString(html,'text/html'),paper=root.querySelector('.sc-consolidated');if(!paper)throw Error('application layout missing');
 const columnWidths=[4,28,12,9,8,10,11,12,6],rows=[],merges=[];let rowNo=0;
 function add(cells,height=0){rowNo++;let cursor=0,max=16;const output=[];for(const c of cells){const span=c.span||1,start=cursor,style=c.style??s.body,v=c.value??'';if(span>1)merges.push(`${col(start)}${rowNo}:${col(start+span-1)}${rowNo}`);const weighted=String(v).split('\n').map(line=>[...line].reduce((n,ch)=>n+(ch.charCodeAt(0)>255?2:1),0));const count=weighted.reduce((n,len)=>n+Math.max(1,Math.ceil(len/Math.max(2,columnWidths.slice(start,start+span).reduce((n,w)=>n+w,0)-2))),0);max=Math.max(max,count*10+6);
 for(let j=0;j<span;j++){const ref=col(cursor++)+rowNo,value=j===0?v:'';output.push(typeof value==='number'&&Number.isFinite(value)?`<c r="${ref}" s="${style}"><v>${value}</v></c>`:`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`);}}
 rows.push(`<row r="${rowNo}" ht="${height||max}" customHeight="1">${output.join('')}</row>`);
 }
 add([{span:2,value:'' ,style:s.plain},{span:5,value:primaryText(paper.querySelector('h2')),style:s.title},{span:2,value:primaryText(paper.querySelector('.sc-sheet-head>div')),style:s.plain}],40);

 const multipleCurrencies=new Set(numericRows.map(r=>r['幣別'])).size>1;
 const widths=Array(9).fill(1),main=paper.querySelector('.sc-combined-table');let dataIndex=0;
 for(const tr of main.rows){const isHead=tr.parentElement.tagName==='THEAD',isData=!isHead&&!tr.classList.contains('sc-combined-total');let at=0;const cells=[...tr.cells].map((td,i)=>{const span=widths.slice(at,at+td.colSpan).reduce((n,w)=>n+w,0);at+=td.colSpan;let value=text(td),style=isHead?s.header:(i===1||i===7?s.left:s.body);
 if(isData&&numericRows[dataIndex]&&[3,5,6].includes(i)){const v=numericRows[dataIndex][{3:'單價',5:'淨重',6:'處分金額'}[i]];if(typeof v==='number'){value=v;style=i===3?s.price:i===5?s.weight:multipleCurrencies?s.moneyFor(numericRows[dataIndex]['幣別']):s.money;}}
 return {span,value,style};});add(cells);if(isData)dataIndex++;}
 for(const table of paper.querySelectorAll('.sc-bottom'))for(const tr of table.rows){let at=0;add([...tr.cells].map(td=>{const span=[2,2,2,3].slice(at,at+td.colSpan).reduce((n,w)=>n+w,0);at+=td.colSpan;return {span,value:text(td),style:td.tagName==='TH'?s.header:s.body};}),tr.classList.contains('sc-sign')?45:0);}
 add([{span:9,value:text(paper.querySelector('.sc-sign-note')),style:s.plain}]);
 const last=rowNo;
 zip.file(path,dec+`<worksheet xmlns="${ns}" xmlns:r="${relNs}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:I${last}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols>${columnWidths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.25" bottom="0.3" header="0.1" footer="0.1"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/><headerFooter><oddFooter>&amp;RQR34-03-B</oddFooter></headerFooter><drawing r:id="rIdApplicationLogo"/></worksheet>`);
 zip.file('xl/styles.xml',s.final);
 let names=wb.getElementsByTagName('definedNames')[0];if(!names){names=wb.createElementNS(ns,'definedNames');wb.documentElement.append(names);}for(const name of ['_xlnm.Print_Area','_xlnm.Print_Titles']){for(const n of [...names.children])if(n.getAttribute('name')===name&&Number(n.getAttribute('localSheetId'))===index)n.remove();const n=wb.createElementNS(ns,'definedName');n.setAttribute('name',name);n.setAttribute('localSheetId',index);n.textContent=name.endsWith('Print_Area')?`'處份申請彙總'!$A$1:$I$${last}`:"'處份申請彙總'!$1:$2";names.append(n);}zip.file('xl/workbook.xml',serialize(wb));
 await ScrapDetailExcel.append(zip,wb,rels,s,detailHtml,detailGroups);zip.file('xl/workbook.xml',serialize(wb));
 const response=await fetch('/cadre-logo.png');if(!response.ok)throw Error('logo unavailable');const png=await response.arrayBuffer(),view=new DataView(png),ratio=view.getUint32(20)/view.getUint32(16),w=Math.min(135,48/ratio),h=w*ratio;
 zip.file('xl/media/scrap-application-logo.png',png);zip.file(path.replace(/\/([^/]+)$/,'/_rels/$1.rels'),dec+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdApplicationLogo" Type="${relNs}/drawing" Target="../drawings/scrap-application.xml"/></Relationships>`);
 zip.file('xl/drawings/scrap-application.xml',dec+`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>19050</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>95250</xdr:rowOff></xdr:from><xdr:ext cx="${Math.round(w*9525)}" cy="${Math.round(h*9525)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="NES Limited"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="${relNs}" r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);
 zip.file('xl/drawings/_rels/scrap-application.xml.rels',dec+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="${relNs}/image" Target="../media/scrap-application-logo.png"/></Relationships>`);
 const types=doc(await zip.file('[Content_Types].xml').async('string')),ct=types.documentElement,ctns=ct.namespaceURI;
 if(![...ct.children].some(e=>e.getAttribute('Extension')==='png')){const e=types.createElementNS(ctns,'Default');e.setAttribute('Extension','png');e.setAttribute('ContentType','image/png');ct.append(e);}const drawing=types.createElementNS(ctns,'Override');drawing.setAttribute('PartName','/xl/drawings/scrap-application.xml');drawing.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.drawing+xml');ct.append(drawing);zip.file('[Content_Types].xml',serialize(types));
 const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
window.ScrapApplicationExcel={download};
})();

