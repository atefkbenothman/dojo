"use client"

import { saveApiKey, removeApiKey, getDecryptedApiKeys } from "@/app/actions/api-keys"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { Eye, EyeOff } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface ApiKeyManagerProps {
  userApiKeys: Doc<"apiKeys">[]
  providers: Doc<"providers">[]
}

export function ApiKeyManager({ userApiKeys, providers }: ApiKeyManagerProps) {
  const { play } = useSoundEffectContext()

  const [keyStates, setKeyStates] = useState<
    Record<
      Id<"providers">,
      {
        value: string
        stored: string
        visible: boolean
        saving: boolean
      }
    >
  >({})

  // Load decrypted keys on mount
  useEffect(() => {
    if (!userApiKeys.length || !providers.length) return

    const loadDecryptedKeys = async () => {
      const apiKeyData = userApiKeys.map((key) => ({
        providerId: key.providerId,
        apiKey: key.apiKey,
      }))

      const decrypted = await getDecryptedApiKeys(apiKeyData)

      // Initialize state for all providers
      const initialState: typeof keyStates = {}
      providers.forEach((provider) => {
        initialState[provider._id] = {
          value: decrypted[provider._id] || "",
          stored: decrypted[provider._id] || "",
          visible: false,
          saving: false,
        }
      })

      setKeyStates(initialState)
    }

    loadDecryptedKeys()
  }, [userApiKeys, providers])

  const updateKeyState = (providerId: Id<"providers">, updates: Partial<(typeof keyStates)[Id<"providers">]>) => {
    setKeyStates((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], ...updates },
    }))
  }

  const handleSave = async (providerId: Id<"providers">) => {
    const state = keyStates[providerId]
    if (!state) return

    updateKeyState(providerId, { saving: true })

    try {
      if (!state.value && state.stored) {
        // Remove key if empty and there was a stored value
        const result = await removeApiKey(providerId)
        if (result) {
          toast.error("API key removed", {
            icon: null,
            id: "api-key-removed",
            duration: 5000,
            position: "bottom-center",
            style: errorToastStyle,
          })
          play("./sounds/delete.mp3", { volume: 0.5 })

          // Update stored value
          updateKeyState(providerId, { stored: "" })
        }
      } else if (state.value) {
        // Save new key
        await saveApiKey(providerId, state.value)
        toast.success("API key saved", {
          icon: null,
          id: "api-key-saved",
          duration: 5000,
          position: "bottom-center",
          style: successToastStyle,
        })
        play("./sounds/save.mp3", { volume: 0.5 })

        // Update stored value
        updateKeyState(providerId, { stored: state.value })
      }
    } catch (error) {
      console.error("Failed to save API key:", error)
      toast.error("Failed to save API key", {
        icon: null,
        id: "api-key-save-failed",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
    } finally {
      updateKeyState(providerId, { saving: false })
    }
  }

  return (
    <div className="space-y-4 pb-4">
      {providers.map((provider) => {
        const { _id: providerId, name } = provider
        const state = keyStates[providerId] || { value: "", stored: "", visible: false, saving: false }
        const hasChanges = state.value !== state.stored
        return (
          <Card key={providerId}>
            <CardHeader>
              <CardTitle className="capitalize">{name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  id={`api-key-${providerId}`}
                  type={state.visible ? "text" : "password"}
                  value={state.value}
                  onChange={(e) => updateKeyState(providerId, { value: e.target.value })}
                  className="flex-1 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateKeyState(providerId, { visible: !state.visible })}
                  className="hover:cursor-pointer"
                >
                  {state.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                variant={hasChanges ? "default" : "secondary"}
                onClick={() => handleSave(providerId)}
                disabled={state.saving || !hasChanges}
                className="hover:cursor-pointer"
              >
                {state.saving ? "Saving..." : "Save"}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
