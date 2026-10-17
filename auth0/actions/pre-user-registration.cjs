/**
 * Auth0 Action: Pre User Registration (Breadcrumb / BreadPass). Runtime: Node 22 (Auth0's default).
 * Paste this file into Auth0 → Actions → Library → Build Custom → Pre User Registration, add the
 * secret LOAF_SECRET (same value as the app's LOAF_SECRET), deploy, and add it to the flow.
 *
 * - Only @ufl.edu addresses may register.
 * - Every sign-up must carry a slice token minted by the Breadcrumb server after the student sliced
 *   the loaf (src/lib/auth/loaf.ts). Calls to /dbconnections/signup that skip the app are denied.
 * Uses the built-in Web Crypto API, so the Action needs no dependencies or require().
 */
async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))).toString('base64url');
}
function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

exports.onExecutePreUserRegistration = async (event, api) => {
  const email = (event.user.email || '').toLowerCase();
  if (!/@ufl\.edu$/.test(email)) return api.access.deny('not_uf', 'Use your @ufl.edu email.');

  const secret = event.secrets.LOAF_SECRET;
  const [exp, sig] = String((event.user.user_metadata || {}).loaf_slice || '').split('.');
  const fresh = Number(exp) >= Math.floor(Date.now() / 1000);
  const matches = Boolean(secret && sig) && sameText(sig, await hmac(secret, `signup:${email}:${exp}`));
  if (!fresh || !matches) return api.access.deny('no_loaf', "Slice the loaf to prove you're human.");

  // The token is single-purpose; keep only a record that the check passed.
  api.user.setUserMetadata('loaf_slice', null);
  api.user.setUserMetadata('human_check', 'loaf_slice');
};
