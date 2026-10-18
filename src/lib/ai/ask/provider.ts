import 'server-only';
import {z} from 'zod';
import {ThinkingLevel} from '@google/genai';
import {getGemini,getGeminiModel} from '@/lib/ai/client';

export const DEFAULT_GROQ_MODEL='openai/gpt-oss-120b';
export function getAskModelConfig() {
  const provider=process.env.ASK_AI_PROVIDER||(process.env.GROQ_API_KEY?'groq':'gemini');
  if(provider==='groq'&&process.env.GROQ_API_KEY)return {provider,model:process.env.GROQ_MODEL||DEFAULT_GROQ_MODEL} as const;
  if(provider==='gemini'&&process.env.GEMINI_API_KEY&&process.env.GEMINI_MODEL)return {provider,model:getGeminiModel()} as const;
  return null;
}
const completionSchema=z.object({choices:z.array(z.object({
  finish_reason:z.string(),message:z.object({content:z.string().max(32768).nullable(),refusal:z.string().nullish()}),
})).length(1)});

async function groqJSON(model:string,instruction:string,data:unknown,schema:unknown,signal:AbortSignal,maxTokens:number) {
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(18000)]),
    headers:{Authorization:`Bearer ${process.env.GROQ_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model,messages:[{role:'system',content:instruction},{role:'user',content:JSON.stringify(data)}],
      response_format:{type:'json_schema',json_schema:{name:'ask_response',strict:true,schema}},
      max_completion_tokens:maxTokens,temperature:0,stream:false,
      ...(/^openai\/gpt-oss-(20|120)b$/.test(model)?{reasoning_effort:'low',include_reasoning:false}:{}),
    }),
  });
  if(!response.ok){await response.body?.cancel();throw new Error(`ask_groq_unavailable_${response.status}`);}
  // Bound the provider envelope as well as the generated content. Never log an
  // upstream response body: it can contain prompt text or internal diagnostics.
  const reader=response.body?.getReader();if(!reader)throw new Error('ask_model_empty_response');
  const chunks:Uint8Array[]=[];let size=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>65536){await reader.cancel();throw new Error('ask_model_response_too_large');}chunks.push(value);}
  }finally{reader.releaseLock();}
  const result=completionSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8'))).choices[0];
  if(result.finish_reason!=='stop'||result.message.refusal||!result.message.content)throw new Error('ask_model_incomplete_response');
  return result.message.content;
}

export async function generateAskJSON<T>(schema:z.ZodType<T>,instruction:string,data:unknown,signal:AbortSignal,maxOutputTokens:number):Promise<T> {
  const config=getAskModelConfig();if(!config)throw new Error('ask_model_unconfigured');
  const jsonSchema=z.toJSONSchema(schema);
  // Strict providers require even nullable/optional properties in required.
  function requireProperties(node:unknown) {
    if(!node||typeof node!=='object')return;
    const value=node as Record<string,unknown>;
    if(value.properties&&typeof value.properties==='object')value.required=Object.keys(value.properties);
    for(const child of Object.values(value))if(Array.isArray(child))child.forEach(requireProperties);else requireProperties(child);
  }
  requireProperties(jsonSchema);
  let content:string;
  if(config.provider==='groq')content=await groqJSON(config.model,instruction,data,jsonSchema,signal,maxOutputTokens);
  else {
    const result=await getGemini().models.generateContent({model:config.model,contents:JSON.stringify(data),config:{
      systemInstruction:instruction,responseMimeType:'application/json',responseJsonSchema:jsonSchema,
      ...(/^gemini-[34]/.test(config.model)?{thinkingConfig:{thinkingLevel:ThinkingLevel.LOW}}:{}),
      temperature:0,maxOutputTokens,abortSignal:signal,httpOptions:{timeout:18000,retryOptions:{attempts:1}},
    }});
    content=result.text??'{}';
  }
  return schema.parse(JSON.parse(content));
}
