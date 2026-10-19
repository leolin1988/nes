import { requireAccess, canAccess } from './access-control.ts';
import { uuidPattern } from './inspection-features.ts';
export async function scrapRecords(body:any,user:any,client:any,reply:any){
 if(!['scrap_get','scrap_save'].includes(body.action))return null;
 if(!['admin','supervisor'].includes(user.role))return reply({error:'forbidden'},403);
 let dept=String(body.department_id||'');const month=String(body.month||'');
 if(!uuidPattern.test(dept)||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return reply({error:'invalid_scrap'},400);
 const merge=await client.from('scrap_department_merges').select('*').or(`primary_department.eq.${dept},secondary_department.eq.${dept}`).maybeSingle();if(merge.error)throw merge.error;
 if(merge.data){if(![merge.data.primary_department,merge.data.secondary_department].some(id=>canAccess(user,id,'scrap','view')))throw Error('forbidden');dept=merge.data.primary_department;}else requireAccess(user,dept,'scrap','view');
 const d=await client.from('departments').select('id').eq('id',dept).eq('is_active',true).maybeSingle();if(d.error)throw d.error;if(!d.data)return reply({error:'forbidden'},403);
 if(body.action==='scrap_get'){
  const r=await client.from('scrap_months').select('*').eq('department_id',dept).eq('month',month).maybeSingle();if(r.error)throw r.error;
  const groups=await client.from('equipment_groups').select('id,name_zh,name_en,name_es,name_vi').eq('department_id',dept).eq('is_active',true);if(groups.error)throw groups.error;
  let items=undefined;
  if(!r.data){const prior=await client.from('scrap_months').select('quotes').eq('department_id',dept).lt('month',month).order('month',{ascending:false}).limit(1);if(prior.error)throw prior.error;items=prior.data?.[0]?.quotes.map((q:any)=>q.item);}
  const currency=r.data?.details?.currency||{TW:'TWD',VM:'VND',MX:'MXN'}[body.country_code];
  const shared=await client.rpc('scrap_quote_snapshot',{c:body.country_code,m:month,cur:currency});if(shared.error)throw shared.error;
  const defaults=['鐵屑','鐵粒','鐵花','不良品','調機品','鐵皮/鐵牌/鐵線','廠商下腳料','白鐵','鋁合金','製程下腳料'];
  const record=r.data||{department_id:dept,month,revision:0,rows:[],quotes:(items||defaults).map((item:string)=>({item,price:null})),details:{currency,application_date:new Date().toISOString().slice(0,10)}};
  const map=new Map(shared.data.quotes.map((q:any)=>[q.item,q.price]));record.quotes=record.quotes.map((q:any)=>({...q,price:map.has(q.item)?map.get(q.item):null}));
  for(const q of shared.data.quotes)if(!record.quotes.some((x:any)=>x.item===q.item))record.quotes.push(q);
  if(!record.quotes.some((q:any)=>q.item==='製程下腳料'))record.quotes.push({item:'製程下腳料',price:map.get('製程下腳料')??null});
  record.quote_revision=shared.data.revision;
  record.quote_details=shared.data.details||{};
  return reply({record,items,equipment:[],groups:groups.data});
 }
 if(!Number.isInteger(body.quote_revision)||body.quote_revision<0)return reply({error:'record_changed'},409);
 // Common prices are edited only through the monthly quotation sheet.
 const currency=body.details?.currency||{TW:'TWD',VM:'VND',MX:'MXN'}[body.country_code];
 const common=await client.rpc('scrap_quote_snapshot',{c:body.country_code,m:month,cur:currency});if(common.error)throw common.error;
 if(body.quote_revision!==common.data.revision)return reply({error:'record_changed'},409);
 const prices=new Map(common.data.quotes.map((q:any)=>[q.item,q.price]));
 if(!Array.isArray(body.rows)||body.rows.some((r:any)=>r&&Object.prototype.hasOwnProperty.call(r,'welfare_committee')&&!['yes','no'].includes(r.welfare_committee)))return reply({error:'invalid_scrap'},400);
 if(!Array.isArray(body.quotes)||body.quotes.some((q:any)=>q.price!==(prices.has(q.item)?prices.get(q.item):null)))return reply({error:'shared_quote_only'},400);
 const r=await client.rpc('save_scrap_month',{p_country:body.country_code,p_account:user.id,p_department:dept,p_month:month,p_revision:body.revision,p_rows:body.rows,p_quotes:body.quotes,p_details:body.details,p_quote_revision:body.quote_revision});
 if(r.error){const code=['forbidden','record_changed','invalid_scrap'].find(s=>r.error.message?.includes(s))||'invalid_scrap';return reply({error:code},code==='forbidden'?403:code==='record_changed'?409:400);}
 return reply({record:r.data});
}


