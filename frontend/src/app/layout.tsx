import type { Metadata } from "next"
import "./globals.css"

import { Inter } from "next/font/google"

import { AIChatProviderRoot } from "@/hooks/use-chat"
import { ConnectionProviderRoot } from "@/hooks/use-connection"
import { DarkModeProvider } from "@/providers/dark-mode-provider"
import { ResizableLayout } from "@/components/layout/resizable-layout"
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
            <AIChatProviderRoot>
              <ResizableLayout>{children}</ResizableLayout>
              <Toaster toastOptions={{ style: { borderRadius: "var(--radius-md)" } }} />
            </AIChatProviderRoot>
          </ConnectionProviderRoot>
        </DarkModeProvider>
      </body>
    </html>
  )
}
