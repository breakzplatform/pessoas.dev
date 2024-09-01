import { AppBskyActorDefs } from "@atproto/api"
import { Check, X } from "lucide-react"

import { agent } from "@/lib/atproto"
import { prisma } from "@/lib/db"
import { hasExplicitSlur } from "@/lib/slurs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"
import { Stage } from "@/components/stage"

export function generateMetadata({ params }: { params: { domain: string } }) {
  const domain = params.domain
  return {
    title: `${domain} - Seu @ personalizado no Bluesky`,
    description: `'Tenha seu usuário ${domain}`,
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
      if (!handle.includes(".")) {
        handle += ".bsky.social"
      }
      // console.log("fetching profile", handle)
      const actor = await agent.getProfile({
        actor: handle,
      })
      if (!actor.success) throw new Error("fetch was not a success")
      profile = actor.data
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
            if (hasExplicitSlur(handle) || BLOCKED.includes(handle)) {
              throw new Error("slur")
            }

            if (domain === "pessoas.dev" && RESERVED.includes(handle)) {
              throw new Error("reserved")
            }

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
    <div>
      <main className="container grid gap-6 items-center pt-6 pb-8 md:py-10">
        <div className="flex max-w-[980px] flex-col items-start gap-4">
          <h1 className="text-3xl font-extrabold tracking-tighter leading-tight sm:text-3xl md:text-5xl lg:text-6xl">
            Tenha seu @ personalizado no Bluesky com o{" "}
            <span className="underline underline-offset-8">{domain}</span>
          </h1>
          {domain == "pessoas.dev" && (
            <h2>
              Feito por e para pessoas desenvolvedoras. É grátis e sem custo
              nenhum.
            </h2>
          )}
          {domain == "ceuazul.online" && (
            <h2>
              Feito pra quem fala post e não skeet. É grátis e sem custo nenhum.
            </h2>
          )}
          <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            Siga o passo-a-passo a seguir para ter seu usuário{" "}
            <strong>{domain}</strong>
          </p>
        </div>
        <div>
          <Stage title="Informe seu usuário atual no Bluesky" number={1}>
            <form>
              <div className="grid w-full max-w-md items-center gap-1.5">
                <div className="flex items-center space-x-2 w-full max-w-md">
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
                  <p className="flex flex-row gap-2 items-center text-sm text-red-500">
                    <X className="size-4" /> Conta não encontrada. Verifique e
                    tente novamente.
                  </p>
                )}
                {profile && (
                  <>
                    <p className="flex flex-row gap-2 items-center mt-4 text-sm text-muted-forground">
                      <Check className="text-green-500 size-4" /> Conta
                      encontrada
                    </p>
                    <Profile profile={profile} className="mt-4" />
                  </>
                )}
              </div>
            </form>
          </Stage>
          <Stage
            title="Escolha seu novo usuário"
            number={2}
            disabled={!profile}
          >
            <form>
              <input type="hidden" name="handle" value={handle} />
              <div className="grid w-full max-w-md items-center gap-1.5">
                <div className="flex items-center space-x-2 w-full max-w-md">
                  <Input
                    type="text"
                    name="new-handle"
                    placeholder={`example.${domain}`}
                    defaultValue={newHandle}
                  />
                  <Button type="submit">Enviar</Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Informe o usuário que deseja ter no {domain}, sem o @
                </p>
                {error2 && (
                  <p className="text-sm text-red-500">
                    {(() => {
                      switch (error2) {
                        case "handle taken":
                          return "Usuário indisponível pois já está sendo utilizado"
                        case "invalid handle":
                        case "slur":
                          return "Usuário inválido, tente novamente"
                        case "reserved":
                          return "Usuário reservado, tente novamente"
                        default:
                          return "Ocorreu um erro desconhecido, tente novamente mais tarde"
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
              Vá em{" "}
              <strong>
                Settings {">"} Advanced {">"} Change my handle
              </strong>
              . Selecione <strong>&quot;I have my own domain&quot;</strong> e
              digite{" "}
              <span className="font-mono font-bold">
                {newHandle ? `"${newHandle}"` : "seu novo @"}
              </span>
              . Por fim, aperte em{" "}
              <strong>&quot;Verify DNS Record&quot;</strong>.
            </p>
          </Stage>
        </div>
      </main>

      <footer className="container grid gap-2 items-center pb-8">
        <p className="text-sm">
          Diretamente de Pernambuco por{" "}
          <a
            className="underline bold underline-offset-4"
            href="https://joseli.to"
          >
            Joselito
          </a>
          , com muito amor e carinho.
        </p>
        <p className="text-xs text-gray-400">
          Este site não utiliza nenhum cookie nem coleta absolutamente nenhum
          dado.
        </p>
      </footer>
    </div>
  )
}

const RESERVED = ["joselito"].map((x) => x.toLowerCase())

const BLOCKED = ["bolsonaro", "trump"].map((x) => x.toLowerCase())
