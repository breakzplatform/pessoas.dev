import { AppBskyActorDefs } from "@atproto/api"
import { kv } from "@vercel/kv"
import { Check, X } from "lucide-react"

import { getAgent } from "@/lib/atproto"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"
import { Stage } from "@/components/stage"

export function generateMetadata({ params }: { params: { domain: string } }) {
  const domain = params.domain
  return {
    title: `${domain} - get your community handle for Bluesky`,
    description: `get your own ${domain} handle`,
  }
}

export default async function IndexPage({
  params,
  searchParams,
}: {
  params: {
    domain: string
  }
  searchParams: {
    handle?: string
    "new-handle"?: string
  }
}) {
  const domain = params.domain
  let handle = searchParams.handle
  let newHandle = searchParams["new-handle"]
  let profile: AppBskyActorDefs.ProfileView | undefined
  let error1: string | undefined
  let error2: string | undefined

  if (handle) {
    try {
      const agent = await getAgent()
      if (!handle.includes(".")) {
        handle += ".bsky.social"
      }
      console.log("fetching profile", handle)
      const actor = await agent.getProfile({
        actor: handle,
      })
      if (!actor.success) throw new Error("fetch was not a success")
      profile = actor.data
      console.log(profile);
    } catch (e) {
      console.error(e)
      error1 = (e as Error)?.message ?? "unknown error"
    }

    if (newHandle && profile) {
      newHandle = newHandle.trim().toLowerCase()
      if (!newHandle.includes(".")) {
        newHandle += "." + domain
      }
      if (!error1) {
        // regex: (alphanumeric, -, _).(domain)
        const validHandle = newHandle.match(
          new RegExp(`^[a-zA-Z0-9-_]+.${domain}$`)
        )
        if (validHandle) {
          try {
            const handle = newHandle.replace(`.${domain}`, "")
            const existing = await prisma.user.findFirst({
              where: { handle },
              include: { domain: true },
            })
            if (existing && existing.domain.name === domain) {
              if (existing.did !== profile.did) {
                error2 = "handle taken"
              }
            } else {
              await prisma.user.create({
                data: {
                  handle,
                  did: profile.did,
                  domain: {
                    connectOrCreate: {
                      where: { name: domain },
                      create: { name: domain },
                    },
                  },
                },
              })
            }
          } catch (e) {
            console.error(e)
            error2 = (e as Error)?.message ?? "unknown error"
          }
        } else {
          error2 = "invalid handle"
        }
      }
    }
  }

  return (
    <main className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-4">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
          Tenha seu @ personalizado no Bluesky com o <span className="underline underline-offset-8">{domain}</span>
        </h1>
        <h2>Feito por e para pessoas desenvolvedoras. É grátis e sem custo nenhum</h2>
        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          Siga o passo-a-passo à seguir para ter seu usuário <strong>{domain}</strong>
        </p>
      </div>
      <div>
        <Stage title="Informe seu usuário atual no Bluesky" number={1}>
          <form>
            <div className="grid w-full max-w-md items-center gap-1.5">
              <div className="flex w-full max-w-md items-center space-x-2">
                {newHandle && (
                  <input type="hidden" name="new-handle" value="" />
                )}
                <Input
                  type="text"
                  name="handle"
                  placeholder="exemplo.bsky.social"
                  defaultValue={handle}
                  required
                />
                <Button type="submit">Enviar</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Informe seu usuário atual, sem o @
              </p>
              {error1 && (
                <p className="flex flex-row items-center gap-2 text-sm text-red-400">
                  <X className="h-4 w-4" /> Conta não encontrada. Verifique e tente novamente.
                </p>
              )}
              {profile && (
                <>
                  <p className="text-muted-forground mt-4 flex flex-row items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" /> Conta encontrada
                  </p>
                  <Profile profile={profile} className="mt-4" />
                </>
              )}
            </div>
          </form>
        </Stage>
        <Stage title="Escolha seu novo usuário" number={2} disabled={!profile}>
          <form>
            <input type="hidden" name="handle" value={handle} />
            <div className="grid w-full max-w-md items-center gap-1.5">
              <div className="flex w-full max-w-md items-center space-x-2">
                <Input
                  type="text"
                  name="new-handle"
                  placeholder={`exemplo.${domain}`}
                  defaultValue={newHandle}
                />
                <Button type="submit">Enviar</Button>
              </div>
              <p className="text-sm text-muted-foreground ">
                Informe o usuário que deseja ter no {domain}, sem o @
              </p>
              {error2 && (
                <p className="text-sm text-red-500">
                  {(() => {
                    switch (error2) {
                      case "handle taken":
                        return "Handle already taken - please enter a different handle"
                      case "invalid handle":
                        return "Invalid handle - please enter a different handle"
                      default:
                        return "An error occured - please try again"
                    }
                  })()}
                </p>
              )}
            </div>
          </form>
        </Stage>
        <Stage
          title="Altere seu @ no Bluesky"
          number={3}
          disabled={!newHandle || !!error2}
          last
        >
          <p className="max-w-lg text-sm">
            Vá em <strong>Settings {">"} Advanced {">"} Change my handle</strong>. Selecione <strong>&quot;I
            have my own domain&quot;</strong> e digite {" "}
            {newHandle ? `"<strong>${newHandle}</strong>"` : "seu novo @"}. Por fim, aperte em
            {" "}<strong>&quot;Verify DNS Record&quot;</strong>.
          </p>
        </Stage>
      </div>
    </main>
  )
}
