"use client"

import { Button } from "@/components/ui/button"
import { useAuthActions } from "@convex-dev/auth/react"
import { Authenticated, Unauthenticated } from "convex/react"

export function SignIn() {
  const { signIn, signOut } = useAuthActions()

  return (
    <>
      <Authenticated>
        <Button variant="outline" className="hover:cursor-pointer" type="button" onClick={() => void signOut()}>
          Sign Out
        </Button>
      </Authenticated>
      <Unauthenticated>
        <Button variant="outline" className="hover:cursor-pointer" type="button" onClick={() => void signIn("github")}>
          Sign In
        </Button>
      </Unauthenticated>
    </>
  )
}
