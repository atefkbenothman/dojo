import "./globals.css"
import { ResizableLayout } from "@/components/panels/resizable-layout"
import { AgentProvider } from "@/hooks/use-agent"
import { AIChatProvider } from "@/hooks/use-chat"
import { AIImageProvider } from "@/hooks/use-image"
import { MCPProvider } from "@/hooks/use-mcp"
import { ModelProvider } from "@/hooks/use-model"
import { SoundEffectProvider } from "@/hooks/use-sound-effect"
import { UserProvider } from "@/hooks/use-user-id"
import { WorkflowProvider } from "@/hooks/use-workflow"
import { serverTrpc } from "@/lib/trpc/client"
import { DojoTRPCProvider } from "@/lib/trpc/provider"
import { DarkModeProvider } from "@/providers/dark-mode-provider"
import type { ConfigGetOutput } from "@dojo/backend/src/types.js"
import { asyncTryCatch } from "@dojo/utils"
import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const defaultLayout = await getDefaultLayout()

  // get server health
  const { data: healthData } = await asyncTryCatch(serverTrpc.health.get.query())

  const isServerHealthy = healthData?.status === "ok"

  // get config
  const { data: configData } = await asyncTryCatch(serverTrpc.config.get.query())

  let mcpServers: ConfigGetOutput["mcpServers"] = {}
  let agents: ConfigGetOutput["agents"] = {}
  let aiModels: ConfigGetOutput["aiModels"] = {}
  let workflows: ConfigGetOutput["workflows"] = {}

  if (configData) {
    mcpServers = configData.mcpServers
    agents = configData.agents
    aiModels = configData.aiModels
    workflows = configData.workflows
  }

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
        <UserProvider>
          <DojoTRPCProvider>
            <DarkModeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <SoundEffectProvider>
                <ModelProvider aiModels={aiModels}>
                  <MCPProvider mcpServers={mcpServers} isServerHealthy={isServerHealthy}>
                    <AIChatProvider>
                      <AIImageProvider>
                        <AgentProvider agents={agents}>
                          <WorkflowProvider workflows={workflows}>
                            <ResizableLayout defaultLayout={defaultLayout}>{children}</ResizableLayout>
                          </WorkflowProvider>
                        </AgentProvider>
                      </AIImageProvider>
                    </AIChatProvider>
                  </MCPProvider>
                </ModelProvider>
              </SoundEffectProvider>
            </DarkModeProvider>
          </DojoTRPCProvider>
        </UserProvider>
        <Toaster toastOptions={{ style: { borderRadius: "var(--radius-sm)" } }} />
        <Analytics />
      </body>
    </html>
  )
}
