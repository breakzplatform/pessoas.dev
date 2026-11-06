import { siteConfig } from "@/config/site"
import { Tr } from "@/lib/i18n"
import { pageMetadata } from "@/lib/metadata"
import { basePath } from "@/lib/paths"
import { Masthead } from "@/components/site-shell"

export const PRIVACY_TITLE = { pt: "Privacidade", en: "Privacy" }

export async function privacyMetadata(params: Promise<{ domain: string }>) {
  const { domain } = await params
  return pageMetadata(
    domain,
    PRIVACY_TITLE.pt,
    `O que o ${domain} guarda sobre você, por quê e como remover.`
  )
}

export async function PrivacyPage({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  const base = await basePath(domain)
  const abuse = siteConfig.links.abuse
  const mail = <a href={`mailto:${abuse}`}>{abuse}</a>

  return (
    <>
      <Masthead
        domain={domain}
        base={base}
        current={null}
        title={PRIVACY_TITLE}
      />
      <section className="db-panel cast" aria-labelledby="privacy-title">
        <h2 className="db-panel-head" id="privacy-title">
          <Tr {...PRIVACY_TITLE} />
        </h2>
        <div className="db-panel-body">
          <Tr
            as="div"
            className="prose"
            pt={
              <>
                <h3>O que fica guardado</h3>
                <p>
                  Para cada @ cadastrado, um banco Postgres guarda quatro
                  coisas: o nome escolhido (por exemplo ana), o domínio (
                  {domain}), o DID da sua conta no Bluesky e as datas de
                  cadastro e de última alteração. Nada mais: nem e-mail, nem
                  senha, nem o seu @ antigo.
                </p>
                <h3>Por quê</h3>
                <p>
                  O Bluesky confirma um handle perguntando ao domínio qual DID
                  ele representa. Este site responde essa pergunta com o que
                  está no banco. A lista em pessoas usa o mesmo registro, e o
                  nome e a foto vêm na hora da API pública do Bluesky; eles não
                  ficam guardados aqui.
                </p>
                <h3>O que não tem</h3>
                <p>
                  Sem cookies e sem analytics. O tema e o idioma que você
                  escolhe ficam só no seu navegador (localStorage). Como em
                  qualquer site, a hospedagem (Vercel) registra acessos por um
                  tempo curto para operar o serviço.
                </p>
                <h3>Como remover</h3>
                <p>
                  Troque o seu handle no Bluesky para outro. Registros que
                  nenhuma conta usa mais são apagados de tempos em tempos. Para
                  apagar na hora, escreva para {mail} dizendo qual é o @. Posso
                  pedir uma confirmação pela conta no Bluesky.
                </p>
              </>
            }
            en={
              <>
                <h3>What is stored</h3>
                <p>
                  For each registered handle, a Postgres database stores four
                  things: the chosen name (for example ana), the domain (
                  {domain}), your Bluesky account&apos;s DID, and the dates it
                  was registered and last changed. Nothing else: no email, no
                  password, not your old handle.
                </p>
                <h3>Why</h3>
                <p>
                  Bluesky confirms a handle by asking the domain which DID it
                  stands for. This site answers with what is in the database.
                  The people list uses the same record; names and pictures come
                  live from Bluesky&apos;s public API and are not stored here.
                </p>
                <h3>What is not here</h3>
                <p>
                  No cookies and no analytics. The theme and language you pick
                  stay in your browser (localStorage). Like any site, the host
                  (Vercel) keeps short-lived access logs to run the service.
                </p>
                <h3>How to remove it</h3>
                <p>
                  Switch your Bluesky handle to another one. Records no account
                  uses any more are deleted from time to time. To delete it
                  right away, write to {mail} saying which handle it is. I may
                  ask you to confirm from the Bluesky account.
                </p>
              </>
            }
          />
        </div>
      </section>
    </>
  )
}
