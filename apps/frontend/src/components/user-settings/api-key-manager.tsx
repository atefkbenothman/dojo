"use client"

import { saveApiKey, removeApiKey, getDecryptedApiKeys } from "@/app/actions/api-keys"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SignInCard } from "@/components/user-settings/sign-in-card"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { useAuthActions } from "@convex-dev/auth/react"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { Eye, EyeOff } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface ApiKeyManagerProps {
  user: Doc<"users"> | null | undefined
  userApiKeys: Doc<"apiKeys">[]
  providers: Doc<"providers">[]
}

export function ApiKeyManager({ user, userApiKeys, providers }: ApiKeyManagerProps) {
  const { play } = useSoundEffectContext()
  const { signIn } = useAuthActions()

  // Simplified state management - combine related states
  const [apiKeyState, setApiKeyState] = useState<{
    visibleKeys: Record<Id<"providers">, boolean>
    inputValues: Record<Id<"providers">, string>
    maskedValues: Record<Id<"providers">, string>
    savingState: Record<Id<"providers">, "idle" | "saving">
  }>({
    visibleKeys: {},
    inputValues: {},
    maskedValues: {},
    savingState: {},
  })

  // useEffect must be called before any early returns
  useEffect(() => {
    if (!userApiKeys || !providers || userApiKeys.length === 0 || providers.length === 0) return

    const loadMaskedKeys = async () => {
      const apiKeyData = userApiKeys.map((key) => ({
        providerId: key.providerId,
        apiKey: key.apiKey,
      }))

      // Get masked versions from server action
      const masked = await getDecryptedApiKeys(apiKeyData)

      // Initialize input values as empty (user will enter full keys)
      const initialInputValues = providers.reduce<Record<Id<"providers">, string>>((acc, provider) => {
        acc[provider._id] = ""
        return acc
      }, {})

      setApiKeyState((prev) => ({
        ...prev,
        maskedValues: masked,
        inputValues: initialInputValues,
      }))
    }

    loadMaskedKeys()
  }, [userApiKeys, providers])

  // Early returns for cleaner conditional rendering
  if (user === undefined) return null
  if (user === null) {
    return (
      <SignInCard
        description="Please sign in to manage and save your API keys securely."
        onSignIn={() => void signIn("github", { redirectTo: window.location.pathname })}
      />
    )
  }

  const toggleVisibility = (providerId: Id<"providers">) => {
    setApiKeyState((prev) => ({
      ...prev,
      visibleKeys: { ...prev.visibleKeys, [providerId]: !prev.visibleKeys[providerId] },
    }))
  }

  const handleInputChange = (providerId: Id<"providers">, value: string) => {
    setApiKeyState((prev) => ({
      ...prev,
      inputValues: { ...prev.inputValues, [providerId]: value },
      savingState: { ...prev.savingState, [providerId]: "idle" },
    }))
  }

  const handleSave = async (providerId: Id<"providers">) => {
    setApiKeyState((prev) => ({
      ...prev,
      savingState: { ...prev.savingState, [providerId]: "saving" },
    }))

    const apiKey = apiKeyState.inputValues[providerId]

    try {
      if (!apiKey) {
        const result = await removeApiKey(user._id, providerId)
        if (result) {
          toast.error("API key removed", {
            icon: null,
            id: "api-key-removed",
            duration: 5000,
            position: "bottom-center",
            style: errorToastStyle,
          })
          setTimeout(() => {
            play("./sounds/delete.mp3", { volume: 0.5 })
          }, 100)
        }
      } else {
        // Use server action to encrypt and save
        await saveApiKey(user._id, providerId, apiKey)
        toast.success("API keys saved to database", {
          icon: null,
          id: "api-key-saved",
          duration: 5000,
          position: "bottom-center",
          style: successToastStyle,
        })
        setTimeout(() => {
          play("./sounds/save.mp3", { volume: 0.5 })
        }, 100)
      }

      // Clear the input after saving
      setApiKeyState((prev) => ({
        ...prev,
        inputValues: { ...prev.inputValues, [providerId]: "" },
      }))
    } catch (error) {
      console.error(error)
    } finally {
      setApiKeyState((prev) => ({
        ...prev,
        savingState: { ...prev.savingState, [providerId]: "idle" },
      }))
    }
  }

  const isDirty = (providerId: Id<"providers">) => {
    return (apiKeyState.inputValues[providerId] || "").length > 0
  }

  return (
    <div className="space-y-4 pb-4">
      {providers.map((provider) => {
        const { _id: providerId, name } = provider
        const inputValue = apiKeyState.inputValues[providerId] || ""
        const maskedValue = apiKeyState.maskedValues[providerId] || ""
        const isVisible = apiKeyState.visibleKeys[providerId] || false
        const isSaving = apiKeyState.savingState[providerId] === "saving"
        const isDirtyKey = isDirty(providerId)

        // Simplified display value logic
        const displayValue = inputValue || maskedValue
        const placeholder = maskedValue ? "Enter new key to update" : "Enter API key"

        return (
          <Card key={providerId}>
            <CardHeader>
              <CardTitle className="capitalize">{name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  id={`api-key-${providerId}`}
                  type={isVisible ? "text" : "password"}
                  value={displayValue}
                  onChange={(e) => handleInputChange(providerId, e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 text-muted-foreground"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="hover:cursor-pointer"
                  onClick={() => toggleVisibility(providerId)}
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end items-center">
              <Button
                size="default"
                variant={isSaving || isDirtyKey ? "default" : "secondary"}
                className="hover:cursor-pointer"
                onClick={() => handleSave(providerId)}
                disabled={isSaving || !isDirtyKey}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
