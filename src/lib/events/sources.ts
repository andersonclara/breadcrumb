export type Source = {
  id: string; name: string; url: string;
  format: 'livewhale' | 'tribe' | 'rss' | 'ical' | 'gatornights' | 'jsonld' | 'city' | 'shows';
  intervalMinutes: number; timezone?: string; review?: string;
};
export const sources: Source[] = [
  {id:'gatorconnect',name:'UF GatorConnect',url:'https://gatorconnect.ufl.edu/events.rss',format:'rss',intervalMinutes:30},
  {id:'uf-calendar',name:'UF Calendar',url:'https://calendar.ufl.edu/live/json/events',format:'livewhale',intervalMinutes:30,timezone:'America/New_York'},
  {id:'libraries',name:'UF Libraries',url:'https://libcal.uflib.ufl.edu/rss.php?iid=6&m=month&cid=22582',format:'rss',intervalMinutes:120,timezone:'America/New_York'},
  {id:'arts',name:'UF College of the Arts',url:'https://arts.ufl.edu/wp-json/tribe/events/v1/events',format:'tribe',intervalMinutes:120,timezone:'America/New_York'},
  {id:'gatornights',name:'UF GatorNights',url:'https://studentengagement.ufl.edu/gatornights/',format:'gatornights',intervalMinutes:360,timezone:'America/New_York'},
  {id:'gainesvilleevents',name:'GainesvilleEvents',url:'https://gainesvilleevents.com/feed.ics',format:'ical',intervalMinutes:2880},
  {id:'performing-arts',name:'UF Performing Arts',url:'https://performingarts.ufl.edu/?ec3_ical',format:'ical',intervalMinutes:360},
  {id:'visit-gainesville',name:'Visit Gainesville',url:'https://www.visitgainesville.com/wp-json/tribe/events/v1/events',format:'tribe',intervalMinutes:360,review:'publisher_timezone_conflict'},
  {id:'harn',name:'Harn Museum',url:'https://harn.ufl.edu/calendar/?ical=1',format:'ical',intervalMinutes:360,review:'publisher_timezone_conflict'},
  {id:'florida-museum',name:'Florida Museum',url:'https://www.floridamuseum.ufl.edu/calendar/',format:'jsonld',intervalMinutes:360},
  {id:'city',name:'Gainesville City',url:'https://www.gainesvillefl.gov/Events-directory',format:'city',intervalMinutes:360,timezone:'America/New_York'},
  {id:'bo-diddley',name:'Bo Diddley Plaza',url:'https://www.gainesvillefl.gov/Venues/Bo-Diddley-Plaza',format:'city',intervalMinutes:360,timezone:'America/New_York'},
  {id:'gainesville-shows',name:'GainesvilleShows',url:'https://www.gainesvilleshows.com/upcoming',format:'shows',intervalMinutes:360,timezone:'America/New_York'},
];
export const instagramAccounts = [
  'ufstudentengagement','floridagators','ufstudentgov','reitzunion','ufrecsports','uflib',
  'ufsotd','gatorsstudents','ufstudentlife','ufswe','nsslhagators','swamprecordsuf',
  'ufswamphacks','fieldandforkuf','ufrecoutdoors','ufpanhellenic','uf.sho','dmatuf',
  'ufsurf','ufl_inchaarg','hcgatorgrowl','floridabluekey','flcicerones','gatorsmbk',
  'gatorsvba','gatorsfb','gatorsgym','gatorssoccer','gatorslax','gatorstf','gatorscheer','gatorsswimdv',
] as const;
export const unavailableSources = [
  {id:'yikyak',reason:'Preserved authenticated research experiment; no unattended production connector or platform access configured.'},
  {id:'recsports',reason:'No verified calendar/feed; research encountered TLS failures.'},
  {id:'dining',reason:'Research stopped at robots exclusion; no approved feed configured.'},
  {id:'athletics',reason:'No licensed schedule feed configured; watchlisted Instagram accounts are separate.'},
  {id:'reddit',reason:'Approved API access not configured.'},
  {id:'discord',reason:'Authorized announcement bot/channel not configured.'},
];

export function sourceUrl(source: Source, now: Date, page = 1) {
  const day = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const end = new Date(now.getTime() + 8 * 86400000).toISOString().slice(0,10);
  if (source.format === 'livewhale') return `${source.url}/start_date/${day}/end_date/${end}/paginate/100?page=${page}`;
  if (source.format === 'tribe') return `${source.url}?per_page=50&start_date=${day}&end_date=${end}&page=${page}`;
  return source.url;
}
