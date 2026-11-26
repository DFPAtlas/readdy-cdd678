import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const directory = new URL('supabase/schema-captures/2026-11-26/', root);
const capture = JSON.parse(readFileSync(new URL('missing-tables.json', directory), 'utf8'));
const identifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const tableName = (table) => `public.${identifier(table.name)}`;
const lines = [
  '-- Schema-only supplement captured from live catalogues on 26 November 2026.',
  '-- REVIEW / DISPOSABLE REPLAY ONLY. This is not an automatic migration or backup.',
  '-- Requires four parent tables from the existing baseline and Supabase roles.',
  '-- Contains no user rows, seeds or secrets. Existing tables cause an error.',
  'begin;',
  "do $$ begin if current_setting('forge.schema_replay', true) is distinct from 'disposable' then",
  "  raise exception 'Set forge.schema_replay=disposable only in a disposable database';",
  'end if; end $$;',
  'set local search_path = pg_catalog, public;',
];
if (capture.sequences.length || capture.types.length) throw new Error('Sequence/type capture needs explicit support');
for (const table of capture.tables) {
  if (table.kind !== 'r' || table.replica_identity !== 'd' || table.triggers.length || table.policies.length || table.column_grants.length) {
    throw new Error(`Unsupported table properties: ${table.name}`);
  }
  const definitions = table.columns.map((column) => {
    if (column.identity || column.generated) throw new Error(`Generated column requires explicit support: ${table.name}`);
    return `  ${identifier(column.name)} ${column.type}${column.default === null ? '' : ` default ${column.default}`}${column.not_null ? ' not null' : ''}`;
  });
  definitions.push(...table.constraints.filter((constraint) => constraint.type !== 'f')
    .map((constraint) => `  constraint ${identifier(constraint.name)} ${constraint.definition}`));
  lines.push('', `create table ${tableName(table)} (`, definitions.join(',\n'), ');');
  lines.push(`alter table ${tableName(table)} ${table.rls ? 'enable' : 'disable'} row level security;`);
  if (table.force_rls) lines.push(`alter table ${tableName(table)} force row level security;`);
}
// Every primary/unique key exists before any cross-table foreign key is added.
for (const table of capture.tables) {
  for (const constraint of table.constraints.filter((constraint) => constraint.type === 'f')) {
    lines.push(`alter table ${tableName(table)} add constraint ${identifier(constraint.name)} ${constraint.definition};`);
  }
  for (const index of table.indexes) {
    if (!index.valid) throw new Error(`Invalid source index: ${index.name}`);
    lines.push(`${index.definition};`);
  }
  lines.push(`revoke all on table ${tableName(table)} from public, anon, authenticated, service_role;`);
  for (const grant of table.grants) {
    if (!/^[A-Z]+$/.test(grant.privilege)) throw new Error('Unexpected privilege');
    const role = grant.grantee === 'PUBLIC' ? 'public' : identifier(grant.grantee);
    lines.push(`grant ${grant.privilege} on table ${tableName(table)} to ${role}${grant.grantable ? ' with grant option' : ''};`);
  }
}
lines.push('commit;', '');
const output = lines.join('\n');
const path = new URL('missing-tables.sql', directory);
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== output) throw new Error('Regenerate the schema supplement');
} else {
  writeFileSync(path, output);
}
console.log(`Verified ${capture.tables.length} captured tables: ${fileURLToPath(path)}`);
