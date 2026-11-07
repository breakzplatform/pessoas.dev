import { siteConfig } from "@/config/site"
import { Tr, type Localized } from "@/lib/i18n"

const { links } = siteConfig

const source = (
  <a href={links.source} target="_blank" rel="noopener">
    GitHub
  </a>
)
const upstream = (
  <a href={links.upstream} target="_blank" rel="noopener">
    community-handles
  </a>
)

const ITEMS: { q: Localized<string>; a: Localized }[] = [
  {
    q: { pt: "Como isso funciona?", en: "How does this work?" },
    a: {
      pt: "No Bluesky o @ é um domínio. Quem se cadastra leva alguma-coisa.bsky.social. Aqui você aponta um subdomínio deste site para o seu DID; o Bluesky aceita isso como handle. Eu não hospedo a sua conta.",
      en: "On Bluesky your handle is a domain. New accounts get something.bsky.social. Here you point a subdomain of this site at your DID; Bluesky accepts that as a handle. I do not host your account.",
    },
  },
  {
    q: {
      pt: "Por que preciso entrar com o Bluesky?",
      en: "Why do I have to sign in with Bluesky?",
    },
    a: {
      pt: "Para provar que a conta é sua: sem isso, qualquer um podia apontar um nome para a conta de outra pessoa. O login é o OAuth do próprio Bluesky; este site não vê a sua senha. A sessão serve só para o cadastro e, se você deixar, para trocar o @ por você. Depois ela é encerrada.",
      en: "To prove the account is yours: otherwise anyone could point a name at someone else's account. Sign-in is Bluesky's own OAuth; this site never sees your password. The session is used only for the signup and, if you allow it, to change the handle for you. Then it is closed.",
    },
  },
  {
    q: {
      pt: "Trocando o @, quem me segue continua me seguindo?",
      en: "If I change my handle, do my followers stay?",
    },
    a: {
      pt: "Sim. Os posts antigos que marcam o @ velho também passam a apontar para o novo.",
      en: "Yes. Older posts that mention the old handle will point at the new one too.",
    },
  },
  {
    q: {
      pt: "Cadastrando um @ aqui, ele é meu para sempre?",
      en: "Is a handle I register here mine forever?",
    },
    a: {
      pt: "Enquanto ele estiver na sua conta. Se você trocar para outro @ ou apagar a conta, o nome pode voltar a ficar livre para outra pessoa.",
      en: "For as long as your account uses it. If you switch to another handle or delete the account, the name may become free for someone else.",
    },
  },
  {
    q: {
      pt: "Está dando erro de Invalid Handle.",
      en: "I get an Invalid Handle error.",
    },
    a: {
      pt: "Costuma ser provisório. Roda a verificação de novo. Se quiser, volta para o @ antigo e cadastra outra vez: seguidores e menções antigas seguem.",
      en: "That is usually temporary. Run the verification again. You can also switch back to the old handle and register once more: followers and old mentions stay.",
    },
  },
  {
    q: {
      pt: "Por quanto tempo posso ter um @ personalizado?",
      en: "How long can I keep a custom handle?",
    },
    a: {
      pt: "Enquanto eu conseguir manter o domínio e este site no ar. Hoje o custo é pequeno, e morrer não está nos meus planos.",
      en: "For as long as I can keep the domain and this site running. Cost is small today, and dying is not in the plan.",
    },
  },
  {
    q: {
      pt: "Tenho um domínio e queria um site igual.",
      en: "I have a domain and want a site like this.",
    },
    a: {
      pt: (
        <>
          O código está no {source}: fork e deploy. Ele é baseado no {upstream},
          do Samuel Newman, e segue com a licença MIT.
        </>
      ),
      en: (
        <>
          The code is on {source}: fork it and deploy. It is based on {upstream}{" "}
          by Samuel Newman and keeps its MIT license.
        </>
      ),
    },
  },
]

export function Faq() {
  return (
    <section
      className="db-panel cast"
      id="perguntas"
      aria-labelledby="faq-title"
    >
      <h2 className="db-panel-head" id="faq-title">
        <Tr pt="Perguntas frequentes" en="Frequently asked questions" />
      </h2>
      <div className="faq-list">
        {ITEMS.map(({ q, a }) => (
          <details className="faq-item" key={q.pt}>
            <summary>
              <Tr {...q} />
            </summary>
            <Tr as="p" {...a} />
          </details>
        ))}
      </div>
    </section>
  )
}
