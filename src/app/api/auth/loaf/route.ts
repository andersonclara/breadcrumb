import {createLoafChallenge,loafSecret} from '@/lib/auth/loaf';
import {mobileApi,mobileOptions} from '@/lib/mobile-api';
// A fresh loaf to slice before sign-up. {enabled:false} when LOAF_SECRET is unset (slice check off).
async function get(){
 const secret=loafSecret();
 return Response.json(secret?createLoafChallenge(secret):{enabled:false},{headers:{'Cache-Control':'no-store'}});
}
export const GET=mobileApi(get);
export const OPTIONS=mobileOptions;
