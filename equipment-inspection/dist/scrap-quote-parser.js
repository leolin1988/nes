(function(root){
'use strict';
const columns=['年月份','幣別','報廢項目','每公斤單價','報價廠商','報價單號','報價日期','備註'];
const clean=x=>String(x??'').trim();
function parse(rows,{month,currency}){
 const errors=[],quotes=[],details={},seen=new Map();let headers=rows[0]?.map(clean)||[];
 if(columns.slice(0,4).some(h=>!headers.includes(h))||new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)return {errors:[{row:1,code:'header'}]};
 if(rows.length>1001)return {errors:[{row:0,code:'limit'}]};
 rows.slice(1).forEach((row,n)=>{
  if(!row.some(x=>clean(x)!==''))return;const v=Object.fromEntries(headers.map((h,i)=>[h,clean(row[i])])),r=n+2;
  if(v['年月份']!==month)errors.push({row:r,code:'month'});
  if(v['幣別']!==currency)errors.push({row:r,code:'currency'});
  const item=['製造報廢','不良品'].includes(v['報廢項目'])?'製程報廢':v['報廢項目'],raw=v['每公斤單價'];if(!item||item.length>100)errors.push({row:r,code:'required'});
  const price=raw===''?null:Number(raw);if(raw!==''&&(!/^\d+(\.\d{1,4})?$/.test(raw)||!Number.isFinite(price)||price>1000000))errors.push({row:r,code:'number'});
  if(seen.has(item)){if(seen.get(item)!==price)errors.push({row:r,code:'price'});}else{seen.set(item,price);quotes.push({item,price});}
  for(const [header,key]of [['報價廠商','vendor'],['報價單號','document_no'],['報價日期','quote_date'],['備註','note']]){const value=v[header]||'';if(!value)continue;if(value.length>2000)errors.push({row:r,code:'required'});if(details[key]&&details[key]!==value)errors.push({row:r,code:'metadata'});else details[key]=value;}
 });
 if(details.quote_date){const s=details.quote_date;if(!/^20\d{2}-(0[1-9]|1[0-2])-\d{2}$/.test(s)||s.slice(0,7)!==month||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)errors.push({row:0,code:'date'});}
 if(!quotes.length)errors.push({row:0,code:'empty'});if(quotes.length>100)errors.push({row:0,code:'limit'});
 return {errors,quotes,details};
}
root.ScrapQuoteImport={parse,columns};if(typeof module!=='undefined')module.exports=root.ScrapQuoteImport;
})(typeof globalThis!=='undefined'?globalThis:window);
