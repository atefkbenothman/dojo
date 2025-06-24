import "../globals.css"
import { SoundEffectProvider } from "@/hooks/use-sound-effect"
import { DarkModeProvider } from "@/providers/dark-mode-provider"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"

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

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⛩️</text></svg>"
        />
      </head>
      <body className={`antialiased ${GeistSans.className}`}>
        <DarkModeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SoundEffectProvider>
            <div className="min-h-screen w-full">{children}</div>
          </SoundEffectProvider>
        </DarkModeProvider>
      </body>
    </html>
  )
}
