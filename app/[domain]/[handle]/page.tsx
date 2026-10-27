import { cache } from "react"
import { Metadata } from "next"

import { agent } from "@/lib/atproto"
import { findDid } from "@/lib/handles"
import { Profile } from "@/components/profile"

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
    return {
      title: "Profile not found",
      description: ":(",
    }
  }

  return {
    title: `${profile.displayName} - @${profile.handle}`,
    description: profile.description,
  }
}

export default async function HandlePage({ params }: Props) {
  const { domain, handle } = await params
  const profile = await getProfile(domain, handle).catch((e) => {
    console.error(e)
    return null
  })

  if (!profile) {
    return (
      <div className="grid flex-1 place-items-center">
        <p className="text-center">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="grid flex-1 place-items-center">
      <a href={`https://bsky.app/profile/${profile.handle}`}>
        <Profile profile={profile} />
      </a>
    </div>
  )
}
