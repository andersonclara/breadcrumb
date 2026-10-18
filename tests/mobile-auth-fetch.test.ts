import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getSession:vi.fn(),fetch:vi.fn()}));
vi.mock('../apps/mobile/src/lib/supabase',()=>({supabase:{auth:{getSession:mocks.getSession}}}));
vi.mock('expo-constants',()=>({default:{expoConfig:{hostUri:'192.168.1.50:8081'}}}));
import {apiFetch} from '../apps/mobile/src/lib/api';
beforeEach(()=>{
 vi.resetAllMocks();vi.stubGlobal('__DEV__',true);vi.stubEnv('EXPO_PUBLIC_API_URL','http://localhost:3000');
 vi.stubGlobal('fetch',mocks.fetch);
 mocks.fetch.mockResolvedValue(new Response('{}'));
 mocks.getSession.mockResolvedValue({data:{session:{access_token:'saved-token'}},error:null});
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('mobile public authentication requests',()=>{
 it('loads bread and submits credentials without waiting for a saved session',async()=>{
  mocks.getSession.mockReturnValue(new Promise(()=>{}));
  for(const path of ['/api/auth/loaf','/api/auth/signup','/api/auth/password','/api/auth/reset-password'] as const)await apiFetch(path);
  expect(mocks.getSession).not.toHaveBeenCalled();
  expect(mocks.fetch).toHaveBeenCalledTimes(4);
  expect(mocks.fetch.mock.calls[0][0]).toBe('http://192.168.1.50:3000/api/auth/loaf');
  expect(mocks.fetch.mock.calls[0][1].headers.get('Authorization')).toBeNull();
 });
 it('still authenticates private campus operations',async()=>{
  await apiFetch('/api/world');
  expect(mocks.getSession).toHaveBeenCalledOnce();
  expect(mocks.fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer saved-token');
 });
 it('keeps a session failure from leaking into public sign-in requests',async()=>{
  mocks.getSession.mockResolvedValue({data:{session:null},error:new Error('expired')});
  await apiFetch('/api/auth/password');
  await expect(apiFetch('/api/world')).rejects.toThrow('Please sign in again.');
 });
 it('keeps public Ask independent from expired or refreshing sessions',async()=>{
  mocks.getSession.mockReturnValue(new Promise(()=>{}));
  for(const path of ['/api/ask','/api/discover?period=today'] as const)await apiFetch(path);
  expect(mocks.getSession).not.toHaveBeenCalled();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
 });
 it('explains network failures without changing the authentication method',async()=>{
  mocks.fetch.mockRejectedValue(new TypeError('Network request failed'));
  await expect(apiFetch('/api/auth/loaf')).rejects.toThrow('Could not reach sign-in services.');
 });
 it('allows the first development auth requests to finish while Next compiles the routes',async()=>{
  vi.useFakeTimers();
  mocks.fetch.mockImplementation((_url, init: RequestInit)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>resolve(new Response('{}')),20000);
    init.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('aborted'));},{once:true});
  }));
  const requests=Promise.all([apiFetch('/api/auth/loaf'),apiFetch('/api/auth/password',{method:'POST'})]);
  await vi.advanceTimersByTimeAsync(20000);
  expect(await requests).toHaveLength(2);
 });
 it('keeps the production challenge timeout bounded',async()=>{
  vi.stubGlobal('__DEV__',false);vi.useFakeTimers();
  mocks.fetch.mockImplementation((_url, init: RequestInit)=>new Promise((_resolve,reject)=>{
    init.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
  }));
  const result=expect(apiFetch('/api/auth/loaf')).rejects.toThrow('Could not reach sign-in services.');
  await vi.advanceTimersByTimeAsync(8000);
  await result;
 });
});
