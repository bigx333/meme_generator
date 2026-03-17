import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'

import Header from '@/components/Header'
import appCss from '@/styles.css?url'

export const Route = createRootRoute({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Meme Generator Lab' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
