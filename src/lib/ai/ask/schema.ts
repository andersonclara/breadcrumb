import {z} from 'zod';

export const pointSchema=z.object({latitude:z.number().min(29.60).max(29.70),longitude:z.number().min(-82.42).max(-82.28)}).strict();
export const timeSchema=z.object({
  period:z.enum(['now','today','tonight','tomorrow','weekend','next7days','date']),
  date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
}).strict();
const category=z.enum(['event','freebie','crowd','construction','hazard']);
export const constraintsSchema=z.object({
  kind:z.enum(['all','events','crumbs']),time:timeSchema,
  nearPlace:z.string().trim().min(1).max(100).nullable(),
  useUserLocation:z.boolean(),radiusMeters:z.number().int().min(100).max(5000),
  freeOnly:z.boolean(),categories:z.array(category).max(5),
  terms:z.array(z.string().trim().min(1).max(60)).max(6),
}).strict();
export type Constraints=z.infer<typeof constraintsSchema>;
export const referenceSchema=z.object({kind:z.enum(['event','crumb']),id:z.uuid()}).strict();
export const contextSchema=z.object({
  constraints:constraintsSchema,results:z.array(referenceSchema).max(4),
  // Reference place is public campus geography, never a person's GPS position.
  referencePlace:z.string().max(100).nullable(),
}).strict();
export const askRequestSchema=z.object({
  message:z.string().trim().min(1).max(1200),
  context:contextSchema.optional(),
  coarseUserLocation:pointSchema.optional(),
}).strict();
export type AskRequest=z.infer<typeof askRequestSchema>;

// Null patch values mean KEEP, not clear. Reset is an explicit separate action.
export const intentSchema=z.object({
  action:z.enum(['search','refine','compare','reset','clarify','unsupported']),
  clearLocation:z.boolean(),
  clarification:z.string().max(300).nullable(),
  patch:z.object({
    kind:constraintsSchema.shape.kind.nullable(),time:timeSchema.nullable(),
    nearPlace:z.string().trim().min(1).max(100).nullable(),
    useUserLocation:z.boolean().nullable(),radiusMeters:z.number().int().min(100).max(5000).nullable(),
    freeOnly:z.boolean().nullable(),categories:z.array(category).max(5).nullable(),
    terms:z.array(z.string().trim().min(1).max(60)).max(6).nullable(),
  }).strict(),
}).strict();
export type Intent=z.infer<typeof intentSchema>;
export const defaultConstraints:Constraints={kind:'all',time:{period:'today',date:null},nearPlace:null,useUserLocation:false,radiusMeters:1500,freeOnly:false,categories:[],terms:[]};

export const placeSchema=pointSchema.extend({name:z.string(),aliases:z.array(z.string())});
export type Place=z.infer<typeof placeSchema>;
export const recordSchema=z.object({
  kind:z.enum(['event','crumb']),id:z.uuid(),title:z.string(),
  description:z.string().nullable(),category:z.string().nullable(),
  venue:z.string().nullable(),latitude:z.number().nullable(),longitude:z.number().nullable(),
  startsAt:z.string().nullable(),endsAt:z.string().nullable(),eventDate:z.string().nullable(),allDay:z.boolean(),
  createdAt:z.string().nullable(),expiresAt:z.string().nullable(),
  state:z.enum(['crumb','rising','full_loaf','stale']).nullable(),confirmCount:z.number(),disputeCount:z.number(),
  source:z.string(),sourceUrl:z.string().nullable(),lastSyncedAt:z.string().nullable(),
  priceText:z.string().nullable(),priceType:z.enum(['free','unknown']),distanceMeters:z.number().nullable(),
});
export type DiscoveryRecord=z.infer<typeof recordSchema>;
export const explanationSchema=z.object({
  answer:z.string().min(1).max(900),
  citations:z.array(referenceSchema).min(1).max(4),
}).strict();
export type AskResponse={
  answer:string;cards:DiscoveryRecord[];
  appliedConstraints:Constraints & {window:{start:string;end:string};origin:Place|null};
  context:z.infer<typeof contextSchema>;status:'results'|'no_results'|'clarification'|'unsupported';
  suggestedFollowUps:string[];dataFreshnessNote:string;
};
