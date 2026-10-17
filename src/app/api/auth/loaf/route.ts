import {createLoafChallenge,loafSecret} from '@/lib/auth/loaf';
// A fresh loaf to slice before sign-up. {enabled:false} when LOAF_SECRET is unset (slice check off).
export async function GET(){
 const secret=loafSecret();
 return Response.json(secret?createLoafChallenge(secret):{enabled:false},{headers:{'Cache-Control':'no-store'}});
}
