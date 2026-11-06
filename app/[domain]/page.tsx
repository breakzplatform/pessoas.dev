import { AppBskyActorDefs } from "@atproto/api"

import { copyFor } from "@/config/site"
import { agent } from "@/lib/atproto"
import { Tr, ui, type Localized } from "@/lib/i18n"
import { pageMetadata } from "@/lib/metadata"
import { basePath } from "@/lib/paths"
import type { RegisterStatus } from "@/lib/register"
import { Faq } from "@/components/faq"
import { PersonRow } from "@/components/person"
import { Masthead } from "@/components/site-shell"

import { registerHandle } from "./actions"

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{
    handle?: string
    "new-handle"?: string
    result?: string
  }>
}

const TITLE = { pt: "Handle de graça no Bluesky", en: "A free Bluesky handle" }

export async function generateMetadata({ params }: Props) {
  const { domain } = await params
  return pageMetadata(domain, TITLE.pt, copyFor(domain).dek.pt[0])
}

const REGISTER_ERRORS: Partial<Record<RegisterStatus, Localized<string>>> = {
  "handle taken": {
    pt: "Este @ já está em uso.",
    en: "That handle is already taken.",
  },
  "invalid handle": {
    pt: "Este @ não serve. Tente outro nome.",
    en: "That handle will not work. Try another name.",
  },
  reserved: { pt: "Este @ está reservado.", en: "That handle is reserved." },
  "account not found": {
    pt: "Não achei essa conta no Bluesky.",
    en: "I could not find that account on Bluesky.",
  },
}
REGISTER_ERRORS["invalid domain"] = REGISTER_ERRORS["invalid handle"]
REGISTER_ERRORS.slur = REGISTER_ERRORS["invalid handle"]

const UNKNOWN_ERROR = {
  pt: "Algo quebrou do meu lado. Tenta de novo daqui a pouco.",
  en: "Something broke on my side. Try again in a bit.",
}

// Accepts "ana", "@ana" and "ana.bsky.social".
function normalizeActor(input: string) {
  const actor = input.trim().replace(/^@/, "")
  return actor.includes(".") ? actor : `${actor}.bsky.social`
}

