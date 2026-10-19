// Called only after active-account authentication and country authorization.
export async function companyCalendar(body:any,user:any,client:any,reply:any){
 if(!['calendar_get','calendar_save'].includes(body.action))return null;
 if(user.role!=='admin')return reply({error:'forbidden'},403);
 const year=Number(body.year);
 if(!Number.isInteger(year)||year<2000||year>2100)return reply({error:'invalid_calendar'},400);
 if(body.action==='calendar_save'){
  const r=await client.rpc('save_company_calendar',{p_country:body.country_code,p_account:user.id,p_revision:body.revision,p_year:year,
   p_timezone:body.timezone,p_enabled:body.enabled,p_weekends:body.weekends_off,p_effective:body.effective_date,p_days:body.days});
  if(r.error)return reply({error:r.error.message==='record_changed'?'record_changed':'invalid_calendar'},r.error.message==='record_changed'?409:400);
  return reply({calendar:r.data});
 }
 const [c,d]=await Promise.all([client.from('company_calendars').select('*').single(),client.from('company_calendar_days').select('*').gte('calendar_date',`${year}-01-01`).lt('calendar_date',`${year+1}-01-01`).order('calendar_date')]);
 if(c.error)throw c.error;if(d.error)throw d.error;
 return reply({calendar:c.data,days:d.data||[]});
}


