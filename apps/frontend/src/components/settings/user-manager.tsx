"use client"

import { SignInCard } from "@/components/settings/sign-in-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { successToastStyle } from "@/lib/styles"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import { useMutation } from "convex/react"
import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"

interface UserIdManagerProps {
  user: Doc<"users"> | null | undefined
}

export function UserManager({ user }: UserIdManagerProps) {
  const deleteUserMutation = useMutation(api.user.deleteUser)
  const { signIn, signOut } = useAuthActions()

  if (user === undefined) return null
  if (user === null) {
    return (
      <SignInCard
        description="Sign in to see your user information and manage your account."
        onSignIn={() => void signIn("github", { redirectTo: window.location.pathname })}
      />
    )
  }

  const handleDeleteAccount = async () => {
    if (user) {
      await deleteUserMutation({ id: user._id })
      await signOut()
      toast.success("Your account has been deleted.", {
        icon: null,
        id: "account-deleted",
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center gap-4">
          <img src={user.image} alt="User avatar" className="h-16 w-16 rounded-full border object-cover" />
          <div className="flex flex-col">
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" className="hover:cursor-pointer" onClick={() => void signOut()}>
            Sign Out
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="hover:cursor-pointer">
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-destructive" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove your data from our
                  servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="hover:cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="hover:cursor-pointer bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
                >
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  )
}
