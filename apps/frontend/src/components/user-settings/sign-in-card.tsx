"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface SignInCardProps {
  description: string
  onSignIn: () => void
}

export function SignInCard({ description, onSignIn }: SignInCardProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign In to Continue</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full hover:cursor-pointer" onClick={onSignIn}>
            Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
