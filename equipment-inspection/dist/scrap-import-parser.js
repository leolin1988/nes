/* Pure validation: imports append to the selected department/month draft. */
(()=>{
const headers=['年月份','組別','桶號','報廢項目','總重量(kg)','桶重量(kg)','報價單價(元/kg)','報廢單號／主管姓名','對應編號','備註'];
const norm=x=>String(x??'').trim().replace(/\s/g,'').replace(/（/g,'(').replace(/）/g,')');
const signature=r=>JSON.stringify(['group_name','barrel_no','item','gross_weight','tare_weight','scrap_no','note'].map(k=>r[k]));
function parse(matrix,options){
 const errors=[],rows=[],quotes=options.quotes.map(q=>({...q})),seen=new Set(options.existingRows.map(signature));let duplicates=0;
 const fail=(row,code,field='')=>errors.push({row,code,field});
 const head=(matrix[0]||[]).map(norm),indices=headers.map(h=>head.indexOf(norm(h))<0&&h==='報廢單號／主管姓名'?head.indexOf(norm('報廢單號')):head.indexOf(norm(h)));
 headers.slice(0,6).forEach((h,i)=>{if(indices[i]<0)fail(1,'header',h);});
 if(new Set(head.filter(Boolean)).size!==head.filter(Boolean).length)fail(1,'header');
 if(errors.length)return {errors,rows,quotes,duplicates};
 if(matrix.length>10001){fail(0,'limit');return {errors,rows,quotes,duplicates};}
 const number=(value,max,d,row,field,blank=false)=>{
  const s=String(value??'').trim();if(!s&&blank)return null;
  if(!s||!/^\d+(\.\d+)?$/.test(s)){fail(row,'number',field);return null;}
  const n=Number(s);if(!Number.isFinite(n)||n>max||Math.abs(n*10**d-Math.round(n*10**d))>.0001)fail(row,'number',field);return n;
 };
 for(let i=1;i<matrix.length;i++){
  if(!matrix[i].some((v,j)=>j!==indices[5]&&String(v??'').trim())&&['','0'].includes(String(matrix[i][indices[5]]??'').trim()))continue;
  const vals=headers.map((_,j)=>indices[j]<0?'':matrix[i][indices[j]]??''),text=vals.map(v=>String(v).trim()),line=i+1;
  if(['製造報廢','不良品'].includes(text[3]))text[3]='製程報廢';
  text[1]=options.groupAliases?.[text[1]]||text[1];
  if(text[0]!==options.month)fail(line,'month',headers[0]);
  for(const j of [1,2,3])if(!text[j]||text[j].length>(j===3?100:500))fail(line,'required',headers[j]);
  for(const j of [7,9])if(text[j].length>500)fail(line,'required',headers[j]);
  const gross=number(vals[4],1e8,3,line,headers[4]),tare=number(String(vals[5]).trim()===''?0:vals[5],1e8,3,line,headers[5]),price=number(vals[6],1e6,4,line,headers[6],true);
  if(gross!==null&&tare!==null&&(gross<0||tare>gross))fail(line,'weight');
  if(text[3]){
   let q=quotes.find(q=>q.item===text[3]);
   if(!q){if(!options.canChangeQuotes&&!options.allowNewItems)fail(line,'permission',text[3]);else if(quotes.length>=100)fail(line,'limit');else{q={item:text[3],price:null};quotes.push(q);}}
   if(q&&price!==null){if(q.price!==null&&q.price!==price)fail(line,'price',text[3]);else if(q.price===null){if(!options.canChangeQuotes)fail(line,'permission',text[3]);else q.price=price;}}
  }
  const r={group_name:text[1],barrel_no:text[2],item:text[3],gross_weight:gross,tare_weight:tare,scrap_no:text[7],reference:'',note:text[9]};
  const sig=signature(r);if(seen.has(sig)){duplicates++;continue;}seen.add(sig);rows.push(r);
 }
 if(rows.length+options.existingRows.length>500)fail(0,'limit');
 if(!rows.length&&!duplicates&&!errors.length)fail(0,'empty');
 return {errors,rows,quotes,duplicates};
}
function previousMonth(day){const [year,month]=String(day).slice(0,7).split('-').map(Number);return String(month===1?year-1:year)+'-'+String(month===1?12:month-1).padStart(2,'0');}
window.ScrapImport={headers,parse,previousMonth};
})();
