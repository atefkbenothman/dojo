"use client"

import { SignInCard } from "@/components/settings/sign-in-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuthActions } from "@convex-dev/auth/react"
import { Authenticated, Unauthenticated } from "convex/react"
import { useState } from "react"

export function SignIn() {
  const { signIn, signOut } = useAuthActions()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Authenticated>
        <Button variant="outline" className="hover:cursor-pointer" type="button" onClick={() => void signOut()}>
          Sign Out
        </Button>
      </Authenticated>
      <Unauthenticated>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="hover:cursor-pointer" type="button">
              Sign In
            </Button>
          </DialogTrigger>
          <DialogContent className="p-0 border-2 w-sm">
            <DialogHeader className="sr-only">
              <DialogTitle>Sign In with GitHub</DialogTitle>
            </DialogHeader>
            <SignInCard
              description="Sign in to access your agents, workflows, and settings."
              onSignIn={() => {
                setOpen(false)
                void signIn("github", { redirectTo: window.location.pathname })
              }}
            />
          </DialogContent>
        </Dialog>
      </Unauthenticated>
    </>
  )
}
