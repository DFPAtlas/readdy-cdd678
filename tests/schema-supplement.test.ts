import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const directory = new URL('../supabase/schema-captures/2026-11-26/', import.meta.url);
const capture = JSON.parse(readFileSync(new URL('missing-tables.json', directory), 'utf8'));
const sql = readFileSync(new URL('missing-tables.sql', directory), 'utf8');
const quoted = (value: string) => `"${value.replaceAll('"', '""')}"`;
let db: PGlite;

describe('captured schema supplement in embedded Postgres', () => {
  beforeAll(async () => {
    db = new PGlite();
    // Structural parent fixtures only: this is not a Supabase/auth restore test.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table public.forge_agents (id text primary key);
      create table public.integration_connections (id uuid primary key);
      create table public.projects (id uuid primary key);
      create table public.workspaces (id uuid primary key);
      set forge.schema_replay = 'disposable';
    `);
    await db.exec(sql);
  }, 30000);
  afterAll(async () => db?.close());

  it('creates all 35 missing tables with the captured columns and nullability', async () => {
    const names = capture.tables.map((t: { name: string }) => t.name);
    const tables = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname=any($1::text[]) order by relname`, [names]);
    expect(tables.rows.map((r) => r.relname)).toEqual([...names].sort());
    expect(tables.rows.every((r) => r.relrowsecurity)).toBe(true);
    for (const table of capture.tables) {
      const columns = await db.query(`select attname,format_type(atttypid,atttypmod) as type,attnotnull from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped order by attnum`, [`public.${table.name}`]);
      expect(columns.rows).toEqual(table.columns.map((c: { name: string; type: string; not_null: boolean }) => ({ attname: c.name, type: c.type, attnotnull: c.not_null })));
    }
  });
  it('restores every primary, unique, check and foreign-key constraint plus secondary index', async () => {
    for (const table of capture.tables) {
      const constraints = await db.query(`select conname from pg_constraint where conrelid=$1::regclass and contype in ('p','u','c','f','x') order by conname`, [`public.${table.name}`]);
      expect(constraints.rows.map((r) => r.conname)).toEqual(table.constraints.map((c: { name: string }) => c.name).sort());
      for (const index of table.indexes) {
        expect((await db.query('select to_regclass($1)::text as name', [`public.${index.name}`])).rows[0].name).toBe(index.name);
      }
    }
    await expect(db.exec(`insert into public.workspace_members (workspace_id,user_id) values (gen_random_uuid(),gen_random_uuid())`)).rejects.toMatchObject({ code: '23503' });
    await expect(db.exec(`insert into public.routing_models (provider_id,model_key,display_name,capability_type) values ('synthetic','synthetic','Synthetic','invalid')`)).rejects.toMatchObject({ code: '23514' });
  });
  it('keeps synthetic data invisible to browser roles without adding policies', async () => {
    await db.exec(`insert into public.integration_templates (name) values ('Synthetic template')`);
    expect((await db.query('select count(*)::int as count from public.integration_templates')).rows[0].count).toBe(1);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      try {
        for (const table of capture.tables) {
          expect((await db.query(`select count(*)::int as count from public.${quoted(table.name)}`)).rows[0].count).toBe(0);
        }
        await expect(db.exec(`insert into public.integration_templates (name) values ('Forbidden')`)).rejects.toMatchObject({ code: '42501' });
        expect((await db.query(`update public.integration_templates set name='Forbidden' returning id`)).rows).toHaveLength(0);
        expect((await db.query(`delete from public.integration_templates returning id`)).rows).toHaveLength(0);
      } finally { await db.exec('reset role'); }
    }
    await db.exec('set role service_role');
    try { expect((await db.query('select count(*)::int as count from public.integration_templates')).rows[0].count).toBe(1); }
    finally { await db.exec('reset role'); }
  });
  it('requires a disposable-target marker before replaying any DDL', async () => {
    const empty = new PGlite();
    try {
      await expect(empty.exec(sql)).rejects.toThrow('disposable database');
      await empty.exec('rollback');
      expect((await empty.query(`select count(*)::int as count from pg_tables where schemaname='public'`)).rows[0].count).toBe(0);
    } finally { await empty.close(); }
  }, 30000);
});
