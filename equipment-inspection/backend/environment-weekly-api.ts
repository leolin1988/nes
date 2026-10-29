import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {jwtVerify} from 'https://deno.land/x/jose@v5.2.4/index.ts';
import {validAccountSession} from './account-security.ts';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(Deno.env.get('SUPABASE_URL')!,service);
const origin='https://equipment-inspection-demo-20261001.s0981975027.chatgpt.site';
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'method'},405);
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)return reply({error:'auth'},401);
  let payload:any;try{({payload}=await jwtVerify(token,new TextEncoder().encode(service),{algorithms:['HS256']}));}catch{return reply({error:'auth'},401);}
  const user=await db.from('operator_accounts').select('id,is_active,auth_version').eq('id',String(payload.sub)).maybeSingle();
  if(user.error||!validAccountSession(payload,user.data))return reply({error:'auth'},401);
  const b=await req.json(),country=b.country_code,dept=b.department_id;
  if(!['TW','VM','MX'].includes(country)||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(b.month||'')||!(/^[0-9a-f-]{36}$/i.test(dept||'')))return reply({error:'invalid_date'},400);
  const check=await db.rpc('account_can',{p_account:user.data.id,p_country:country,p_department:dept,p_resource:'environment',p_action:'view'});
  if(check.error||check.data!==true)return reply({error:'forbidden'},403);
  const [y,m]=b.month.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();
  const records=await db.from('environment_records').select('id,inspection_date,inspector,confirmed_at,results,template_snapshot').eq('country_code',country).eq('department_id',dept).gte('inspection_date',b.month+'-01').lte('inspection_date',b.month+'-'+last).order('inspection_date');
  if(records.error)throw records.error;
  return reply({records:(records.data||[]).map(r=>({id:r.id,inspection_date:r.inspection_date,inspector:r.inspector,confirmed_at:r.confirmed_at,complete:Array.isArray(r.template_snapshot)&&r.template_snapshot.length>0&&Array.isArray(r.results)&&r.results.length===r.template_snapshot.length&&r.results.every((v:any)=>['O','△','N/A'].includes(v.value))}))});
 }catch{return reply({error:'service_error'},500);}
});
