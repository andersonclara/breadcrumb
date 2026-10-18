// The free-form post stays intact; its first line supplies the compact map title.
export function postHeadline(body:string){const first=body.trim().split(/\r?\n/)[0].trim();return (first.length>=3?first:body.trim().replace(/\s+/g,' ')).slice(0,180);}
export function submissionTime(value:string){
 return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).format(new Date(value));
}
