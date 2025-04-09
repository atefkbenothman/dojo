import type { Metadata } from "next"
import "./globals.css"

import { Inter } from "next/font/google"

import { DarkModeProvider } from "@/providers/dark-mode-provider"
import { AIChatProvider } from "@/hooks/use-chat"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MCP Frontend",
  description: "MCP Frontend",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased ${inter.className}`}>
        <DarkModeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AIChatProvider>
            <main>{children}</main>
            <Toaster
              toastOptions={{ style: { borderRadius: "var(--radius-md)" } }}
            />
          </AIChatProvider>
        </DarkModeProvider>
      </body>
    </html>
  )
}
