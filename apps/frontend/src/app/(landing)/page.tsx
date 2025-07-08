"use client"

import { DemoVideo } from "@/components/demo-video"
import { MCP_SERVER_ICONS } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sun, Moon, ArrowRight, X } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function LandingPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false)
  const GitHubIcon = MCP_SERVER_ICONS.github as React.ComponentType<{ className?: string }>

  // Prefetch all app routes immediately when landing page loads
  useEffect(() => {
    router.prefetch("/dashboard")
    router.prefetch("/mcp")
    router.prefetch("/agent")
    router.prefetch("/workflow")
  }, [router])

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const isDark = theme === "dark"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-foreground">Dojo</span>
            <div className="flex items-center gap-4">
              {mounted && (
                <Button variant="outline" size="icon" onClick={toggleTheme} className="hover:cursor-pointer">
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              )}
              <Button variant="outline" size="icon" asChild className="hover:cursor-pointer">
                <Link href="https://github.com/atefkbenothman/dojo" target="_blank" rel="noopener noreferrer">
                  {GitHubIcon && <GitHubIcon className="w-4 h-4" />}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Vercel Badge */}
          <div className="inline-flex items-center px-3 py-1 bg-muted border border-border text-xs text-muted-foreground mb-8 rounded-none">
            Part of the Vercel AI Accelerator
          </div>

          <h1 className="text-6xl md:text-8xl font-bold text-foreground mb-12 leading-none">
            Build AI Agent Workflows
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create and chain AI agents that automate complex tasks
          </p>

          {/* Key Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mb-16">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">No login required</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">No payment required</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">Bring your own keys</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mb-32">
            <Button size="lg" asChild className="hover:cursor-pointer h-12">
              <Link href="/dashboard">
                Start Building
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" className="hover:cursor-pointer h-12" onClick={() => setIsVideoPopupOpen(true)}>
              Watch Demo
            </Button>
          </div>

          {/* Process Steps - Horizontal */}
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-8 h-8 flex items-center justify-center text-sm font-medium mb-4 text-foreground">
                  1
                </div>
                <h3 className="text-foreground font-medium mb-2">Connect to MCP servers</h3>
                <p className="text-muted-foreground text-sm">Add tools and capabilities to your workspace</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-8 h-8 flex items-center justify-center text-sm font-medium mb-4 text-foreground">
                  2
                </div>
                <h3 className="text-foreground font-medium mb-2">Create Agents</h3>
                <p className="text-muted-foreground text-sm">Build AI workers with custom prompts and models</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-8 h-8 flex items-center justify-center text-sm font-medium mb-4 text-foreground">
                  3
                </div>
                <h3 className="text-foreground font-medium mb-2">Build Workflows</h3>
                <p className="text-muted-foreground text-sm">Chain agents together for complex automation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Popup */}
      <Dialog open={isVideoPopupOpen} onOpenChange={setIsVideoPopupOpen}>
        <DialogContent className="sm:max-w-2xl p-0">
          <DialogTitle />
          <div className="p-12">
            <div className="aspect-video">
              <video src={"/demo.mp4"} controls autoPlay className="w-full h-full" tabIndex={-1} />
            </div>
          </div>
          <DialogClose className="absolute right-4 top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  )
}
