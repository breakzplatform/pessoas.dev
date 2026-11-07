import { copyFor } from "@/config/site"
import { agent } from "@/lib/atproto"
import { Tr, ui, type Localized } from "@/lib/i18n"
import { pageMetadata } from "@/lib/metadata"
import { canUpdateHandle } from "@/lib/oauth/client"
import { requestOrigin } from "@/lib/oauth/origin"
import type { LoginOutcome } from "@/lib/oauth/routes"
import { readSignedInAccount, type SignedInAccount } from "@/lib/oauth/session"
import { basePath, homeHref } from "@/lib/paths"
import type { RegisterStatus } from "@/lib/register"
import { Faq } from "@/components/faq"
import { PersonRow, type Person } from "@/components/person"
import { Masthead } from "@/components/site-shell"

import {
  registerHandle,
  signOut,
  switchHandle,
  type SwitchStatus,
} from "./actions"

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{
    "new-handle"?: string
    result?: string
    login?: string
    switch?: string
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
  "not signed in": {
    pt: "A sessão expirou. Entre com o Bluesky de novo.",
    en: "Your session expired. Sign in with Bluesky again.",
  },
  "too many for account": {
    pt: "Esta conta já fez 3 cadastros hoje. Tente de novo amanhã.",
    en: "This account already signed up 3 times today. Try again tomorrow.",
  },
  "too many from network": {
    pt: "Muitos cadastros saindo da sua rede. Tente de novo daqui a uma hora.",
    en: "Too many signups from your network. Try again in an hour.",
  },
}
REGISTER_ERRORS["invalid domain"] = REGISTER_ERRORS["invalid handle"]
REGISTER_ERRORS.slur = REGISTER_ERRORS["invalid handle"]

const UNKNOWN_ERROR = {
  pt: "Algo quebrou do meu lado. Tenta de novo daqui a pouco.",
  en: "Something broke on my side. Try again in a bit.",
}

const LOGIN_ERRORS: Record<LoginOutcome, Localized<string>> = {
  failed: {
    pt: "Não consegui entrar com essa conta. Confira o @ e tente de novo.",
    en: "I could not sign in with that account. Check the handle and try again.",
  },
  denied: {
    pt: "Você cancelou o login no Bluesky. Nada foi cadastrado.",
    en: "You cancelled the Bluesky sign-in. Nothing was registered.",
  },
}

const SWITCH_MESSAGES: Record<SwitchStatus, Localized<string>> = {
  done: {
    pt: "Pronto: o seu @ já mudou no Bluesky. A sessão foi encerrada.",
    en: "Done: your handle has changed on Bluesky. The session is closed.",
  },
  failed: {
    pt: "O Bluesky não aceitou a troca agora. Espere um minuto e tente de novo, ou troque à mão como explicado abaixo.",
    en: "Bluesky did not accept the change just now. Wait a minute and try again, or change it by hand as explained below.",
  },
  expired: {
    pt: "A sessão acabou. Troque à mão como explicado abaixo.",
    en: "The session ended. Change it by hand as explained below.",
  },
}

async function profileOf(
  account: SignedInAccount | null
): Promise<Person | undefined> {
  if (!account) return undefined
  try {
    return (await agent.getProfile({ actor: account.did })).data
  } catch (error) {
    console.error(error)
    return { did: account.did, handle: account.did }
  }
}

