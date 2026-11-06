import { cache } from "react"
import { Metadata } from "next"

import { agent } from "@/lib/atproto"
import { findDid } from "@/lib/handles"
import { Tr } from "@/lib/i18n"
import { pageMetadata } from "@/lib/metadata"
import { basePath } from "@/lib/paths"
import { PersonRow, toPerson } from "@/components/person"
import { Masthead } from "@/components/site-shell"

interface Props {
  params: Promise<{ handle: string; domain: string }>
}

const getProfile = cache(async (domain: string, handle: string) => {
  const did = await findDid(domain, handle)
  if (!did) return null
  const profile = await agent.getProfile({ actor: did })
  return profile.data
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain, handle } = await params
  const profile = await getProfile(domain, handle).catch(() => null)
  if (!profile) {
    return pageMetadata(domain, "Não achei este @", `@${handle}.${domain}`)
  }
  return {
    ...pageMetadata(
      domain,
      profile.displayName?.trim() || `@${profile.handle}`,
      profile.description ?? `@${profile.handle}`
    ),
    // This route has its own opengraph-image with the profile.
    openGraph: undefined,
    twitter: undefined,
  }
}

export default async function HandlePage({ params }: Props) {
  const { domain, handle } = await params
  const base = await basePath(domain)
  const profile = await getProfile(domain, handle).catch((error) => {
    console.error(error)
    return null
  })
  const fullHandle = `${handle}.${domain}`

  return (
    <>
      <Masthead
        domain={domain}
        base={base}
        current={null}
        title={{ pt: `@${fullHandle}`, en: `@${fullHandle}` }}
      />
      <section className="db-panel cast" aria-labelledby="handle-title">
        <h2 className="db-panel-head" id="handle-title">
          @{fullHandle}
        </h2>
        <div className="db-panel-body">
          {profile ? (
            <ul className="people">
              <PersonRow profile={toPerson(profile)} variant="list" />
            </ul>
          ) : (
            <Tr
              as="p"
              className="empty"
              pt={`Não achei @${fullHandle} neste domínio.`}
              en={`I could not find @${fullHandle} on this domain.`}
            />
          )}
        </div>
      </section>
    </>
  )
}
