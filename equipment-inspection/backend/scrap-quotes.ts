import { canAccess } from './access-control.ts';
export async function scrapQuotes(body:any,user:any,client:any,reply:any){
 if(!['scrap_quotes_get','scrap_quotes_save'].includes(body.action))return null;
 if(!['admin','supervisor'].includes(user.role))return reply({error:'forbidden'},403);
 const month=String(body.month||''),currency=String(body.currency||'');
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!['TWD','VND','MXN','USD','EUR','CNY','JPY'].includes(currency))return reply({error:'invalid_scrap_quote'},400);
 if(body.action==='scrap_quotes_save'&&user.role!=='admin')return reply({error:'forbidden'},403);
 if(user.role!=='admin'){
  const ds=await client.from('departments').select('id').eq('is_active',true);if(ds.error)throw ds.error;
  if(!ds.data.some((d:any)=>canAccess(user,d.id,'scrap','view')))return reply({error:'forbidden'},403);
 }
 const r=body.action==='scrap_quotes_get'?await client.rpc('scrap_quote_snapshot',{c:body.country_code,m:month,cur:currency}):await client.rpc('save_scrap_quote_sheet',{p_country:body.country_code,p_account:user.id,p_month:month,p_currency:currency,p_revision:body.revision,p_quotes:body.quotes,p_details:body.details});
 if(r.error){const code=['forbidden','record_changed','invalid_scrap_quote'].find(k=>r.error.message?.includes(k))||'invalid_scrap_quote';return reply({error:code},code==='forbidden'?403:code==='record_changed'?409:400);}
 return reply({sheet:r.data});
}


