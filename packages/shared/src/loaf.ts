// BreadPass "slice the loaf" gesture rules, shared by the server check (src/lib/auth/loaf.ts) and the
// web and mobile slicers, so the loaf only says "Sliced!" for a cut the server will also accept.
// Points are normalized to the loaf box: x and y from 0 to 1, t in milliseconds.
export type SlicePoint={x:number;y:number;t:number};
export type SliceFailure='points'|'time'|'speed'|'partial'|'position'|'robotic';

const median=(values:number[])=>{const s=[...values].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};

// cutAt is where the knife went (median x). It is also returned for a full cut in the wrong spot,
// so the slicers can split the loaf there and show the miss.
export function checkSliceGesture(cut:number,trace:unknown):{ok:true;cutAt:number}|{ok:false;reason:SliceFailure;cutAt?:number}{
 // Fast mobile swipes can deliver only a few move events plus touch-down and release.
 if(!Array.isArray(trace)||trace.length<4||trace.length>400)return {ok:false,reason:'points'};
 const points=trace as SlicePoint[];
 if(!points.every(p=>p&&[p.x,p.y,p.t].every(Number.isFinite)&&p.x>=-0.2&&p.x<=1.2&&p.y>=-0.2&&p.y<=1.2))return {ok:false,reason:'points'};
 for(let i=1;i<points.length;i++)if(points[i].t<=points[i-1].t)return {ok:false,reason:'time'};
 const duration=points[points.length-1].t-points[0].t;
 if(duration<100||duration>15000)return {ok:false,reason:'speed'};
 const ys=points.map(p=>p.y);
 if(Math.min(...ys)>0.15||Math.max(...ys)<0.85)return {ok:false,reason:'partial'};
 const xs=points.map(p=>p.x),cutAt=Math.min(0.98,Math.max(0.02,median(xs)));
 if(median(xs.map(x=>Math.abs(x-cut)))>0.08)return {ok:false,reason:'position',cutAt};
 // A perfectly straight line drawn at perfectly constant speed is a script, not a hand.
 const spread=Math.max(...xs)-Math.min(...xs);
 const speeds=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)/(p.t-points[i].t));
 const mean=speeds.reduce((a,b)=>a+b,0)/speeds.length;
 const cv=mean>0?Math.sqrt(speeds.reduce((a,s)=>a+(s-mean)**2,0)/speeds.length)/mean:0;
 if(spread<0.002&&cv<0.05)return {ok:false,reason:'robotic'};
 return {ok:true,cutAt};
}

export function sliceHint(reason:SliceFailure):string{
 if(reason==='position')return 'Missed the dotted line! Grab a new loaf and try again.';
 if(reason==='partial')return 'Cut all the way through, top to bottom.';
 if(reason==='speed')return 'Slow down a little, like a real knife.';
 return 'That didn’t look like a slice. Try again.';
}
