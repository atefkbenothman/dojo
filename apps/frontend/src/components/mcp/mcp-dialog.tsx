"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { env as globalEnv } from "@/env.js"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { errorToastStyle } from "@/lib/styles"
import { getServerConfigWithEnv } from "@/lib/utils"
import type { MCPServer, MCPServerConfig } from "@dojo/config/src/types"
import { Settings } from "lucide-react"
import { useState, type ChangeEvent } from "react"
import { toast } from "sonner"

function EnvInputFields({
  requiredEnvKeys,
  envValues,
  onEnvChange,
}: {
  requiredEnvKeys: string[] | undefined
  envValues: Record<string, string>
  onEnvChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="environment">
        <AccordionTrigger className="hover:cursor-pointer">Environment Variables</AccordionTrigger>
        <AccordionContent className="p-2">
          <div className="grid gap-2">
            {requiredEnvKeys?.map((keyName) => (
              <div className="flex gap-2 items-center" key={keyName}>
                <Input
                  value={keyName}
                  disabled
                  className="w-1/2 bg-muted/70 text-xs text-primary/70 cursor-not-allowed"
                />
                <Input
                  id={keyName}
                  name={keyName}
                  value={envValues[keyName] ?? ""}
                  onChange={onEnvChange}
                  className="w-1/2 bg-muted/50"
                />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

interface MCPDialogProps {
  server: MCPServer
  open: boolean
  onSaveConfig: (config: MCPServerConfig) => void
  onOpenChange: (open: boolean) => void
}

export function MCPDialog({ server, open, onSaveConfig, onOpenChange }: MCPDialogProps) {
  const { play } = useSoundEffectContext()
  const { readStorage, removeStorage } = useLocalStorage()

  const [command, setCommand] = useState(server.config?.command || "")
  const [argsString, setArgsString] = useState((server.config?.args || []).join(", "))
  const [env, setEnv] = useState<Record<string, string>>(getInitialEnv())

  function getInitialEnv(): Record<string, string> {
    const requiredKeys = server.config?.requiresEnv || []
    const configEnv = server.config?.env || {}

    const envObj: Record<string, string> = {}

    for (const key of requiredKeys) {
      if (configEnv[key] && configEnv[key].trim() !== "") {
        envObj[key] = configEnv[key]
      } else {
        const localValue = readStorage<string>(key)
        if (localValue && localValue.trim() !== "") {
          envObj[key] = localValue
        } else {
          const envValue = globalEnv[`NEXT_PUBLIC_${key}` as keyof typeof globalEnv]
          envObj[key] = envValue && envValue.trim() !== "" ? envValue : ""
        }
      }
    }
    return envObj
  }

  const handleEnvChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEnv((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = () => {
    play("./click.mp3", { volume: 0.5 })
    const finalArgs = argsString
      .split(",")
      .map((arg) => arg.trim())
      .filter(Boolean)

    const updatedConfig: MCPServerConfig = getServerConfigWithEnv(server, {
      command,
      args: finalArgs,
      env,
    })

    onSaveConfig(updatedConfig)
    onOpenChange(false)
  }

  const handleDelete = () => {
    play("./click.mp3", { volume: 0.5 })
    removeStorage(`mcp_config_${server.id}`)
    onOpenChange(false)
    toast.error(`${server.name} config deleted from localstorage`, {
      icon: null,
      id: "mcp-config-deleted",
      duration: 5000,
      position: "bottom-center",
      style: errorToastStyle,
    })
    setTimeout(() => {
      play("./delete.mp3", { volume: 0.5 })
    }, 100)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
          onMouseDown={() => play("./click.mp3", { volume: 0.5 })}
          size="icon"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Configure {server.name}</DialogTitle>
          <DialogDescription>{server.summary}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="command" className="text-primary/80 text-xs">
              Command
            </Label>
            <Input
              id="command"
              value={command}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCommand(e.target.value)}
              placeholder="e.g., python3, node, bash"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="args" className="text-primary/80 text-xs">
              Arguments
            </Label>
            <Input
              id="args"
              value={argsString}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setArgsString(e.target.value)}
              placeholder="Comma separated, e.g: -f,file.py,--verbose"
            />
          </div>
          {server.config?.requiresEnv && server.config?.requiresEnv.length > 0 && (
            <EnvInputFields
              requiredEnvKeys={server.config?.requiresEnv}
              envValues={env}
              onEnvChange={handleEnvChange}
            />
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            className="hover:cursor-pointer border-destructive"
            onMouseDown={handleDelete}
          >
            Delete
          </Button>
          <Button type="button" variant="secondary" onMouseDown={handleSave} className="hover:cursor-pointer border">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
