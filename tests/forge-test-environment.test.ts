import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';
import { loadEnv } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateForgeTestEnvironment } from '../scripts/forge-test-environment';

const ref = 'abcdefghijklmnopqrst';
const jwt = (role = 'anon', projectRef = ref) => `synthetic.${Buffer.from(JSON.stringify({ role, ref: projectRef })).toString('base64url')}.signature`;
const environment = () => ({
  FORGE_TEST_PROJECT_REF: ref,
  VITE_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  VITE_PUBLIC_SUPABASE_ANON_KEY: jwt(),
  VITE_STRIPE_PUBLISHABLE_KEY: '',
});
afterEach(() => vi.unstubAllEnvs());

describe('Forge test target validation', () => {
  it('accepts matching isolated endpoint and anon-key claims', () => {
    expect(validateForgeTestEnvironment(environment()).projectRef).toBe(ref);
  });
  it.each(['cpjqmetlqzielplxmzzn', 'dnbvybmulsppfjntbsxz'])('rejects protected database %s even when explicitly selected', (protectedRef) => {
    expect(() => validateForgeTestEnvironment({ ...environment(), FORGE_TEST_PROJECT_REF: protectedRef,
      VITE_PUBLIC_SUPABASE_URL: `https://${protectedRef}.supabase.co`, VITE_PUBLIC_SUPABASE_ANON_KEY: jwt('anon', protectedRef),
    })).toThrow('cannot be test targets');
  });
  it('rejects the inherited live endpoint under a different target name', () => {
    expect(() => validateForgeTestEnvironment({ ...environment(), VITE_PUBLIC_SUPABASE_URL: 'https://cpjqmetlqzielplxmzzn.supabase.co' })).toThrow('match');
  });
  it('rejects an anon key inherited from the live project', () => {
    expect(() => validateForgeTestEnvironment({ ...environment(), VITE_PUBLIC_SUPABASE_ANON_KEY: jwt('anon', 'cpjqmetlqzielplxmzzn') })).toThrow('different');
  });
  it.each(['service_role', 'authenticated', ''])('rejects a %s browser JWT', (role) => {
    expect(() => validateForgeTestEnvironment({ ...environment(), VITE_PUBLIC_SUPABASE_ANON_KEY: jwt(role) })).toThrow('forbidden');
  });
  it('rejects a modern secret key', () => {
    expect(() => validateForgeTestEnvironment({ ...environment(), VITE_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_synthetic' })).toThrow('browser key');
  });
  it('allows a modern publishable key', () => {
    expect(validateForgeTestEnvironment({ ...environment(), VITE_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_synthetic' }).projectRef).toBe(ref);
  });
  it.each(['http://abcdefghijklmnopqrst.supabase.co', `https://${ref}.supabase.co.evil.example`, `https://${ref}.supabase.co/functions/v1`])('rejects unsafe endpoint %s', (url) => {
    expect(() => validateForgeTestEnvironment({ ...environment(), VITE_PUBLIC_SUPABASE_URL: url })).toThrow();
  });
  it('allows loopback only when local is explicitly selected', () => {
    expect(validateForgeTestEnvironment({ ...environment(), FORGE_TEST_PROJECT_REF: 'local', VITE_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' }).projectRef).toBe('local');
    expect(() => validateForgeTestEnvironment({ ...environment(), FORGE_TEST_PROJECT_REF: 'local' })).toThrow('loopback');
    expect(() => validateForgeTestEnvironment({ ...environment(), FORGE_TEST_PROJECT_REF: 'local',
      VITE_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_PUBLIC_SUPABASE_ANON_KEY: jwt('anon', 'cpjqmetlqzielplxmzzn'),
    })).toThrow('protected');
  });
  it('rejects missing configuration and live Stripe keys', () => {
    expect(() => validateForgeTestEnvironment({})).toThrow('FORGE_TEST_PROJECT_REF');
    expect(() => validateForgeTestEnvironment({ ...environment(), VITE_PUBLIC_SUPABASE_ANON_KEY: '' })).toThrow('explicitly');
    expect(() => validateForgeTestEnvironment({ ...environment(), VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_synthetic' })).toThrow('Stripe test');
  });
  it('refuses live .env fallback when the test override file is missing', () => {
    for (const key of Object.keys(environment())) vi.stubEnv(key, undefined);
    const dir = mkdtempSync(join(tmpdir(), 'forge-env-'));
    try {
      writeFileSync(join(dir, '.env'), 'VITE_PUBLIC_SUPABASE_URL=https://cpjqmetlqzielplxmzzn.supabase.co\n');
      expect(() => validateForgeTestEnvironment(loadEnv('forge-test', dir, ''))).toThrow();
      writeFileSync(join(dir, '.env.forge-test.local'), Object.entries(environment()).map(([key, value]) => `${key}=${value}`).join('\n'));
      expect(validateForgeTestEnvironment(loadEnv('forge-test', dir, '')).projectRef).toBe(ref);
      // Shell variables outrank files in Vite: a stale exported live URL must also fail.
      vi.stubEnv('VITE_PUBLIC_SUPABASE_URL', 'https://cpjqmetlqzielplxmzzn.supabase.co');
      expect(() => validateForgeTestEnvironment(loadEnv('forge-test', dir, ''))).toThrow('match');
    } finally { rmSync(dir, { recursive: true }); }
  });
});
