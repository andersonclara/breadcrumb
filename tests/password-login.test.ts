import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
const mocks=vi.hoisted(()=>({lookup:vi.fn(),signin:vi.fn(),signout:vi.fn(),profile:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('../src/lib/supabase/admin',()=>({createAdminClient:()=>({rpc:mocks.lookup})}));
import {passwordLogin} from '../src/lib/auth/password';
const client={auth:{signInWithPassword:mocks.signin,signOut:mocks.signout},from:()=>({select:()=>({eq:()=>({single:mocks.profile})})})} as unknown as SupabaseClient;
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','server-test-key');mocks.signin.mockResolvedValue({data:{user:{id:'user',email:'albert@ufl.edu',email_confirmed_at:'2026-10-17'},session:{access_token:'session',refresh_token:'refresh'}},error:null});mocks.profile.mockResolvedValue({data:{account_completed:true,avatar_completed:true},error:null});mocks.lookup.mockResolvedValue({data:'albert@ufl.edu',error:null});});
afterEach(()=>vi.unstubAllEnvs());
describe('password login boundary',()=>{
 it('authenticates email directly without privileged account lookup',async()=>{const result=await passwordLogin(client,'ALBERT@UFL.EDU','my password');expect(result.next).toBe('/');expect(mocks.signin).toHaveBeenCalledWith({email:'albert@ufl.edu',password:'my password'});expect(mocks.lookup).not.toHaveBeenCalled();});
 it('resolves edited usernames only on the server and still checks the password with Supabase',async()=>{await passwordLogin(client,'Cool_Albert','secret password');expect(mocks.lookup).toHaveBeenCalledWith('login_email_for_username',{p_username:'cool_albert'});expect(mocks.signin).toHaveBeenCalledWith({email:'albert@ufl.edu',password:'secret password'});});
 it('keeps email login available while the server key is deferred',async()=>{vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');expect((await passwordLogin(client,'cool_albert','password')).error).toContain('use your UF email');expect(mocks.lookup).not.toHaveBeenCalled();expect((await passwordLogin(client,'albert@ufl.edu','password')).next).toBe('/');});
 it('does not return account emails for unknown usernames',async()=>{mocks.lookup.mockResolvedValue({data:null,error:null});expect(await passwordLogin(client,'unknown','password')).toEqual({error:'Email/username or password is incorrect.'});expect(mocks.signin).not.toHaveBeenCalled();});
 it('requires verified UF ownership even if the provider returns a session',async()=>{mocks.signin.mockResolvedValue({data:{user:{email:'other@gmail.com',email_confirmed_at:'2026-10-17'},session:{}},error:null});expect((await passwordLogin(client,'albert@ufl.edu','password')).error).toContain('confirmed UF');expect(mocks.signout).toHaveBeenCalledOnce();});
 it('routes first-time verified accounts to setup and then avatar creation',async()=>{mocks.profile.mockResolvedValue({data:{account_completed:false,avatar_completed:false}});expect((await passwordLogin(client,'albert@ufl.edu','password')).next).toBe('/profile?setup=1');mocks.profile.mockResolvedValue({data:{account_completed:true,avatar_completed:false}});expect((await passwordLogin(client,'albert@ufl.edu','password')).next).toBe('/profile?setup=1');});
});
