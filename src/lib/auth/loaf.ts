import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {checkSliceGesture} from '@breadcrumb/shared/loaf';

// BreadPass "slice the loaf": a light human check before Auth0 sign-up. The student drags a knife
// through a pixel loaf at a server-chosen spot; the server checks the gesture and mints a short-lived
// slice token that the Auth0 Pre User Registration Action re-verifies with the same LOAF_SECRET.
// It stops casual scripts and direct calls to Auth0's public signup endpoint, not a determined bot.
export type {SlicePoint} from '@breadcrumb/shared/loaf';
export const CHALLENGE_SECONDS=120,TOKEN_SECONDS=300;

export function loafSecret(env:Record<string,string|undefined>=process.env){return env.LOAF_SECRET?.trim()||null;}
const sign=(secret:string,message:string)=>createHmac('sha256',secret).update(message).digest('base64url');
function sameSignature(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}

export function createLoafChallenge(secret:string,now=Date.now()){
 const id=randomBytes(16).toString('base64url');
 // Whole-number percent in the token (the token is dot-separated); a 0–1 fraction for the UI.
 const percent=30+Math.floor(Math.random()*41);
 const exp=Math.floor(now/1000)+CHALLENGE_SECONDS;
 return {challenge:`${id}.${percent}.${exp}.${sign(secret,`loaf:${id}.${percent}.${exp}`)}`,cut:percent/100};
}

// One-time use per server; the short expiry bounds reuse across serverless instances.
const used=new Map<string,number>();
function claim(id:string,exp:number,nowSeconds:number){
 for(const [key,expiry] of used)if(expiry<nowSeconds)used.delete(key);
 if(used.has(id))return false;
 used.set(id,exp);return true;
}


export function checkSlice(secret:string,challenge:unknown,trace:unknown,now=Date.now()):{ok:true}|{ok:false;reason:string}{
 if(typeof challenge!=='string')return {ok:false,reason:'missing'};
 const parts=challenge.split('.'),[id,cutText,expText,sig]=parts;
 if(parts.length!==4||!id||!cutText||!expText||!sig||!sameSignature(sig,sign(secret,`loaf:${id}.${cutText}.${expText}`)))return {ok:false,reason:'signature'};
 const cut=Number(cutText)/100,exp=Number(expText),nowSeconds=Math.floor(now/1000);
 if(!Number.isInteger(exp)||exp<nowSeconds||exp>nowSeconds+CHALLENGE_SECONDS)return {ok:false,reason:'expired'};
 if(cut<0.3||cut>0.7)return {ok:false,reason:'signature'};
 // Same gesture rules the slicers show to the student (packages/shared/src/loaf.ts).
 const gesture=checkSliceGesture(cut,trace);
 if(!gesture.ok)return {ok:false,reason:gesture.reason};
 if(!claim(id,exp,nowSeconds))return {ok:false,reason:'replayed'};
 return {ok:true};
}

// Bound to the normalized email so a token cannot be reused for another sign-up.
export function mintSliceToken(secret:string,email:string,now=Date.now()){
 const exp=Math.floor(now/1000)+TOKEN_SECONDS;
 return `${exp}.${sign(secret,`signup:${email.toLowerCase()}:${exp}`)}`;
}
