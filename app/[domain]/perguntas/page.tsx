import { ArrowRight } from "lucide-react"
import { type Metadata } from "next"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Stage } from "@/components/stage"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const domain = params.domain

  return {
    title: `Perguntas • ${domain}`,
    description: `Veja as pessoas que utilizam o ${domain}.`,
  }
}
interface Props {
  params: { domain: string }
}

export default function CommunityPage({ params }: Props) {

  const domain = params.domain

  return (
    <main className="container grid gap-6 items-center pt-6 pb-8 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-4">
        <h1 className="text-3xl font-extrabold tracking-tighter leading-tight sm:text-3xl md:text-5xl lg:text-6xl">
          Perguntas e Respostas
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          Tirar todas as suas dúvidas ou morrer tentando
        </p>
      </div>
      <div>
        <Stage title="Como isso funciona?" number={"❔"} last>
          <p className="max-w-lg">
           No Bluesky todos os usuários tem estrutura semelhante de um domínio (ou subdomínio), por conta disso, ao se cadastrar na plataforma você ganha um usuário com <strong>bsky.social</strong> no final.
          </p>
        </Stage>
        <Stage title="Trocando o @, quem me segue vai continuar me seguindo?" number={"❔"} last>
          <p className="max-w-lg">
           <strong>Sim.</strong> Basta seguir o processo. Inclusive, todos os posts anteriores ao momento da troca que tem marcação do sue @ antigo irão redirecionar para o novo.
          </p>
        </Stage>
        <Stage title="Cadastrando um @ aqui, ele é meu pra sempre?" number={"❔"} last>
          <p className="max-w-lg">
           <strong>No momento, sim.</strong> No futuro, é possível que exista uma verificação para filtrar quem realmente está usando de tempos em tempos. Nesse caso, um @ registrado anteriormente ficaria liberado para cadastro novamente.
          </p>
        </Stage>
        <Stage title="Está dando erro de 'Invalid Handle', como resolvo?" number={"❔"} last>
          <p className="max-w-lg">
           Este erro tende a ser provisório. Tente fazer o processo de verificação novamente, ou se quiser, pode voltar pro @ antigo e cadastrar novamente. Você não vai perder nenhum seguidor e todas as menções antigas vão continuar funcionar.
          </p>
        </Stage>
        <Stage title="Por quanto tempo eu posso ter um usuário personalizado?" number={"❔"} last>
          <p className="max-w-lg">
          <strong>No momento, pra sempre.</strong> Por pra sempre, entenda-se &quot;enquanto eu conseguir manter isso aqui funcionando&quot;. No momento, os custos são irrisórios e morrer não está nos meus planos.
          </p>
        </Stage>
        <Stage title="Tenho um domínio e queria um site igual a esse, como faço?" number={"❔"} last>
          <p className="max-w-lg">
            O código do {domain} está <a href="https://github.com/breakzplatform/pessoas.dev">disponível no GitHub</a>, basta fazer seu fork e dar deploy. O {domain} é baseado no projeto <a href="https://github.com/mozzius/community-handles">Community Handles</a>, também disponível no GitHub.
          </p>
        </Stage>
        <Stage title="Não sou programador, mas tenho uma comunidade e quero um site assim. Me ajuda?" number={"❔"} last>
          <p className="mb-4 max-w-lg">
            Se são dúvidas simples, posso tentar resolvê-las via Chat no Bluesky, sem compromisso.
          </p>
          <p className="max-w-lg">
            Caso tenha interesse em fazer algo profissional, com direcionamento e suporte inicial, entre em contato pelo email consultoria@joselil.to para negociarmos os valores dependendo de suas necessidades. Para um único domínio, os valores se iniciam em R$ 3000,00 (possíveis custos recorrentes não inclusos).
          </p>
        </Stage>
        <Stage title="Achei caro, você é mercenário por acaso?" number={"❔"} last>
          <p className="mb-4 max-w-lg">
            Eu não sou de comentar preço de serviço no geral, mas como é do meu mesmo, creio estar autorizado: Sou obrigado a concordar. É caro mesmo. Meu tempo é caro, e por um breve período, será dedicado 100% a você, com todo profissionalismo esperado, caso contrate o serviço.
          </p>
          <p className="max-w-lg">
            Reforçando que o código é aberto e está disponível, gratuitamente, no <a href="https://github.com/breakzplatform/pessoas.dev">GitHub</a>.
          </p>
        </Stage>
      </div>
    </main>
  )
}
