import { DarkModeToggle } from "@/components/dark-mode-toggle"
import { GithubLinkButton } from "@/components/github-link-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Server, Bot, Layers, ArrowRight, Zap, Shield, Globe } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⛩️</span>
            <span className="text-xl font-bold">Dojo</span>
          </div>
          <div className="flex items-center space-x-4">
            <GithubLinkButton />
            <DarkModeToggle />
            <Button asChild>
              <Link href="/dashboard">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="text-center space-y-8 max-w-4xl">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Build, Run, and Chain
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Agent Workflows
              </span>
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Dojo enables sophisticated multi-agent workflows by combining LLMs with specialized tools through the
              Model Context Protocol (MCP). Configure agents, define behaviors, and chain them together to solve complex
              tasks.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="https://github.com/kaipeps/dojo" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/50">
        <div className="container px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Everything you need to build AI workflows
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-lg dark:text-gray-400">
              Powerful tools and integrations to create sophisticated AI agent workflows
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* MCP Integration */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>MCP Integration</CardTitle>
                </div>
                <CardDescription>
                  Connect to Model Context Protocol servers and access specialized tools for your agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                    Tool discovery and aggregation
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                    Real-time connection management
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                    Session-based tool access
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Agent Builder */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Bot className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>Agent Builder</CardTitle>
                </div>
                <CardDescription>
                  Create custom AI agents with specific behaviors, tools, and capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Custom agent configuration
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Tool-augmented responses
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Multiple AI model support
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Workflow Engine */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Layers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle>Workflow Engine</CardTitle>
                </div>
                <CardDescription>
                  Chain agents together in sophisticated workflows with context passing and retry logic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    Sequential step execution
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    Context sharing between agents
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    Visual workflow builder
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle>High Performance</CardTitle>
                </div>
                <CardDescription>Built with modern technologies for fast, reliable AI agent execution</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                    Real-time streaming responses
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                    Model instance caching
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                    Optimized database queries
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <CardTitle>Secure by Design</CardTitle>
                </div>
                <CardDescription>
                  Enterprise-grade security with encrypted API keys and session management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                    AES-256-GCM encryption
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                    Session-based access control
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                    Secure API key management
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Open Source */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Globe className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <CardTitle>Open Source</CardTitle>
                </div>
                <CardDescription>
                  Fully open source and extensible. Contribute, customize, and deploy anywhere
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
                    MIT licensed
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
                    Community driven
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
                    Self-hostable
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container px-4">
          <div className="text-center space-y-8 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Ready to build your first AI workflow?</h2>
            <p className="text-gray-500 md:text-lg dark:text-gray-400">
              Start creating sophisticated AI agent workflows in minutes. No complex setup required.
            </p>
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container px-4">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⛩️</span>
              <span className="font-medium">Dojo</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Built with ❤️ for the AI community</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
