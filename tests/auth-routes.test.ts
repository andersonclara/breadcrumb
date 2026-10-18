import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({login:vi.fn(),signup:vi.fn(),reset:vi.fn(),config:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('../src/lib/supabase/server',()=>({createClient:async()=>({})}));
vi.mock('../src/lib/auth/password',()=>({passwordLogin:mocks.login,createAuth0Account:mocks.signup}));
vi.mock('../src/lib/auth/auth0',()=>({auth0Config:mocks.config,auth0ResetPassword:mocks.reset,trustedClientIp:()=>null}));
import {POST as login,OPTIONS} from '../src/app/api/auth/password/route';
import {POST as signup,GET as config} from '../src/app/api/auth/signup/route';
import {POST as reset} from '../src/app/api/auth/reset-password/route';
import {GET as loaf} from '../src/app/api/auth/loaf/route';
const request=(path:string,body:string,origin?:string)=>new Request(`http://localhost:3000/api/auth/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body});
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('NODE_ENV','development');vi.stubEnv('LOAF_SECRET','');
 mocks.config.mockReturnValue({domain:'example.auth0.com'});
 mocks.login.mockResolvedValue({session:{access_token:'session',refresh_token:'refresh'},next:'/'});
 mocks.signup.mockResolvedValue({session:{access_token:'session',refresh_token:'refresh'},next:'/profile?setup=1'});
 mocks.reset.mockResolvedValue({});
});
afterEach(()=>vi.unstubAllEnvs());
describe('mobile authentication routes',()=>{
 it('accepts native login without Origin, returns uncached session tokens',async()=>{
  const response=await login(request('password',JSON.stringify({identifier:'albert@ufl.edu',password:'password'})));
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect((await response.json()).session.refresh_token).toBe('refresh');
  expect(mocks.login).toHaveBeenCalledWith({},'albert@ufl.edu','password',null);
 });
 it('supports Expo web signup, config, loaf, and preflight on localhost',async()=>{
  const origin='http://localhost:8081';
  const response=await signup(request('signup',JSON.stringify({email:'albert@ufl.edu'}),origin));
  expect(response.status).toBe(200);expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  for(const handler of [config,loaf]){
   const response=await handler(new Request('http://localhost:3000/api/auth/signup',{headers:{Origin:origin}}));
   expect(response.status).toBe(200);expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  }
  expect((await OPTIONS(new Request('http://localhost:3000/api/auth/password',{method:'OPTIONS',headers:{Origin:origin}}))).status).toBe(204);
 });
 it('rejects foreign browser origins before any password or signup operation',async()=>{
  for(const handler of [login,signup,reset])expect((await handler(request('signup','{}','https://evil.test'))).status).toBe(403);
  expect(mocks.login).not.toHaveBeenCalled();expect(mocks.signup).not.toHaveBeenCalled();expect(mocks.reset).not.toHaveBeenCalled();
 });
 it('does not enable the Expo browser origin allowance in production',async()=>{
  vi.stubEnv('NODE_ENV','production');
  expect((await login(request('password','{}','http://localhost:8081'))).status).toBe(403);
 });
 it('rejects malformed and oversized signup input',async()=>{
  for(const body of ['{','null','x'.repeat(20001)])expect((await signup(request('signup',body))).status).toBe(400);
  expect(mocks.signup).not.toHaveBeenCalled();
 });
 it('exposes only a public signup mode and preserves email signup when Auth0 is off',async()=>{
  expect(await (await config(new Request('http://localhost:3000/api/auth/signup'))).json()).toEqual({passwordSignup:true});
  mocks.config.mockReturnValue(null);
  expect(await (await signup(request('signup','{}'))).json()).toEqual({mode:'email'});
  expect(mocks.signup).not.toHaveBeenCalled();
 });
 it('sends normalized UF password resets through Auth0 and keeps the response generic',async()=>{
  const response=await reset(request('reset-password',JSON.stringify({email:'ALBERT@UFL.EDU'})));
  expect(response.status).toBe(200);expect(mocks.reset).toHaveBeenCalledWith('albert@ufl.edu');
  expect((await response.json()).message).toContain('If this address has an account');
  expect((await reset(request('reset-password',JSON.stringify({email:'x@gmail.com'})))).status).toBe(400);
 });
 it('returns a recoverable error when the account service fails',async()=>{
  mocks.signup.mockRejectedValue(new Error('private provider details'));
  const response=await signup(request('signup','{}'));
  expect(response.status).toBe(503);expect(await response.text()).not.toContain('private provider details');
 });
});
