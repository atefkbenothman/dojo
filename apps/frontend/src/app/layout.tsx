import "./globals.css"
import { ResizableLayout } from "@/components/layout/resizable-layout"
import { env } from "@/env"
import { AgentProviderRoot } from "@/hooks/use-agent"
import { AIChatProviderRoot } from "@/hooks/use-chat"
import { MCPProviderRoot } from "@/hooks/use-mcp"
import { ModelProvider } from "@/hooks/use-model"
import { SoundEffectProvider } from "@/hooks/use-sound-effect"
import { UserProvider } from "@/hooks/use-user-id"
import { DarkModeProvider } from "@/providers/dark-mode-provider"
import type { AgentConfig } from "@dojo/config"
import type { AIModel, MCPServer } from "@dojo/config"
import { AI_MODELS, CONFIGURED_MCP_SERVERS, CONFIGURED_AGENTS } from "@dojo/config"
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

async function fetchConfig(): Promise<{
  aiModels: Record<string, AIModel>
  mcpServers: Record<string, MCPServer>
  agents: Record<string, AgentConfig>
}> {
  try {
    const res = await fetch(`${env.MCP_SERVICE_URL}/config`, { cache: "no-store" })
    if (!res.ok) {
      return {
        aiModels: AI_MODELS,
        mcpServers: CONFIGURED_MCP_SERVERS,
        agents: CONFIGURED_AGENTS,
      }
    }
    const data = await res.json()
    return {
      aiModels: data.aiModels || AI_MODELS,
      mcpServers: data.mcpServers || CONFIGURED_MCP_SERVERS,
      agents: data.agents || CONFIGURED_AGENTS,
    }
  } catch {
    return {
      aiModels: AI_MODELS,
      mcpServers: CONFIGURED_MCP_SERVERS,
      agents: CONFIGURED_AGENTS,
    }
  }
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
  const { aiModels, mcpServers, agents } = await fetchConfig()
  const defaultLayout = await getDefaultLayout()

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
        <Toaster toastOptions={{ style: { borderRadius: "var(--radius-md)" } }} />
        <Analytics />
      </body>
    </html>
  )
}
