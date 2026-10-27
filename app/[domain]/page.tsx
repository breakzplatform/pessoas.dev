import { AppBskyActorDefs } from "@atproto/api"
import { Check, X } from "lucide-react"

import { agent } from "@/lib/atproto"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"
import { Stage } from "@/components/stage"

import { registerHandle } from "./actions"

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{
    handle?: string
    "new-handle"?: string
    result?: string
  }>
}

export async function generateMetadata({ params }: Props) {
  const { domain } = await params
  return {
    title: `${domain} - Seu @ personalizado no Bluesky`,
    description: `'Tenha seu usuário ${domain}`,
  }
}

export default async function IndexPage({ params, searchParams }: Props) {
  const { domain } = await params
  const query = await searchParams
  const { "new-handle": newHandle, result } = query
  let handle = query.handle
  let profile: AppBskyActorDefs.ProfileViewDetailed | undefined
  let error1: string | undefined
  const error2 = result && result !== "ok" ? result : undefined

  if (handle) {
    try {
      if (!handle.includes(".")) {
        handle += ".bsky.social"
      }
      const actor = await agent.getProfile({
        actor: handle,
      })
      if (!actor.success) throw new Error("fetch was not a success")
      profile = actor.data
    } catch (e) {
      console.error(e)
      error1 = (e as Error)?.message ?? "unknown error"
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
            <form action={registerHandle}>
              <input type="hidden" name="domain" value={domain} />
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
                        case "invalid domain":
                        case "slur":
                          return "Usuário inválido, tente novamente"
                        case "reserved":
                          return "Usuário reservado, tente novamente"
                        case "account not found":
                          return "Conta não encontrada. Verifique e tente novamente."
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
            disabled={result !== "ok"}
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
