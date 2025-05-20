import "./globals.css"
import { ResizableLayout } from "@/components/layout/resizable-layout"
import { AgentProviderRoot } from "@/hooks/use-agent"
import { AIChatProviderRoot } from "@/hooks/use-chat"
import { ConnectionProviderRoot } from "@/hooks/use-mcp"
import { ModelProvider } from "@/hooks/use-model"
import { UserProvider } from "@/hooks/use-user-id"
import { DarkModeProvider } from "@/providers/dark-mode-provider"
import type { AgentConfig } from "@dojo/config"
import type { AIModel, MCPServer } from "@dojo/config"
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
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8888"
  const res = await fetch(`${backendUrl}/config`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch config from backend")
  const data = await res.json()
  return {
    aiModels: data.aiModels || {},
    mcpServers: data.mcpServers || {},
    agents: data.agents || {},
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
      {/* <head>
        <script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js" />
      </head> */}
      <body className={`antialiased ${inter.className}`}>
        <DarkModeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UserProvider>
            <ConnectionProviderRoot mcpServers={mcpServers}>
              <ModelProvider aiModels={aiModels}>
                <AIChatProviderRoot>
                  <AgentProviderRoot agents={agents}>
                    <ResizableLayout defaultLayout={defaultLayout}>{children}</ResizableLayout>
                  </AgentProviderRoot>
                </AIChatProviderRoot>
              </ModelProvider>
            </ConnectionProviderRoot>
          </UserProvider>
        </DarkModeProvider>
        <Toaster toastOptions={{ style: { borderRadius: "var(--radius-md)" } }} />
        <Analytics />
      </body>
    </html>
  )
}
