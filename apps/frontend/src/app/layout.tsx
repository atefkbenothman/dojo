import "./globals.css"
import { VideoPopup } from "@/components/dialog/video-popup"
import { ResizableLayout } from "@/components/layout/resizable-layout"
import { AgentProviderRoot } from "@/hooks/use-agent"
import { AIChatProviderRoot } from "@/hooks/use-chat"
import { ConnectionProviderRoot } from "@/hooks/use-connection"
import { ModelProvider } from "@/hooks/use-model"
import { DarkModeProvider } from "@/providers/dark-mode-provider"
import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dojo",
  description: "Dojo",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        /> */}
      </head>
      <body className={`antialiased ${inter.className}`}>
        <DarkModeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ConnectionProviderRoot>
            <ModelProvider>
              <AIChatProviderRoot>
                <AgentProviderRoot>
                  <ResizableLayout>{children}</ResizableLayout>
                  <VideoPopup />
                </AgentProviderRoot>
              </AIChatProviderRoot>
            </ModelProvider>
          </ConnectionProviderRoot>
        </DarkModeProvider>
        <Toaster toastOptions={{ style: { borderRadius: "var(--radius-md)" } }} />
        <Analytics />
      </body>
    </html>
  )
}
