"use server"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Server, Layers } from "lucide-react"
import Link from "next/link"

export default async function Dashboard() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 w-96">
        {/* MCP Box */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Server className="h-6 w-6 text-muted-foreground" />
              <CardTitle>Connect your tools</CardTitle>
            </div>
            <CardDescription>Enable AI to interact with external services</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mcp">
              <Button variant="outline" className="w-full hover:cursor-pointer">
                Configure MCP Connections
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-8 bg-border" />
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-border" />
        </div>

        {/* Agent Box */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="h-6 w-6 text-muted-foreground" />
              <CardTitle>Build AI agents</CardTitle>
            </div>
            <CardDescription>Create assistants that use your connected tools</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/agent">
              <Button variant="outline" className="w-full hover:cursor-pointer">
                Configure Agents
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-8 bg-border" />
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-border" />
        </div>

        {/* Workflow Box */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Layers className="h-6 w-6 text-muted-foreground" />
              <CardTitle>Chain agents together</CardTitle>
            </div>
            <CardDescription>Automate complex tasks with multiple agents</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/workflow">
              <Button variant="outline" className="w-full hover:cursor-pointer">
                Build Workflows
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
