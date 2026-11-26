import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const baseline = readFileSync(new URL('../supabase/migrations/20260816000002_integration_connections.sql', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261126203359_restrict_integration_secret_rpcs.sql', import.meta.url), 'utf8');
const signatures = [
  'forge_integration_store_secret(text,text,text)',
  'forge_integration_read_secret(text)',
  'forge_integration_read_named_secret(text)',
  'forge_integration_update_secret(text,text,text,text)',
  'forge_integration_delete_secret(text)',
];
let db: PGlite;
let reproducedAnonymousRead: unknown;

describe('integration-secret RPC permissions in embedded Postgres', () => {
  beforeAll(async () => {
    db = new PGlite();
    // Plain synthetic Vault API stand-in. This tests SQL privilege boundaries,
    // not Supabase Vault encryption, PostgREST or real credentials.
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema vault;
      create table vault.secrets (id uuid primary key default gen_random_uuid(), secret text, name text, description text, created_at timestamptz default now());
      create view vault.decrypted_secrets as select id,secret as decrypted_secret,name,description,created_at from vault.secrets;
      create function vault.create_secret(p_secret text,p_name text,p_description text,p_key_id uuid) returns uuid language sql as $$
        insert into vault.secrets (secret,name,description) values (p_secret,p_name,p_description) returning id;
      $$;
      create function vault.update_secret(p_id uuid,p_secret text,p_name text,p_description text,p_key_id uuid) returns void language sql as $$
        update vault.secrets set secret=p_secret,name=p_name,description=p_description where id=p_id;
      $$;
    `);
    await db.exec(baseline);
    await db.exec(`
      create function public.forge_integration_read_named_secret(p_name text) returns text language plpgsql security definer set search_path=pg_catalog as $$
        declare v_secret text; begin select decrypted_secret into v_secret from vault.decrypted_secrets where name=p_name order by created_at desc limit 1; return v_secret; end;
      $$;
      insert into vault.secrets (secret,name) values ('synthetic-only','synthetic-name');
    `);
    // Reproduce the directly granted role ACLs observed live, using fake data.
    for (const signature of signatures) await db.exec(`grant execute on function public.${signature} to anon,authenticated,service_role`);
    await db.exec('set role anon');
    try { reproducedAnonymousRead = (await db.query(`select public.forge_integration_read_named_secret('synthetic-name') as value`)).rows[0].value; }
    finally { await db.exec('reset role'); }
    await db.exec(migration);
  }, 30000);
  afterAll(async () => db?.close());

  it('reproduces the observed anonymous-read flaw using synthetic data', () => {
    expect(reproducedAnonymousRead).toBe('synthetic-only');
  });
  it.each(['anon', 'authenticated'])('denies all five RPCs to %s, including direct role grants', async (role) => {
    for (const signature of signatures) {
      expect((await db.query('select has_function_privilege($1,$2,\'EXECUTE\') as allowed', [role, `public.${signature}`])).rows[0].allowed).toBe(false);
    }
    await db.exec(`set role ${role}`);
    try {
      for (const call of [
        `forge_integration_store_secret('fake','fake','fake')`,
        `forge_integration_read_secret('11111111-1111-4111-8111-111111111111')`,
        `forge_integration_read_named_secret('synthetic-name')`,
        `forge_integration_update_secret('11111111-1111-4111-8111-111111111111','fake','fake','fake')`,
        `forge_integration_delete_secret('11111111-1111-4111-8111-111111111111')`,
      ]) await expect(db.query(`select public.${call}`)).rejects.toMatchObject({ code: '42501' });
    } finally { await db.exec('reset role'); }
  });
  it('preserves backend create/read/update/delete and named lookup contracts', async () => {
    for (const signature of signatures) {
      expect((await db.query('select has_function_privilege(\'service_role\',$1,\'EXECUTE\') as allowed', [`public.${signature}`])).rows[0].allowed).toBe(true);
    }
    await db.exec('set role service_role');
    try {
      const id = (await db.query<{ id: string }>(`select public.forge_integration_store_secret('synthetic-first','service-test','test') as id`)).rows[0].id;
      expect((await db.query('select public.forge_integration_read_secret($1) as value', [id])).rows[0].value).toBe('synthetic-first');
      expect((await db.query(`select public.forge_integration_read_named_secret('service-test') as value`)).rows[0].value).toBe('synthetic-first');
      await db.query(`select public.forge_integration_update_secret($1,'synthetic-second','service-test','test')`, [id]);
      expect((await db.query('select public.forge_integration_read_secret($1) as value', [id])).rows[0].value).toBe('synthetic-second');
      await db.query('select public.forge_integration_delete_secret($1)', [id]);
      expect((await db.query('select public.forge_integration_read_secret($1) as value', [id])).rows[0].value).toBeNull();
    } finally { await db.exec('reset role'); }
  });
  it('is safe to reapply and clears reintroduced PUBLIC and direct grants', async () => {
    await db.exec(`grant execute on function public.forge_integration_read_named_secret(text) to public,anon,authenticated`);
    await db.exec(migration);
    await db.exec(migration);
    for (const role of ['anon', 'authenticated']) {
      expect((await db.query(`select has_function_privilege($1,'public.forge_integration_read_named_secret(text)','EXECUTE') as allowed`, [role])).rows[0].allowed).toBe(false);
    }
  });
  it('passes the deployer verification query without reading Vault data', async () => {
    const sql = readFileSync(new URL('../supabase/tests/integration-secret-acl.sql', import.meta.url), 'utf8');
    const result = await db.query(sql);
    expect(result.rows).toHaveLength(5);
    for (const row of result.rows) {
      expect(row).toMatchObject({ anon_execute: false, authenticated_execute: false, service_execute: true });
    }
  });
});
