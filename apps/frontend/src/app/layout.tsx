import "./globals.css"
import { ResizableLayout } from "@/components/layout/resizable-layout"
import { AgentProviderRoot } from "@/hooks/use-agent"
import { AIChatProviderRoot } from "@/hooks/use-chat"
import { MCPProviderRoot } from "@/hooks/use-mcp"
import { ModelProvider } from "@/hooks/use-model"
import { SoundEffectProvider } from "@/hooks/use-sound-effect"
import { UserProvider } from "@/hooks/use-user-id"
import { serverTrpc } from "@/lib/trpc/client"
import { DojoTRPCProvider } from "@/lib/trpc/provider"
import { DarkModeProvider } from "@/providers/dark-mode-provider"
import type { ConfigGetOutput } from "@dojo/api"
import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dojo",
  description: "Dojo",
}

async function getDefaultLayout() {
  const cookieStore = await cookies()
  const layout = cookieStore.get("react-resizable-panels:layout")
  if (layout) {
    return JSON.parse(layout.value)
  }
  return [70, 30]
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const defaultLayout = await getDefaultLayout()

  const { mcpServers, aiModels, agents }: ConfigGetOutput = await serverTrpc.config.get.query()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* <script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js" /> */}
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⛩️</text></svg>"
        />
      </head>
      <body className={`antialiased ${inter.className}`}>
        <DojoTRPCProvider>
          <DarkModeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SoundEffectProvider>
              <UserProvider>
                <MCPProviderRoot mcpServers={mcpServers}>
                  <ModelProvider aiModels={aiModels}>
                    <AIChatProviderRoot>
                      <AgentProviderRoot agents={agents}>
                        <ResizableLayout defaultLayout={defaultLayout}>{children}</ResizableLayout>
                      </AgentProviderRoot>
                    </AIChatProviderRoot>
                  </ModelProvider>
                </MCPProviderRoot>
              </UserProvider>
            </SoundEffectProvider>
          </DarkModeProvider>
        </DojoTRPCProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
