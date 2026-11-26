import { Buffer } from 'node:buffer';

const protectedRefs = new Set(['cpjqmetlqzielplxmzzn', 'dnbvybmulsppfjntbsxz']);
function fail(message: string): never { throw new Error(`Forge test environment: ${message}`); }

/** Validate Vite's effective environment before serving or building the test app. */
export function validateForgeTestEnvironment(env: Record<string, string | undefined>) {
  const ref = env.FORGE_TEST_PROJECT_REF?.trim();
  if (!ref || (ref !== 'local' && !/^[a-z]{20}$/.test(ref))) {
    fail('set FORGE_TEST_PROJECT_REF to the isolated project ref, or local.');
  }
  if (protectedRefs.has(ref)) fail('the live Forge database and credentials vault cannot be test targets.');
  let url: URL;
  try { url = new URL(env.VITE_PUBLIC_SUPABASE_URL ?? ''); }
  catch { return fail('set the isolated Supabase URL explicitly.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    fail('the Supabase URL must be an origin without credentials, paths or query parameters.');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (ref === 'local') {
    if (!loopback || !['http:', 'https:'].includes(url.protocol)) fail('local must use a loopback Supabase endpoint.');
  } else if (url.protocol !== 'https:' || url.hostname !== `${ref}.supabase.co` || url.port) {
    fail('the HTTPS Supabase URL must match FORGE_TEST_PROJECT_REF exactly.');
  }
  const key = env.VITE_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!key) fail('set the isolated project publishable or anon key explicitly.');
  if (!key.startsWith('sb_publishable_')) {
    let claims: { role?: string; ref?: string };
    try { claims = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString('utf8')); }
    catch { return fail('the browser key must be publishable or a legacy anon JWT.'); }
    if (!claims || claims.role !== 'anon') fail('privileged and unrecognised browser keys are forbidden.');
    if (claims.ref && protectedRefs.has(claims.ref)) fail('the anon key belongs to a different protected Supabase project.');
    if (ref !== 'local' && claims.ref !== ref) fail('the anon key belongs to a different Supabase project.');
  }
  const stripe = env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  if (stripe && !stripe.startsWith('pk_test_')) fail('use a Stripe test publishable key, or leave it empty.');
  return { projectRef: ref, url: url.origin };
}
