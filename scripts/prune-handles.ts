// Finds registered handles that no account uses any more and, with --apply,
// deletes them.
//
//   pnpm tsx scripts/prune-handles.ts [--report prune-report.json]
//   pnpm tsx scripts/prune-handles.ts --apply --backup backup.json
//
// Dry run by default. --apply writes every row it will delete to the backup
// file first, deletes them in one transaction, then asks the deployed app to
// drop its cached handle table (REVALIDATE_URL + REVALIDATE_SECRET).
// Reads DATABASE_URL like the app. See lib/prune.ts for the rules.
import { writeFile } from "node:fs/promises"
import { parseArgs } from "node:util"
import { PrismaClient } from "@prisma/client"

import {
  decide,
  type AccountState,
  type DidDocument,
  type Verdict,
} from "../lib/prune"

const PLC = "https://plc.directory"
const APPVIEW = "https://public.api.bsky.app"
const USER_AGENT = "pessoas.dev-prune (+https://pessoas.dev)"

const { values: options } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    backup: { type: "string" },
    report: { type: "string", default: "prune-report.json" },
    concurrency: { type: "string", default: "6" },
  },
})

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string
  ) {
    super(`HTTP ${status}`)
  }
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

// GET with retries on 429 (honoring Retry-After), 5xx and network errors.
// Other 4xx come back as HttpError for the caller to interpret.
async function getJson(url: string, attempts = 6): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      })
    } catch (error) {
      if (attempt >= attempts) throw error
      await sleep(1000 * 2 ** attempt)
      continue
    }
    if (response.ok) return response.json()
    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt >= attempts) {
      throw new HttpError(response.status, await response.text())
    }
    const retryAfter = Number(response.headers.get("retry-after"))
    await sleep(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * 2 ** attempt
    )
  }
}

function didDocumentUrl(did: string) {
  if (did.startsWith("did:plc:")) return `${PLC}/${did}`
  if (did.startsWith("did:web:")) {
    const host = decodeURIComponent(did.slice("did:web:".length))
    return `https://${host}/.well-known/did.json`
  }
  return null
}

async function resolveDid(did: string): Promise<DidDocument> {
  const url = didDocumentUrl(did)
  if (!url) return { status: "error", detail: "unsupported DID method" }
  try {
    const document = (await getJson(url)) as { alsoKnownAs?: unknown }
    const aliases = Array.isArray(document.alsoKnownAs)
      ? document.alsoKnownAs.filter((alias) => typeof alias === "string")
      : []
    return { status: "found", alsoKnownAs: aliases }
  } catch (error) {
    // Only plc.directory's answer is authoritative for "this DID is gone"; a
    // did:web host that is down or misconfigured proves nothing.
    if (
      did.startsWith("did:plc:") &&
      error instanceof HttpError &&
      (error.status === 404 || error.status === 410)
    ) {
      return { status: "gone" }
    }
    return { status: "error", detail: String(error) }
  }
}

async function accountState(did: string): Promise<AccountState> {
  const url = `${APPVIEW}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
  try {
    await getJson(url)
    return { status: "active" }
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 400) {
      return { status: "error", detail: String(error) }
    }
    let body: { error?: string; message?: string } = {}
    try {
      body = JSON.parse(error.body)
    } catch {}
    const text = `${body.error ?? ""} ${body.message ?? ""}`.toLowerCase()
    if (text.includes("takendown") || text.includes("takedown")) {
      return { status: "inactive", reason: "takendown" }
    }
    if (text.includes("deactivated")) {
      return { status: "inactive", reason: "deactivated" }
    }
    if (text.includes("deleted"))
      return { status: "inactive", reason: "deleted" }
    if (text.includes("not found")) {
      return { status: "inactive", reason: "not found" }
    }
    return { status: "error", detail: text.trim() || "HTTP 400" }
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

interface Checked {
  id: string
  handle: string
  domain: string
  did: string
  verdict: Verdict
  document: DidDocument["status"]
  account: string
}

async function main() {
  if (options.apply && !options.backup) {
    throw new Error("--apply needs --backup <file> for the deleted rows")
  }
  const concurrency = Math.min(Math.max(Number(options.concurrency) || 6, 1), 6)
  const prisma = new PrismaClient()

  try {
    const users = await prisma.user.findMany({
      include: { domain: true },
      orderBy: { createdAt: "asc" },
    })
    console.error(`Checking ${users.length} rows, ${concurrency} at a time…`)

    let done = 0
    const checked = await mapLimit(users, concurrency, async (user) => {
      const fullHandle = `${user.handle}.${user.domain.name}`
      const [document, account] = await Promise.all([
        resolveDid(user.did),
        accountState(user.did),
      ])
      if (++done % 100 === 0) console.error(`  ${done}/${users.length}`)
      return {
        id: user.id,
        handle: user.handle,
        domain: user.domain.name,
        did: user.did,
        verdict: decide(fullHandle, document, account),
        document: document.status,
        account:
          account.status === "inactive"
            ? `inactive: ${account.reason}`
            : account.status === "error"
              ? account.detail
              : account.status,
      } satisfies Checked
    })

    const removable = checked.filter((row) => row.verdict.remove)
    const summary = {
      total: checked.length,
      removable: removable.length,
      kept: checked.length - removable.length,
      byReason: countBy(checked, (row) => row.verdict.reason),
      removableByDomain: countBy(removable, (row) => row.domain),
      totalByDomain: countBy(checked, (row) => row.domain),
    }
    await writeFile(
      options.report!,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), summary, rows: checked },
        null,
        2
      )
    )
    console.log(JSON.stringify(summary, null, 2))
    console.error(`Report: ${options.report}`)

    if (!options.apply) {
      console.error("Dry run. Nothing deleted.")
      return
    }

    const ids = removable.map((row) => row.id)
    const rows = await prisma.user.findMany({
      where: { id: { in: ids } },
      include: { domain: true },
    })
    await writeFile(options.backup!, JSON.stringify(rows, null, 2))
    console.error(`Backup of ${rows.length} rows: ${options.backup}`)

    const deleted = await prisma.$transaction(async (tx) => {
      const result = await tx.user.deleteMany({ where: { id: { in: ids } } })
      if (result.count !== ids.length) {
        throw new Error(`expected ${ids.length} deletions, got ${result.count}`)
      }
      return result.count
    })
    console.error(`Deleted ${deleted} rows.`)
    await revalidate()
  } finally {
    await prisma.$disconnect()
  }
}

async function revalidate() {
  const url = process.env.REVALIDATE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!url || !secret) {
    console.error(
      "REVALIDATE_URL/REVALIDATE_SECRET not set: the app keeps serving the old handle table until its next signup."
    )
    return
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  })
  console.error(`Revalidate ${url}: HTTP ${response.status}`)
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts: Record<string, number> = {}
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1
  return counts
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
