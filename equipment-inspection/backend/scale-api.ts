import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {jwtVerify} from 'https://deno.land/x/jose@v5.2.4/index.ts';
import {validAccountSession} from './account-security.ts';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(Deno.env.get('SUPABASE_URL')!,service);
const origins=new Set(['https://equipment-inspection-demo-20261001.s0981975027.chatgpt.site','http://127.0.0.1:4173','http://localhost:4173','https://inspection.nes.com','https://raphael.tsotsotech.com']);
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://equipment-inspection-demo-20261001.s0981975027.chatgpt.site','Access-Control-Allow-Headers':'authorization,content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'method'},405);
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)return reply({error:'auth'},401);
  let payload:any;try{({payload}=await jwtVerify(token,new TextEncoder().encode(service),{algorithms:['HS256']}));}catch{return reply({error:'auth'},401);}
  const {data:user,error:authError}=await db.from('operator_accounts').select('id,is_active,auth_version').eq('id',String(payload.sub)).maybeSingle();
  if(authError||!validAccountSession(payload,user))return reply({error:'auth'},401);
  const b=await req.json(),country=b.country_code,dept=b.department_id;
  if(!['TW','VM','MX'].includes(country)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.month||'')||!['get','save'].includes(b.action))return reply({error:'invalid_date'},400);
  const check=await db.rpc('account_can',{p_account:user.id,p_country:country,p_department:dept,p_resource:'scale',p_action:'view'});
  if(check.error||check.data!==true)return reply({error:'forbidden'},403);
  const month=b.month+'-01';
  if(b.action==='save'){
   const r=await db.rpc('save_scale_month',{p_country:country,p_actor:user.id,p_department:dept,p_month:month,p_revision:b.revision,p_document:b.document});
   if(r.error){const code=['forbidden','record_changed','invalid_date','invalid_scale','duplicate_scale','missing_identifiers','invalid_reading','missing_inspector'].find(x=>r.error!.message.includes(x))||'save_failed';return reply({error:code},code==='forbidden'?403:code==='record_changed'?409:400);}
   return reply({record:r.data});
  }
  const current=await db.from('scale_months').select('*').eq('country_code',country).eq('department_id',dept).eq('month',month).maybeSingle();if(current.error)throw current.error;
  let template=null;
  if(!current.data){const prior=await db.from('scale_months').select('document').eq('country_code',country).eq('department_id',dept).lt('month',month).order('month',{ascending:false}).limit(1);if(prior.error)throw prior.error;if(prior.data?.length){template=prior.data[0].document;template={...template,notes:'',supervisor:'',custodian:'',rows:template.rows.map((r:any)=>({number:r.number,days:{}}))};}}
  return reply({record:current.data,template});
 }catch{return reply({error:'service_error'},500);}
});