export default async function IndexPage({ params, searchParams }: Props) {
  const { domain } = await params
  const copy = copyFor(domain)
  const base = await basePath(domain)
  const query = await searchParams
  const { "new-handle": newHandle, result } = query
  const handle = query.handle ? normalizeActor(query.handle) : undefined

  let profile: AppBskyActorDefs.ProfileViewDetailed | undefined
  let lookupFailed = false
  if (handle) {
    try {
      profile = (await agent.getProfile({ actor: handle })).data
    } catch (error) {
      console.error(error)
      lookupFailed = true
    }
  }

  const registered = result === "ok"
  const registerError =
    result && !registered
      ? (REGISTER_ERRORS[result as RegisterStatus] ?? UNKNOWN_ERROR)
      : undefined
  const suffix = `.${domain}`
  const requestedName = newHandle?.endsWith(suffix)
    ? newHandle.slice(0, -suffix.length)
    : newHandle

  return (
    <>
      <Masthead domain={domain} base={base} current="home" title={TITLE} />

      <section className="db-panel cast" aria-labelledby="signup-title">
        <h2 className="db-panel-head" id="signup-title">
          <Tr pt="Pegar um @" en="Get a handle" />
        </h2>
        <div className="db-panel-body">
          <Tr
            as="p"
            className="dek"
            pt={
              <>
                <strong>{copy.dek.pt[0]}</strong>
                {copy.dek.pt[1]}
              </>
            }
            en={
              <>
                <strong>{copy.dek.en[0]}</strong>
                {copy.dek.en[1]}
              </>
            }
          />
          <Tr
            as="p"
            className="sibling"
            pt={
              <>
                {copy.siblingLine.pt}
                <a href={`https://${copy.sibling}`}>{copy.sibling}</a>.
              </>
            }
            en={
              <>
                {copy.siblingLine.en}
                <a href={`https://${copy.sibling}`}>{copy.sibling}</a>.
              </>
            }
          />

          <div className="step">
            <div className="step-num" aria-hidden="true">
              1
            </div>
            <div className="step-body">
              <h3>
                <Tr
                  pt="Informe seu @ atual no Bluesky"
                  en="Your current Bluesky handle"
                />
              </h3>
              <form>
                <label htmlFor="handle">
                  <Tr pt="Seu @ atual" en="Your current handle" />
                </label>
                {newHandle && (
                  <input type="hidden" name="new-handle" value="" />
                )}
                <div className="row-input">
                  <span className="db-field cast">
                    <input
                      className="db-input"
                      id="handle"
                      name="handle"
                      type="text"
                      inputMode="url"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="exemplo.bsky.social"
                      defaultValue={query.handle}
                      required
                    />
                  </span>
                  <button
                    className="db-btn db-btn-primary cast press"
                    type="submit"
                  >
                    <Tr {...ui.send} />
                  </button>
                </div>
                <Tr
                  as="p"
                  className="help db-note"
                  pt="Seu @ atual, com ou sem o .bsky.social."
                  en="Your current handle, with or without .bsky.social."
                />
                {lookupFailed && (
                  <div role="alert">
                    <Tr
                      as="p"
                      className="alert"
                      {...REGISTER_ERRORS["account not found"]!}
                    />
                  </div>
                )}
                {profile && (
                  <>
                    <div role="status">
                      <Tr
                        as="p"
                        className="status-ok"
                        pt="conta encontrada"
                        en="account found"
                      />
                    </div>
                    <PersonRow profile={profile} variant="found" />
                  </>
                )}
              </form>
            </div>
          </div>

          <div className={profile ? "step" : "step is-disabled"}>
            <div className="step-num" aria-hidden="true">
              2
            </div>
            <div className="step-body">
              <h3>
                <Tr pt="Escolha o novo @" en="Pick the new handle" />
              </h3>
              <form action={registerHandle}>
                <input type="hidden" name="domain" value={domain} />
                <input type="hidden" name="handle" value={handle ?? ""} />
                <label htmlFor="new-handle">
                  <Tr pt="O nome que você quer" en="The name you want" />
                </label>
                <div className="row-input">
                  <span className="suffix-field">
                    <span className="db-field cast">
                      <input
                        className="db-input"
                        id="new-handle"
                        name="new-handle"
                        type="text"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={copy.example}
                        defaultValue={requestedName}
                        disabled={!profile}
                        required
                      />
                    </span>
                    <span className="field-suffix">{suffix}</span>
                  </span>
                  <button
                    className="db-btn db-btn-primary cast press"
                    type="submit"
                    disabled={!profile}
                  >
                    <Tr {...ui.send} />
                  </button>
                </div>
                <Tr
                  as="p"
                  className="help db-note"
                  pt="Só o nome, sem o @. O sufixo entra sozinho."
                  en="Just the name, no @. The suffix is added for you."
                />
                {registerError && (
                  <div role="alert">
                    <Tr as="p" className="alert" {...registerError} />
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className={registered ? "step" : "step is-disabled"}>
            <div className="step-num" aria-hidden="true">
              3
            </div>
            <div className="step-body">
              <h3>
                <Tr
                  pt="Altere o @ no Bluesky"
                  en="Change the handle on Bluesky"
                />
              </h3>
              <Tr
                as="p"
                pt={
                  <>
                    Em Ajustes, Advanced, Change my handle. Marque “I have my
                    own domain”, digite o @ novo e aperte Verify DNS Record.
                  </>
                }
                en={
                  <>
                    In Settings, Advanced, Change my handle. Choose “I have my
                    own domain”, type the new handle, then Verify DNS Record.
                  </>
                }
              />
              <p className="step-3-handle">
                {registered && newHandle
                  ? newHandle
                  : `${copy.example}${suffix}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Faq />
    </>
  )
}
