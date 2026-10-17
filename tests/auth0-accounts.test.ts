import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
const mocks=vi.hoisted(()=>({lookup:vi.fn(),createUser:vi.fn(),generateLink:vi.fn(),updateUser:vi.fn(),verifyOtp:vi.fn(),profile:vi.fn(),complete:vi.fn(),fetch:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('../src/lib/supabase/admin',()=>({createAdminClient:()=>({rpc:mocks.lookup,auth:{admin:{createUser:mocks.createUser,generateLink:mocks.generateLink,updateUserById:mocks.updateUser}}})}));
import {createAuth0Account,passwordLogin} from '../src/lib/auth/password';
const client={auth:{verifyOtp:mocks.verifyOtp},rpc:mocks.complete,from:()=>({select:()=>({eq:()=>({single:mocks.profile})})})} as unknown as SupabaseClient;
const json=(status:number,body:unknown)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
const calls=()=>mocks.fetch.mock.calls.map(([url])=>new URL(String(url)).pathname);
const signup={email:'Albert@UFL.edu',username:'Cool_Albert',password:'bread-loaf-42',confirm:'bread-loaf-42'};
beforeEach(()=>{
 vi.resetAllMocks();
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','server-test-key');vi.stubEnv('AUTH0_DOMAIN','breadcrumb.test.auth0.com');vi.stubEnv('AUTH0_CLIENT_ID','client');vi.stubEnv('AUTH0_CLIENT_SECRET','secret');
 vi.stubGlobal('fetch',mocks.fetch);
 mocks.fetch.mockImplementation((url:string)=>{const path=new URL(url).pathname;
  if(path==='/dbconnections/signup')return json(200,{_id:'abc',email:'albert@ufl.edu'});
  if(path==='/oauth/token')return json(200,{access_token:'access',id_token:'id'});
  if(path==='/userinfo')return json(200,{sub:'auth0|abc',email:'albert@ufl.edu'});
  return json(404,{});});
 mocks.lookup.mockResolvedValue({data:null,error:null});
 mocks.createUser.mockResolvedValue({data:{},error:null});
 mocks.generateLink.mockResolvedValue({data:{user:{id:'user',app_metadata:{}},properties:{hashed_token:'hash'}},error:null});
 mocks.updateUser.mockResolvedValue({data:{},error:null});
 mocks.verifyOtp.mockResolvedValue({data:{session:{access_token:'session',refresh_token:'refresh'}},error:null});
 mocks.profile.mockResolvedValue({data:{account_completed:true,avatar_completed:true},error:null});
 mocks.complete.mockResolvedValue({data:null,error:null});
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Auth0 username/password accounts',()=>{
 it('rejects bad sign-up input before calling Auth0',async()=>{
  expect((await createAuth0Account(client,{...signup,email:'albert@gmail.com'})).error).toContain('@ufl.edu');
  expect((await createAuth0Account(client,{...signup,username:'a@b'})).error).toContain('username');
  expect((await createAuth0Account(client,{...signup,confirm:'different'})).error).toContain('do not match');
  mocks.lookup.mockResolvedValue({data:'someone@ufl.edu',error:null});
  expect((await createAuth0Account(client,signup)).error).toBe('That username is taken.');
  expect(mocks.fetch).not.toHaveBeenCalled();
 });
 it('creates the Auth0 user, opens the Supabase session, and saves the username',async()=>{
  const result=await createAuth0Account(client,signup,'203.0.113.9');
  expect(result).toEqual({session:{access_token:'session',refresh_token:'refresh'},next:'/profile?setup=1'});
  expect(calls()).toEqual(['/dbconnections/signup','/oauth/token','/userinfo']);
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toMatchObject({email:'albert@ufl.edu',connection:'Username-Password-Authentication',client_id:'client'});
  expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({email:'albert@ufl.edu',email_confirm:true,app_metadata:{auth0_sub:'auth0|abc'}}));
  expect(mocks.verifyOtp).toHaveBeenCalledWith({token_hash:'hash',type:'magiclink'});
  expect(mocks.complete).toHaveBeenCalledWith('complete_account',{p_username:'cool_albert'});
 });
 it('resolves usernames, then checks the password with Auth0 using the student IP',async()=>{
  mocks.lookup.mockResolvedValue({data:'albert@ufl.edu',error:null});
  expect((await passwordLogin(client,'cool_albert','bread-loaf-42','203.0.113.9')).next).toBe('/');
  const [,init]=mocks.fetch.mock.calls[0];const body=JSON.parse(init.body);
  expect(body).toMatchObject({grant_type:'http://auth0.com/oauth/grant-type/password-realm',realm:'Username-Password-Authentication',username:'albert@ufl.edu',password:'bread-loaf-42'});
  expect(init.headers['auth0-forwarded-for']).toBe('203.0.113.9');
 });
 it('keeps wrong-password errors generic and opens no session',async()=>{
  mocks.fetch.mockImplementation(()=>json(403,{error:'invalid_grant',error_description:'Wrong email or password.'}));
  expect(await passwordLogin(client,'albert@ufl.edu','nope')).toEqual({error:'Email/username or password is incorrect.'});
  expect(mocks.verifyOtp).not.toHaveBeenCalled();
 });
 it('only accepts UF users from the Breadcrumb database connection',async()=>{
  mocks.fetch.mockImplementation((url:string)=>new URL(url).pathname==='/userinfo'?json(200,{sub:'google-oauth2|x',email:'albert@ufl.edu'}):json(200,{access_token:'access'}));
  expect((await passwordLogin(client,'albert@ufl.edu','bread-loaf-42')).error).toContain('UF');
  mocks.fetch.mockImplementation((url:string)=>new URL(url).pathname==='/userinfo'?json(200,{sub:'auth0|x',email:'albert@gmail.com'}):json(200,{access_token:'access'}));
  expect((await passwordLogin(client,'albert@ufl.edu','bread-loaf-42')).error).toContain('UF');
  expect(mocks.verifyOtp).not.toHaveBeenCalled();
 });
 it('lists the Auth0 password rules the student missed',async()=>{
  mocks.fetch.mockImplementation(()=>json(400,{name:'PasswordStrengthError',code:'invalid_password',description:{rules:[{message:'At least %d characters in length',format:[8],verified:true},{message:'Contain at least %d of the following %d types of characters:',format:[3,4],verified:false,items:[{message:'lower case letters (a-z)',verified:true},{message:'upper case letters (A-Z)',verified:false},{message:'numbers (i.e. 0-9)',verified:false},{message:'special characters (e.g. !@#$%^&*)',verified:false}]}],verified:false}}));
  const {error}=await createAuth0Account(client,signup);
  expect(error).toBe('Choose a stronger password. It needs: Contain at least 3 of the following 4 types of characters: upper case letters (A-Z), numbers (i.e. 0-9), special characters (e.g. !@#$%^&*).');
 });
 it('explains duplicate accounts',async()=>{
  mocks.fetch.mockImplementation(()=>json(400,{code:'invalid_signup',description:'Invalid sign up'}));
  expect((await createAuth0Account(client,signup)).error).toContain('already exists');
 });
});
