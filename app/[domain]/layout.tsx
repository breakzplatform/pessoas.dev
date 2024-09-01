import Head from "next/head"
import { Fragment } from 'react';

import { siteConfig } from "@/config/site"
import { MainNav } from "@/components/main-nav"
import { SiteHeader } from "@/components/site-header"

interface Props {
  children: React.ReactNode
  params: { domain: string }
}

export default function DomainLayout({ children, params }: Props) {
  const domain = params.domain
  return (
    <>
      {/* <Fragment>
        <head>
          <meta
            property="og:image"
            content={`https://trending.notx.blue/${params.domain}.png`}
          />
          <meta
            name="twitter:image"
            content={`https://trending.notx.blue/${params.domain}.png`}
          />
          <link
      rel="icon"
      href="data:image/svg+xml,&lt;svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22&gt;&lt;text y=%22.9em%22 font-size=%2290%22&gt;🦋&lt;/text&gt;&lt;/svg&gt;"
    />
        </head>
      </Fragment> */}
      <SiteHeader items={siteConfig.mainNav}>
        <MainNav title={params.domain} items={siteConfig.mainNav} />
      </SiteHeader>
      <div className="flex flex-col flex-1">{children}</div>
    </>
  )
}
