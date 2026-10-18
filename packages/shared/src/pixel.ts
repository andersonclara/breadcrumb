export const avatarOptions = {
  skin: ['#F1C7A0', '#DDA77E', '#BD8058', '#8E543A', '#5C382A'],
  hair: ['#382C2B', '#6F4434', '#B77D3E', '#E4C979', '#CC88A6', '#7799BC'],
  shirt: ['#EE896A', '#68B67F', '#689ECB', '#F5C45C', '#B18BC9', '#FFF0CB'],
  pants: ['#354356', '#5A6656', '#755347', '#3E3035'],
  hairstyle: ['short', 'long', 'curly', 'buzz'],
  top: ['tee', 'hoodie', 'varsity'],
  accessory: ['none', 'cap', 'beanie', 'glasses'],
} as const;
export type AvatarConfig = { skin: number; hair: number; shirt: number; pants: number; hairstyle: number; top: number; accessory: number };
export const defaultAvatar: AvatarConfig = { skin: 1, hair: 0, shirt: 0, pants: 0, hairstyle: 0, top: 0, accessory: 0 };
export function validAvatar(value: unknown): value is AvatarConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 7 && Object.entries(avatarOptions).every(([key, options]) => Number.isInteger(v[key]) && (v[key] as number) >= 0 && (v[key] as number) < options.length);
}
export type PixelRect = { x: number; y: number; w: number; h: number; color: string };
export function avatarPixels(config: AvatarConfig = defaultAvatar, frame = 0): PixelRect[] {
 const a=validAvatar(config)?config:defaultAvatar;
 const skin=avatarOptions.skin[a.skin],hair=avatarOptions.hair[a.hair],shirt=avatarOptions.shirt[a.shirt],pants=avatarOptions.pants[a.pants];
 const shade=(hex:string,amount:number)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+amount)).toString(16).padStart(2,'0')).join('');
 const pixels:PixelRect[]=[];
 const r=(x:number,y:number,w:number,h:number,color:string)=>pixels.push({x:x/2,y:y/2,w:w/2,h:h/2,color});
 const ink='#493E48',cream='#FFF1DA',hairDark=shade(hair,-22),hairLight=shade(hair,30),skinShadow=shade(skin,-22),shirtDark=shade(shirt,-28),shirtLight=shade(shirt,25);
 const step=frame===1?1:0,bob=step;
 // Short legs, tiny sneakers, and a softly shaded, rounded outfit.
 r(10,38,12,7,shade(pants,-18));r(11,39,4,6-step,pants);r(18,39,4,5+step,pants);
 r(9,44-step,7,3,ink);r(17,44+step,7,3,ink);r(10,44-step,5,2,cream);r(18,44+step,5,2,cream);
 r(11,44-step,3,1,shirtLight);r(19,44+step,3,1,shirtLight);
 r(10,28,12,2,ink);r(8,30,16,10,ink);r(9,30,14,9,shirt);r(10,31,3,7,shirtLight);r(21,32,2,7,shirtDark);
 r(6,31+step,3,7,shirtDark);r(23,31-step,3,7,shirtDark);
 r(6,36+step,3,3,skinShadow);r(7,36+step,2,2,skin);r(23,36-step,3,3,skinShadow);r(23,36-step,2,2,skin);
 r(13,27,6,4,skinShadow);r(14,27,4,3,skin);
 if(a.top===0){r(6,31+step,3,3,shirt);r(23,31-step,3,3,shirt);r(14,30,4,1,cream);r(15,34,4,3,cream);r(16,34,2,2,'#E8B967');}
 if(a.top===1){r(10,29,3,3,shirtDark);r(19,29,3,3,shirtDark);r(12,31,1,4,cream);r(19,31,1,4,cream);r(12,36,8,2,shirtDark);r(13,36,6,1,shirtLight);}
 if(a.top===2){r(6,31+step,3,5,cream);r(23,31-step,3,5,cream);r(15,30,2,9,cream);r(19,32,2,3,cream);r(9,38,14,1,cream);r(7,35+step,2,1,shirt);r(23,35-step,2,1,shirt);}
 // A larger chibi head with stepped corners, ears, eye glints, and rosy cheeks.
 const h=(x:number,y:number,w:number,height:number,color:string)=>r(x,y+bob,w,height,color);
 h(9,3,14,2,hairDark);h(6,5,20,3,hairDark);h(5,8,22,15,hairDark);
 if(a.hairstyle===1){h(4,11,4,20,hairDark);h(24,11,4,20,hairDark);h(5,13,2,16,hair);h(25,13,2,16,hair);h(6,29,3,2,hairLight);h(23,29,3,2,hairLight);}
 h(7,12,18,12,skinShadow);h(9,10,14,16,skinShadow);h(11,25,10,2,skinShadow);
 h(8,12,16,11,skin);h(10,11,12,14,skin);h(12,25,8,1,skin);
 h(5,17,3,5,skinShadow);h(6,18,2,3,skin);h(24,17,3,5,skinShadow);h(24,18,2,3,skin);
 h(10,16,4,5,ink);h(19,16,4,5,ink);h(10,16,2,2,cream);h(19,16,2,2,cream);h(12,19,1,1,'#9B7D85');h(21,19,1,1,'#9B7D85');
 h(8,22,4,2,shade(skin,-4));h(9,22,3,1,'#D48B83');h(21,22,3,1,'#D48B83');
 h(15,22,2,1,skinShadow);h(14,24,1,1,'#A9676A');h(17,24,1,1,'#A9676A');h(15,25,2,1,'#A9676A');
 // Each haircut has a distinct silhouette and highlighted strands.
 h(7,6,18,6,hair);h(9,5,14,3,hair);h(8,7,8,2,hairLight);
 if(a.hairstyle===0){h(6,10,4,5,hair);h(10,10,5,3,hair);h(15,10,4,5,hair);h(19,10,5,2,hair);h(24,10,2,6,hair);h(10,8,2,2,hairLight);}
 if(a.hairstyle===1){h(7,10,4,6,hair);h(11,10,3,3,hair);h(20,10,5,6,hair);h(17,10,3,2,hair);h(7,10,1,4,hairLight);h(23,9,1,5,hairLight);}
 if(a.hairstyle===2){for(const [x,y] of [[5,7],[8,4],[13,3],[18,4],[23,7],[5,12],[23,12],[10,10],[17,10]]){h(x,y,4,4,hairDark);h(x,y,3,3,hair);h(x,y,2,1,hairLight);}}
 if(a.hairstyle===3){h(7,10,18,2,hair);h(6,12,2,3,hair);h(24,12,2,3,hair);h(11,7,1,1,hairLight);h(17,8,1,1,hairLight);h(21,6,1,1,hairLight);}
 if(a.accessory===1){h(8,3,16,3,shirtDark);h(6,6,20,5,shirt);h(9,4,12,3,shirt);h(7,7,5,2,shirtLight);h(4,11,24,2,shirtDark);h(5,11,14,1,shirtLight);h(18,6,3,3,cream);}
 if(a.accessory===2){h(13,0,6,3,shirtLight);h(8,3,16,2,shirtDark);h(6,5,20,5,shirt);h(5,9,22,4,shirtDark);h(6,10,20,2,shirtLight);for(const x of [9,13,17,21])h(x,5,1,4,shirtLight);h(18,10,3,2,cream);}
 if(a.accessory===3){h(8,16,7,1,ink);h(8,17,1,5,ink);h(14,17,1,5,ink);h(9,22,5,1,ink);h(18,16,7,1,ink);h(18,17,1,5,ink);h(24,17,1,5,ink);h(19,22,5,1,ink);h(15,18,3,1,ink);h(9,17,2,1,'#BEE7DF');h(19,17,2,1,'#BEE7DF');}
 return pixels;
}
export function breadPixels(state: 'crumb' | 'rising' | 'full_loaf' | 'stale' | 'burnt'): PixelRect[] {
 if(state==='crumb')return [{x:5,y:7,w:6,h:5,color:'#D98A36'},{x:6,y:7,w:4,h:4,color:'#FFF5C4'},{x:7,y:8,w:3,h:2,color:'#FFC65A'},{x:12,y:12,w:2,h:2,color:'#FFC65A'}];
 // Golden fragments grow into a smaller rising toast, then a full golden loaf.
 const golden:PixelRect[]=[{x:5,y:7,w:18,h:19,color:'#D98A36'},{x:3,y:5,w:8,h:7,color:'#D98A36'},{x:17,y:5,w:8,h:7,color:'#D98A36'},{x:6,y:7,w:16,h:18,color:'#FFF5C4'},{x:4,y:6,w:7,h:5,color:'#FFF5C4'},{x:18,y:6,w:6,h:5,color:'#FFF5C4'},{x:8,y:10,w:12,h:13,color:'#FFC65A'},{x:6,y:8,w:4,h:4,color:'#FFC65A'},{x:19,y:8,w:3,h:4,color:'#FFC65A'}];
 const scale=state==='rising'?.72:1;
 return golden.map(p=>({...p,color:state==='burnt'?({'#D98A36':'#302925','#FFF5C4':'#76503A','#FFC65A':'#45332C'}[p.color]??p.color):p.color,x:(p.x*.6-.4-8)*scale+8,y:(p.y*.6-1.3-8)*scale+8,w:p.w*.6*scale,h:p.h*.6*scale}));
}
