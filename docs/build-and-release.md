# Forge — Build & Release

Concise build/release reference for the Forge React SPA. No secret values appear here.

## Package manager

**npm.** The repository has no lockfile convention (no `pnpm-lock.yaml`, `yarn.lock`,
`bun.lock`, or `package-lock.json`), and `package.json` uses standard npm-compatible
scripts (`npm run dev`, `npm run build`, etc.). `docs/release-runbook.md` also identifies
npm as the package manager.

## Build commands

```bash
npm install          # install from package.json ranges
npm run type-check   # tsc --noEmit --project tsconfig.app.json
npm run lint         # eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0
npm run build        # vite build -> ./out
npm run preview      # vite preview
```

The production build emits to `./out` (see `vite.config.ts` → `build.outDir`), with
sourcemaps enabled. `./out` is build output and is **not** committed.

## Reproducibility status

| Item | State |
|---|---|
| Package manager | npm |
| Lockfile (`package-lock.json`) | **MISSING — open blocker** |
| `npm ci` (clean locked install) | **Unavailable** — no lockfile |
| Type check | Unverified in Readdy workspace (no shell) |
| Lint | Unverified in Readdy workspace (no shell) |
| Production build | Verified passing (`vite build`) |
| Node version | Unverified (no `engines`, `.nvmrc`, or `.node-version`) |

**Reproducibility blocker:** dependency versions are declared as ranges in `package.json`
and are not pinned by a lockfile. To make the build reproducible, run the following in an
environment with Node + npm and commit the result:

```bash
npm install --package-lock-only   # or a clean `npm install`, then
git add package-lock.json
```

Then verify with a clean locked install:

```bash
npm ci && npm run type-check && npm run lint && npm run build
```

Do **not** fabricate the lockfile by hand — it must be produced by npm so resolved
versions and integrity hashes are accurate.