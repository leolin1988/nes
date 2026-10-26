/* Period planning and qualification never mutate existing inspection data. */
window.SupervisorBatchRules={
 fields:['fire_use','electrical_wiring','cigarette','shutdown_fire','combustibles'],
 dates(start,end,today,cycle='daily'){
  const valid=s=>/^20\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  if(!valid(start)||!valid(end)||start>end||end>today||!['daily','weekly','monthly'].includes(cycle))throw Error('invalid_date');
  const count=(Date.parse(end)-Date.parse(start))/86400000+1;if(count>367||(cycle!=='monthly'&&count>31))throw Error('invalid_date');
  const step=cycle==='weekly'?7:1;return Array.from({length:Math.ceil(count/step)},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*step*86400000).toISOString().slice(0,10));
 },
 months(dates){return [...new Set(dates.map(d=>d.slice(0,7)))];},
 craneReady(r,kind,items){return !!r&&r.completed===true&&!r.confirmed_at&&!!r.inspector_name?.trim()&&Array.isArray(r.results)&&r.results.length===items.length&&r.results.every((x,i)=>String(x.id)===String(items[i].id)&&(kind==='daily'?x.value==='ˇ':['✔','─'].includes(x.value)));},
 fireReady(r,today){
  if(r?.status!=='submitted'||!r.implementer_name?.trim()||!Array.isArray(r.entries))return false;
  const month=r.inspection_month.slice(0,7),days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate(),through=month===today.slice(0,7)?Number(today.slice(8)):days;
  return month<=today.slice(0,7)&&r.entries.length===days&&r.entries.slice(0,through).every((e,i)=>Number(e.day)===i+1&&this.fields.every(f=>['O','V'].includes(e[f])));
 },
 fillFire(record,dates,name,today){
  if(record.status!=='draft')throw Error('fire_daily_locked');
  const next=JSON.parse(JSON.stringify(record));let changed=0;
  for(const date of dates){if(date.slice(0,7)!==record.inspection_month.slice(0,7))continue;const day=next.entries.find(e=>Number(e.day)===Number(date.slice(8)));if(!day)throw Error('invalid_fire_daily');
   if(this.fields.some(f=>day[f]==='X'))throw Error('not_qualified');
   for(const f of this.fields)if(!day[f]){day[f]='O';changed++;}
  }
  if(!changed)throw Error('not_qualified');next.implementer_name=record.implementer_name?.trim()||name;
  const month=record.inspection_month.slice(0,7),through=month===today.slice(0,7)?Number(today.slice(8)):next.entries.length;
  next.status=next.entries.slice(0,through).every(e=>this.fields.every(f=>['O','V'].includes(e[f])))?'submitted':'draft';
  return next;
 }
};
