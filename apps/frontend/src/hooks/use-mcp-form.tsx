import { useLocalStorage } from "@/hooks/use-local-storage"
import { getServerConfigWithEnv } from "@/lib/utils"
import type { MCPServer, MCPServerConfig } from "@dojo/config"
import { useState, useEffect } from "react"

export interface EnvPair {
  key: string
  value: string
}

export function useMCPForm(mode: "add" | "edit", server?: MCPServer) {
  const { readStorage } = useLocalStorage()

  const [formData, setFormData] = useState({
    serverName: server?.name || "",
    serverSummary: server?.summary || "",
    command: server?.config?.command || "",
    argsString: (server?.config?.args || []).join(", "),
    envPairs: [] as EnvPair[],
  })

  useEffect(() => {
    if (mode === "edit" && server) {
      const requiredKeys = server.config?.requiresEnv || []
      const configEnv = server.config?.env || {}

      const envPairs = requiredKeys.map((key) => ({
        key,
        value: configEnv[key] || readStorage<string>(key) || "",
      }))

      setFormData((prev) => ({ ...prev, envPairs }))
    }
  }, [mode, server, readStorage])

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const resetForm = () => {
    setFormData({
      serverName: "",
      serverSummary: "",
      command: "",
      argsString: "",
      envPairs: [],
    })
  }

  const createServerFromForm = (): MCPServer => {
    const args = formData.argsString
      .split(",")
      .map((arg) => arg.trim())
      .filter(Boolean)
    const env = Object.fromEntries(formData.envPairs.map((pair) => [pair.key, pair.value]))

    return {
      id: formData.serverName.toLowerCase().replace(/\s+/g, "-"),
      name: formData.serverName,
      ...(formData.serverSummary && { summary: formData.serverSummary }),
      config: {
        command: formData.command,
        args,
        ...(formData.envPairs.length > 0 && {
          env,
          requiresEnv: formData.envPairs.map((pair) => pair.key),
        }),
      },
    }
  }

  const createConfigFromForm = (): MCPServerConfig => {
    const args = formData.argsString
      .split(",")
      .map((arg) => arg.trim())
      .filter(Boolean)
    const env = Object.fromEntries(formData.envPairs.map((pair) => [pair.key, pair.value]))

    return getServerConfigWithEnv(server!, {
      command: formData.command,
      args,
      env,
    })
  }

  const isFormValid = formData.serverName.trim() !== "" && formData.command.trim() !== ""

  return {
    formData,
    updateFormData,
    resetForm,
    createServerFromForm,
    createConfigFromForm,
    isFormValid,
  }
}
