import Image from "next/image"

import { Tr, ui } from "@/lib/i18n"

export interface Person {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

export function toPerson({ did, handle, displayName, avatar }: Person): Person {
  return { did, handle, displayName, avatar }
}

export function Avatar({ person, size }: { person: Person; size: number }) {
  const name = person.displayName?.trim() || person.handle
  return (
    <div className="avatar" aria-hidden="true">
      {person.avatar ? (
        <Image src={person.avatar} alt="" width={size} height={size} />
      ) : (
        name.charAt(0).toLocaleUpperCase()
      )}
    </div>
  )
}

export function PersonRow({
  profile,
  variant,
}: {
  profile: Person
  variant: "found" | "list"
}) {
  const person = toPerson(profile)
  const name = person.displayName?.trim() || person.handle
  if (variant === "found") {
    return (
      <div className="found">
        <Avatar person={person} size={48} />
        <div>
          <p className="name">{name}</p>
          <p className="handle">@{person.handle}</p>
        </div>
      </div>
    )
  }
  return (
    <li className="person">
      <Avatar person={person} size={40} />
      <div className="text">
        <p className="name">{name}</p>
        <p className="handle">@{person.handle}</p>
      </div>
      <a
        className="db-btn db-btn-sm cast press go"
        href={`https://bsky.app/profile/${person.handle}`}
      >
        <Tr {...ui.seeOnBluesky} />
      </a>
    </li>
  )
}