export default async function IndexPage({ params, searchParams }: Props) {
  const { domain } = await params
  const copy = copyFor(domain)
  const base = await basePath(domain)
  const home = homeHref(base)
  const query = await searchParams
  const { "new-handle": newHandle, result } = query

  const account = await readSignedInAccount(await requestOrigin())
  const profile = await profileOf(account)
  const loginError = LOGIN_ERRORS[query.login as LoginOutcome]
  const switchStatus = query.switch as SwitchStatus | undefined
  const switchMessage = switchStatus && SWITCH_MESSAGES[switchStatus]

  const registered = result === "ok"
  const registerError =
    result && !registered
      ? (REGISTER_ERRORS[result as RegisterStatus] ?? UNKNOWN_ERROR)
      : undefined
  const canSwitch =
    registered && !!account && canUpdateHandle(account.scope) && !!newHandle
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
                <Tr pt="Entre com o Bluesky" en="Sign in with Bluesky" />
              </h3>
              {profile ? (
                <>
                  <div role="status">
                    <Tr
                      as="p"
                      className="status-ok"
                      pt="conta confirmada"
                      en="account confirmed"
                    />
                  </div>
                  <PersonRow profile={profile} variant="found" />
                  <form action={signOut} className="signout">
                    <input type="hidden" name="return_to" value={home} />
                    {registered && newHandle && (
                      <input
                        type="hidden"
                        name="new-handle"
                        value={newHandle}
                      />
                    )}
                    <button
                      className="db-btn db-btn-sm cast press"
                      type="submit"
                    >
                      <Tr pt="sair" en="sign out" />
                    </button>
                  </form>
                </>
              ) : registered ? (
                <Tr
                  as="p"
                  className="help db-note"
                  pt="Cadastro feito. A sessão foi encerrada; o site não tem mais acesso à sua conta."
                  en="Signed up. The session is closed; this site no longer has access to your account."
                />
              ) : (
                <form action="/api/oauth/login">
                  <input type="hidden" name="return_to" value={home} />
                  <label htmlFor="handle">
                    <Tr pt="Seu @ atual" en="Your current handle" />
                  </label>
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
                      />
                    </span>
                    <button
                      className="db-btn db-btn-primary cast press"
                      type="submit"
                    >
                      <Tr pt="entrar" en="sign in" />
                    </button>
                  </div>
                  <Tr
                    as="p"
                    className="help db-note"
                    pt="Você confirma no próprio Bluesky; este site não vê a sua senha. A sessão serve só para este cadastro."
                    en="You confirm on Bluesky itself; this site never sees your password. The session is used only for this signup."
                  />
                  {loginError && (
                    <div role="alert">
                      <Tr as="p" className="alert" {...loginError} />
                    </div>
                  )}
                </form>
              )}
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
                <input type="hidden" name="return_to" value={home} />
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
              <p className="step-3-handle">
                {registered && newHandle
                  ? newHandle
                  : `${copy.example}${suffix}`}
              </p>
              {switchMessage && (
                <div role={switchStatus === "done" ? "status" : "alert"}>
                  <Tr
                    as="p"
                    className={switchStatus === "done" ? "status-ok" : "alert"}
                    {...switchMessage}
                  />
                </div>
              )}
              {canSwitch && (
                <form action={switchHandle} className="switch">
                  <input type="hidden" name="domain" value={domain} />
                  <input type="hidden" name="return_to" value={home} />
                  <input type="hidden" name="new-handle" value={newHandle} />
                  <button
                    className="db-btn db-btn-primary cast press"
                    type="submit"
                  >
                    <Tr
                      pt="trocar meu handle agora"
                      en="change my handle now"
                    />
                  </button>
                  <Tr
                    as="p"
                    className="help db-note"
                    pt="Usa a sessão do login para trocar o @ por você. Depois ela é encerrada."
                    en="Uses the sign-in session to change the handle for you, then closes it."
                  />
                </form>
              )}
              {switchStatus !== "done" && (
                <Tr
                  as="p"
                  className={canSwitch ? "help db-note" : undefined}
                  pt={
                    <>
                      {canSwitch ? "Ou à mão: em" : "Em"} Ajustes, Advanced,
                      Change my handle. Marque “I have my own domain”, digite o
                      @ novo e aperte Verify DNS Record.
                    </>
                  }
                  en={
                    <>
                      {canSwitch ? "Or by hand: in" : "In"} Settings, Advanced,
                      Change my handle. Choose “I have my own domain”, type the
                      new handle, then Verify DNS Record.
                    </>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <Faq />
    </>
  )
}
