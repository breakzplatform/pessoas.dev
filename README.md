# pessoas.dev / ceuazul.online

Free Bluesky handles on two domains: `name.pessoas.dev` for people who write
code, `name.ceuazul.online` for everyone else. One Next.js app serves both,
picked by the `Host` header (`proxy.ts`).

Based on [community-handles](https://github.com/mozzius/community-handles) by
Samuel Newman. MIT license, see `LICENSE`.

## How it works

- `/` walks through three steps: sign in with Bluesky (atproto OAuth), pick a
  name, change the handle. Signup is a server action
  (`app/[domain]/actions.ts` → `lib/register.ts`) and the DID it stores is
  always the OAuth session's, so nobody can point a name at someone else's
  account.
- When the server grants `identity:handle`, step 3 offers to call
  `com.atproto.identity.updateHandle` with the session; otherwise it shows the
  manual steps. The session is closed (tokens revoked, cookie deleted) as soon
  as there is nothing left for it to do.
- `{name}.{domain}/.well-known/atproto-did` answers Bluesky's handle check with
  the DID stored for that name. The whole handle table is kept in the Next Data
  Cache (`lib/handles.ts`), so verification traffic never reaches Postgres.
- `/pessoas` lists who uses each domain, `/privacidade` (`/privacy`) says what
  is stored.

The pages follow the notx.blue family look (`styles/globals.css`): light, dark
and terminal themes, Portuguese and English, no cookies, no analytics.

## Sign-in (atproto OAuth)

`lib/oauth/` holds a public OAuth client (`token_endpoint_auth_method: none`,
DPoP-bound tokens), one per origin: each origin serves its own
`/client-metadata.json` as its client_id and gets `/api/oauth/callback` as its
redirect URI. Only allowlisted hosts get a client (`lib/oauth/hosts.ts`): the
two domains, `LANDING_SUBDOMAIN.{domain}`, a preview's own `VERCEL_URL` and
`VERCEL_BRANCH_URL` (only when `VERCEL_ENV=preview`), extra hosts in
`PREVIEW_HOSTS` (comma-separated), and loopback. On localhost the client is a
loopback client and the login route moves the browser to `127.0.0.1`.

The scope is `atproto identity:handle`; if a server rejects it, sign-in is
retried with plain `atproto`. The session lives in an encrypted, host-only
cookie (iron-session) for at most an hour.

`SESSION_SECRET` (32+ characters) must be set on every environment.
Vercel deployment protection must be off for previews, or the authorization
server cannot fetch the preview's `client-metadata.json`.

## Rate limits

`lib/rate-limit.ts` allows 3 new handles per DID a day and 10 per IP an hour.
Each signup writes a `Registration` row (DID, HMAC of the IP) that is deleted
after a day. There is no captcha; if abuse shows up, Cloudflare Turnstile on
the signup form is the next step.

## Development

```sh
pnpm install
DATABASE_URL=postgresql://... pnpm prisma db push
pnpm prisma db seed
DATABASE_URL=postgresql://... SESSION_SECRET=$(openssl rand -hex 32) pnpm dev
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
