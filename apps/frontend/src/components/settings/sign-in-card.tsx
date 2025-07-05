"use client"

import { MCP_SERVER_ICONS } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { ComponentType, SVGProps } from "react"

interface SignInCardProps {
  description: string
  onSignIn: () => void
}

export function SignInCard({ description, onSignIn }: SignInCardProps) {
  const GitHubIcon = MCP_SERVER_ICONS.github as ComponentType<SVGProps<SVGSVGElement>> | null

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign In with GitHub</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full hover:cursor-pointer" onClick={onSignIn}>
            {GitHubIcon && <GitHubIcon className="mr-2 h-5 w-5" />}
            Sign in with GitHub
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
