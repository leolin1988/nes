/* Calendar-only helpers, shared by preview and verification. Endpoints recheck writes. */
window.InspectionNormalRange={
 dates(start,end,today){
  const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  if(!valid(start)||!valid(end)||start>end||end>today||start<'2000-01-01')throw Error('invalid_range');
  const days=(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000+1;
  if(days>31)throw Error('invalid_range');
  return Array.from({length:days},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 },
 candidates(data,o,dates,recordDay){
  const existingKeys=new Set(data.records.filter(r=>r.shift===o.shift).map(r=>r.equipment_id+':'+recordDay(r)));
  let existing=0,noForm=0;const candidates=[];
  for(const e of data.equipment.filter(e=>!e.archived_at&&e.status==='active'&&(!o.department||e.department_id===o.department))){
   const a=data.assignments.find(a=>a.equipment_id===e.id&&a.kind==='daily'),f=a&&data.forms.find(f=>f.id===a.form_id&&f.kind==='daily');
   for(const date of dates){
    if(existingKeys.has(e.id+':'+date)){existing++;continue;}
    if(!f?.updated_at||!Array.isArray(f.items)||!f.items.length||f.items.length>200){noForm++;continue;}
    candidates.push({equipment:e,form:f,date});
   }
  }
  return {candidates,existing,noForm};
 }
};
