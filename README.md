# pessoas.dev / ceuazul.online

Free Bluesky handles on two domains: `name.pessoas.dev` for people who write
code, `name.ceuazul.online` for everyone else. One Next.js app serves both,
picked by the `Host` header (`proxy.ts`).

Based on [community-handles](https://github.com/mozzius/community-handles) by
Samuel Newman. MIT license, see `LICENSE`.

## How it works

- `/` walks through three steps: find your current account, pick a name,
  change the handle on Bluesky. Signup is a server action
  (`app/[domain]/actions.ts` → `lib/register.ts`).
- `{name}.{domain}/.well-known/atproto-did` answers Bluesky's handle check with
  the DID stored for that name. The whole handle table is kept in the Next Data
  Cache (`lib/handles.ts`), so verification traffic never reaches Postgres.
- `/pessoas` lists who uses each domain, `/privacidade` (`/privacy`) says what
  is stored.

The pages follow the notx.blue family look (`styles/globals.css`): light, dark
and terminal themes, Portuguese and English, no cookies, no analytics.

## Development

```sh
pnpm install
DATABASE_URL=postgresql://... pnpm prisma db push
pnpm prisma db seed
DATABASE_URL=postgresql://... pnpm dev
```

On `localhost` and on Vercel previews nothing is rewritten, so each domain
lives under its own path: `http://localhost:3000/pessoas.dev/`,
`/ceuazul.online/pessoas`, `/pessoas.dev/exemplo/.well-known/atproto-did`.

```sh
pnpm test        # vitest
pnpm typecheck
pnpm lint
```

## Pruning unused handles

`scripts/prune-handles.ts` checks every registered handle against its DID
document (plc.directory or did:web) and the public AppView. A row is removable
only if the DID document no longer lists `at://{name}.{domain}`, or the DID is
gone and the AppView reports the account deleted, deactivated or taken down.
A row whose DID document still claims the handle is never removed.

```sh
# dry run: prints counts and writes prune-report.json
DATABASE_URL=... pnpm tsx scripts/prune-handles.ts

# delete: writes the rows to the backup file first, then deletes them in one
# transaction and asks the app to drop its cached handle table
DATABASE_URL=... REVALIDATE_URL=https://pessoas.dev/api/revalidate-handles \
REVALIDATE_SECRET=... pnpm tsx scripts/prune-handles.ts --apply --backup backups/prune.json
```

`REVALIDATE_SECRET` must also be set on the deployment for
`/api/revalidate-handles` to accept the call. Found handles are cached by the
CDN for up to a day, so a deleted handle can keep resolving for that long.
