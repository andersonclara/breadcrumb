import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {z} from 'zod';
vi.mock('server-only',()=>({}));
import {DEFAULT_GROQ_MODEL,generateAskJSON,getAskModelConfig} from '../src/lib/ai/ask/provider';

const schema=z.object({answer:z.string().max(30)}).strict();
const signal=new AbortController().signal;
let mockFetch:ReturnType<typeof vi.fn>;
const envelope=(content:string,finish_reason='stop')=>new Response(JSON.stringify({choices:[{finish_reason,message:{content}}]}),{headers:{'Content-Type':'application/json'}});
beforeEach(()=>{
  vi.stubEnv('ASK_AI_PROVIDER','');vi.stubEnv('GROQ_API_KEY','test-groq-secret');vi.stubEnv('GROQ_MODEL','');
  vi.stubEnv('GEMINI_API_KEY','test-gemini-secret');vi.stubEnv('GEMINI_MODEL','test-gemini-model');
  mockFetch=vi.fn().mockResolvedValue(envelope('{"answer":"A matching result."}'));vi.stubGlobal('fetch',mockFetch);
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('Ask provider selection',()=>{
  it('includes nullable optional reference fields in the strict provider contract',async()=>{
    mockFetch.mockResolvedValue(envelope('{"resultIndex":null}'));
    await generateAskJSON(z.object({resultIndex:z.number().nullable().optional()}),'rules',{},signal,900);
    const body=JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.response_format.json_schema.schema.required).toContain('resultIndex');
  });
  it('prefers Groq GPT-OSS 120B when its key is present',()=>{
    expect(getAskModelConfig()).toEqual({provider:'groq',model:DEFAULT_GROQ_MODEL});
  });
  it('supports an explicit provider and model override',()=>{
    vi.stubEnv('GROQ_MODEL','openai/gpt-oss-20b');expect(getAskModelConfig()?.model).toBe('openai/gpt-oss-20b');
    vi.stubEnv('ASK_AI_PROVIDER','gemini');expect(getAskModelConfig()).toEqual({provider:'gemini',model:'test-gemini-model'});
  });
  it('uses Gemini when there is no Groq key',()=>{
    vi.stubEnv('GROQ_API_KEY','');expect(getAskModelConfig()?.provider).toBe('gemini');
  });
  it('fails closed for an invalid or unconfigured explicit provider',()=>{
    vi.stubEnv('ASK_AI_PROVIDER','unknown');expect(getAskModelConfig()).toBeNull();
    vi.stubEnv('ASK_AI_PROVIDER','groq');vi.stubEnv('GROQ_API_KEY','');expect(getAskModelConfig()).toBeNull();
  });
});
describe('bounded Groq JSON transport',()=>{
  it('uses strict schema responses with separate system/data messages and no reasoning disclosure',async()=>{
    expect(await generateAskJSON(schema,'System rules',{message:'Question'},signal,900)).toEqual({answer:'A matching result.'});
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url,request]=mockFetch.mock.calls[0];const body=JSON.parse(request.body);
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');expect(request.redirect).toBe('error');
    expect(request.headers.Authorization).toBe('Bearer test-groq-secret');expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(body.model).toBe('openai/gpt-oss-120b');expect(body.max_completion_tokens).toBe(900);
    expect(body.messages).toEqual([{role:'system',content:'System rules'},{role:'user',content:'{"message":"Question"}'}]);
    expect(body.response_format.type).toBe('json_schema');expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.additionalProperties).toBe(false);
    expect(body.reasoning_effort).toBe('low');expect(body.include_reasoning).toBe(false);
    expect(request.body).not.toContain('test-groq-secret');
  });
  it('preserves local Zod validation even for a claimed successful completion',async()=>{
    mockFetch.mockResolvedValue(envelope('{"answer":"Too long: '+ 'a'.repeat(40)+'"}'));
    await expect(generateAskJSON(schema,'rules',{},signal,900)).rejects.toThrow();
  });
  it.each(['length','content_filter','tool_calls'])('rejects incomplete/non-answer finish reason %s',async reason=>{
    mockFetch.mockResolvedValue(envelope('{"answer":"Partial"}',reason));
    await expect(generateAskJSON(schema,'rules',{},signal,900)).rejects.toThrow('ask_model_incomplete_response');
  });
  it('rejects refusals without treating them as factual answers',async()=>{
    mockFetch.mockResolvedValue(new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:null,refusal:'Cannot comply'}}]})));
    await expect(generateAskJSON(schema,'rules',{},signal,900)).rejects.toThrow('ask_model_incomplete_response');
  });
  it('does not expose an upstream error body or retry the request',async()=>{
    mockFetch.mockResolvedValue(new Response('test-groq-secret and prompt text',{status:429}));
    await expect(generateAskJSON(schema,'rules',{},signal,900)).rejects.toThrow('ask_groq_unavailable_429');expect(mockFetch).toHaveBeenCalledOnce();
  });
  it('bounds response bytes',async()=>{
    mockFetch.mockResolvedValue(new Response('x'.repeat(65537)));
    await expect(generateAskJSON(schema,'rules',{},signal,900)).rejects.toThrow('ask_model_response_too_large');
  });
});
