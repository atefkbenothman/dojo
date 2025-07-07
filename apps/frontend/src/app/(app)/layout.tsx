import "../globals.css"
import { ResizableLayout } from "@/components/panels/resizable-layout"
import { LayoutProvider } from "@/hooks/use-layout"
import { SoundEffectProvider } from "@/hooks/use-sound-effect"
import { serverTrpc } from "@/lib/trpc/client"
import { TRPCProvider } from "@/lib/trpc/provider"
import { ConvexClientProvider } from "@/providers/convex-client-provider"
import { DarkModeProvider } from "@/providers/dark-mode-provider"
import { SessionProvider } from "@/providers/session-provider"
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server"
import { asyncTryCatch } from "@dojo/utils"
import { Analytics } from "@vercel/analytics/next"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Dojo",
  description: "Build, run, and chain custom tool-augmented AI agents",
  openGraph: {
    title: "Dojo",
    description: "Build, run, and chain custom tool-augmented AI agents",
    url: "https://dojoai.vercel.app",
    siteName: "Dojo",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dojo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    title: "Dojo",
    description: "Build, run, and chain custom tool-augmented AI agents",
    site: "https://dojoai.vercel.app",
    card: "summary_large_image",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dojo",
      },
    ],
  },
}

async function getDefaultLayout() {
  const cookieStore = await cookies()
  const layout = cookieStore.get("react-resizable-panels:layout")
  if (layout) {
    return JSON.parse(layout.value)
  }
  return [70, 30]
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const defaultLayout = await getDefaultLayout()

  // get server health
  const { data: healthData } = await asyncTryCatch(serverTrpc.health.get.query())
  const isServerHealthy = healthData?.status === "ok"

  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* <script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js" /> */}
          <link
            rel="icon"
            href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⛩️</text></svg>"
          />
        </head>
        <body className={`antialiased ${GeistSans.className}`}>
          <DarkModeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SoundEffectProvider>
              <ConvexClientProvider>
                <SessionProvider>
                  <TRPCProvider>
                    <LayoutProvider>
                      <ResizableLayout defaultLayout={defaultLayout} isServerHealthy={isServerHealthy}>
                        {children}
                      </ResizableLayout>
                    </LayoutProvider>
                  </TRPCProvider>
                </SessionProvider>
              </ConvexClientProvider>
              <Toaster toastOptions={{ style: { borderRadius: "var(--radius-sm)" } }} />
              <Analytics />
            </SoundEffectProvider>
          </DarkModeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
