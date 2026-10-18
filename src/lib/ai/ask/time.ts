const zone='America/New_York';
export function localDate(now:Date) {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=(type:string)=>p.find(v=>v.type===type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(day:string,days:number) {return new Date(Date.parse(`${day}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);}
export function campusInstant(day:string,hour:number) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||new Date(`${day}T12:00:00Z`).toISOString().slice(0,10)!==day)throw new Error('invalid_date');
  const nominal=Date.parse(`${day}T${String(hour).padStart(2,'0')}:00:00Z`);
  for(const offset of [4,5]) {
    const candidate=new Date(nominal+offset*3600000);
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(candidate);
    if(localDate(candidate)===day&&Number(parts.find(p=>p.type==='hour')?.value)===hour)return candidate;
  }
  throw new Error('unresolved_local_time');
}
export function timeWindow(time:{period:string;date:string|null},now:Date) {
  const today=localDate(now);let day=today;let endDay=addDays(today,1);let hour=0;
  switch(time.period) {
    case 'now':return {start:now.toISOString(),end:new Date(now.getTime()+1).toISOString()};
    case 'tonight':hour=18;break;
    case 'tomorrow':day=addDays(today,1);endDay=addDays(today,2);break;
    case 'next7days':endDay=addDays(today,7);break;
    case 'weekend': {
      const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
      day=weekday===0?today:addDays(today,(6-weekday+7)%7);
      endDay=addDays(day,weekday===0?1:2);break;
    }
    case 'date':if(!time.date)throw new Error('invalid_date');day=time.date;endDay=addDays(day,1);break;
  }
  const start=new Date(Math.max(now.getTime(),campusInstant(day,hour).getTime()));
  const end=campusInstant(endDay,0);
  if(end<=start||start.getTime()>now.getTime()+7*86400000||end.getTime()>now.getTime()+8*86400000)throw new Error('date_outside_horizon');
  return {start:start.toISOString(),end:end.toISOString()};
}
