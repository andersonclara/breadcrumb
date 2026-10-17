import {z} from 'zod';
import {assertCanAct} from '@/lib/guard';
import {inCampus,validAvatar} from '@breadcrumb/shared';
const coordinate={latitude:z.number().finite(),longitude:z.number().finite()};
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('community_create'),data:z.object({name:z.string().trim().min(3).max(48),description:z.string().trim().max(280),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/)})}),
 z.object({action:z.enum(['community_join','community_leave']),data:z.object({community_id:z.string().regex(/^[a-z][a-z0-9-]{0,79}$/)})}),
 z.object({action:z.literal('avatar'),data:z.custom(validAvatar)}),
 z.object({action:z.literal('create'),data:z.object({...coordinate,title:z.string().trim().min(3).max(180),description:z.string().max(2000).optional(),community_id:z.string().regex(/^[a-z][a-z0-9-]{0,79}$/).optional(),category:z.enum(['event','freebie','crowd','construction','hazard','sighting']),join_id:z.uuid().optional()}).refine(inCampus)}),
 z.object({action:z.literal('vote'),data:z.object({id:z.uuid(),value:z.union([z.literal(1),z.literal(-1)])})}),
 z.object({action:z.literal('report'),data:z.object({id:z.uuid(),reason:z.enum(['harassment','privacy','spam','other'])})}),
 z.object({action:z.literal('presence'),data:z.object(coordinate).refine(inCampus)}),
 z.object({action:z.literal('presence_stop'),data:z.object({})}),
 z.object({action:z.literal('friend_request'),data:z.object({code:z.string().trim().regex(/^[a-fA-F0-9]{8}$/)})}),
 z.object({action:z.enum(['friend_accept','friend_remove']),data:z.object({id:z.uuid()})}),
]);
export async function POST(request:Request) {
 try {
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin) return Response.json({error:'Invalid request origin'},{status:403});
  const text=await request.text();
  if(text.length>5000)return Response.json({error:'Request is too large'},{status:413});
  let body:unknown;try{body=JSON.parse(text);}catch{return Response.json({error:'Invalid request'},{status:400});}
  const parsed=input.safeParse(body);
  if(!parsed.success)return Response.json({error:'Check your input and choose a location on the UF map.'},{status:400});
  const {supabase}=await assertCanAct(request);
  const {data,error}=await supabase.rpc('pixel_action',{p_action:parsed.data.action,p_data:parsed.data.data});
  if(error)return Response.json({error:error.code==='P0001'?error.message:'Could not save this change. Check the pixel-world migration and try again.'},{status:error.message.includes('Please wait')?429:400});
  return Response.json(data,{headers:{'Cache-Control':'private, no-store'}});
 } catch(error) {
  if(error instanceof Response)return error;
  return Response.json({error:'Could not connect. Please try again.'},{status:503});
 }
}
