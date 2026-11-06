import { privacyMetadata, PrivacyPage } from "@/components/privacy"

interface Props {
  params: Promise<{ domain: string }>
}

export function generateMetadata({ params }: Props) {
  return privacyMetadata(params)
}

export default function Page({ params }: Props) {
  return <PrivacyPage params={params} />
}
