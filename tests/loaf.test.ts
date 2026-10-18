import {createRequire} from 'node:module';
import {describe,expect,it,vi} from 'vitest';
import {checkSlice,createLoafChallenge,mintSliceToken,type SlicePoint} from '../src/lib/auth/loaf';
const action=createRequire(import.meta.url)('../auth0/actions/pre-user-registration.cjs') as {onExecutePreUserRegistration:(event:unknown,api:unknown)=>Promise<void>};

const secret='test-loaf-secret',now=Date.UTC(2026,9,17,20,0,0);
// A hand-drawn cut: wobbles around the line and speeds up and slows down.
function handTrace(cut:number,{points=30,duration=900,from=-0.05,to=1.05}={}):SlicePoint[]{
 return Array.from({length:points},(_,i)=>{const f=i/(points-1);return {x:cut+Math.sin(i*1.7)*0.02,y:from+(to-from)*f,t:Math.round(duration*(f*f*(3-2*f)))+i};});
}
const cutOf=(challenge:string)=>Number(challenge.split('.')[1])/100;

describe('BreadPass loaf slice check',()=>{
 it('accepts a human-looking cut through the marked spot, once',()=>{
  const {challenge,cut}=createLoafChallenge(secret,now);
  expect(cut).toBe(cutOf(challenge));
  expect(checkSlice(secret,challenge,handTrace(cut),now)).toEqual({ok:true});
  expect(checkSlice(secret,challenge,handTrace(cut),now)).toEqual({ok:false,reason:'replayed'});
 });
 it('rejects tampered, expired, and unsigned challenges',()=>{
  const {challenge,cut}=createLoafChallenge(secret,now);
  const [id,,exp,sig]=challenge.split('.');
  expect(checkSlice(secret,`${id}.50.${exp}.${sig}`,handTrace(0.5),now)).toEqual(cut===0.5?{ok:true}:{ok:false,reason:'signature'});
  expect(checkSlice('other-secret',challenge,handTrace(cut),now)).toEqual({ok:false,reason:'signature'});
  expect(checkSlice(secret,challenge,handTrace(cut),now+121_000)).toEqual({ok:false,reason:'expired'});
  expect(checkSlice(secret,undefined,handTrace(cut),now)).toEqual({ok:false,reason:'missing'});
 });
 it('rejects cuts in the wrong place, partial cuts, and impossible speeds',()=>{
  const fresh=()=>createLoafChallenge(secret,now);
  let c=fresh();expect(checkSlice(secret,c.challenge,handTrace(c.cut>0.5?0.1:0.9),now)).toEqual({ok:false,reason:'position'});
  c=fresh();expect(checkSlice(secret,c.challenge,handTrace(c.cut,{to:0.5}),now)).toEqual({ok:false,reason:'partial'});
  c=fresh();expect(checkSlice(secret,c.challenge,handTrace(c.cut,{duration:60}),now)).toEqual({ok:false,reason:'speed'});
  c=fresh();expect(checkSlice(secret,c.challenge,handTrace(c.cut,{points:4}),now)).toEqual({ok:false,reason:'points'});
 });
 it('rejects a perfectly straight, constant-speed scripted line',()=>{
  const {challenge,cut}=createLoafChallenge(secret,now);
  const robot=Array.from({length:30},(_,i)=>({x:cut,y:-0.05+i*(1.1/29),t:i*30}));
  expect(checkSlice(secret,challenge,robot,now)).toEqual({ok:false,reason:'robotic'});
 });
});

describe('Auth0 Pre User Registration Action',()=>{
 const run=async(email:string,loafSlice:string|undefined,secrets={LOAF_SECRET:secret})=>{
  const api={access:{deny:vi.fn()},user:{setUserMetadata:vi.fn()}};
  await action.onExecutePreUserRegistration({user:{email,user_metadata:loafSlice?{loaf_slice:loafSlice}:{}},secrets},api);
  return api;
 };
 it('accepts a fresh slice token minted by the app for the same email',async()=>{
  vi.useFakeTimers();vi.setSystemTime(now);
  const api=await run('Albert@UFL.edu',mintSliceToken(secret,'albert@ufl.edu',now));
  expect(api.access.deny).not.toHaveBeenCalled();
  expect(api.user.setUserMetadata).toHaveBeenCalledWith('human_check','loaf_slice');
  vi.useRealTimers();
 });
 it('denies sign-ups that skipped the slice, reused another email, expired, or are not UF',async()=>{
  vi.useFakeTimers();vi.setSystemTime(now);
  expect((await run('albert@ufl.edu',undefined)).access.deny).toHaveBeenCalledWith('no_loaf',expect.any(String));
  expect((await run('bob@ufl.edu',mintSliceToken(secret,'albert@ufl.edu',now))).access.deny).toHaveBeenCalledWith('no_loaf',expect.any(String));
  expect((await run('albert@ufl.edu',mintSliceToken(secret,'albert@ufl.edu',now-301_000))).access.deny).toHaveBeenCalledWith('no_loaf',expect.any(String));
  expect((await run('albert@ufl.edu',mintSliceToken(secret,'albert@ufl.edu',now),{LOAF_SECRET:''})).access.deny).toHaveBeenCalledWith('no_loaf',expect.any(String));
  expect((await run('albert@gmail.com',mintSliceToken(secret,'albert@gmail.com',now))).access.deny).toHaveBeenCalledWith('not_uf',expect.any(String));
  vi.useRealTimers();
 });
});
