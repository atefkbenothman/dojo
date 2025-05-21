import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MCPServer, MCPServerConfig } from "@dojo/config"
import { useState } from "react"

interface AddMCPDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddServer: (server: MCPServer) => void
}

interface EnvPair {
  key: string
  value: string
}

function EnvInputFields({
  envPairs,
  onEnvChange,
  onAddKey,
  onRemoveKey,
  onKeyNameChange,
  onValueChange,
}: {
  envPairs: EnvPair[]
  onEnvChange: (idx: number, value: string) => void
  onAddKey: () => void
  onRemoveKey: (idx: number) => void
  onKeyNameChange: (idx: number, newKey: string) => void
  onValueChange: (idx: number, newValue: string) => void
}) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="environment">
        <AccordionTrigger className="hover:cursor-pointer">Environment Variables</AccordionTrigger>
        <AccordionContent className="p-2">
          <div className="grid gap-2">
            {envPairs.map((pair, idx) => (
              <div className="flex gap-2 items-center" key={idx}>
                <Input
                  value={pair.key}
                  onChange={(e) => onKeyNameChange(idx, e.target.value)}
                  className="w-1/2 bg-muted/70 text-xs text-primary/90"
                  placeholder="KEY_NAME"
                />
                <Input
                  value={pair.value}
                  onChange={(e) => onValueChange(idx, e.target.value)}
                  className="w-1/2 bg-muted/50"
                  placeholder="Value"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-1 text-destructive"
                  onClick={() => onRemoveKey(idx)}
                  tabIndex={-1}
                  aria-label={`Remove ${pair.key}`}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" className="w-full mt-2" onClick={onAddKey}>
              + Add Key
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export function AddMCPDialog({ open, onOpenChange, onAddServer }: AddMCPDialogProps) {
  const [serverName, setServerName] = useState("")
  const [serverSummary, setServerSummary] = useState("")
  const [command, setCommand] = useState("")
  const [argsString, setArgsString] = useState("")
  const [envPairs, setEnvPairs] = useState<EnvPair[]>([])

  function handleAddKey() {
    setEnvPairs((prev) => [...prev, { key: "API_KEY", value: "" }])
  }

  function handleRemoveKey(idx: number) {
    setEnvPairs((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleKeyNameChange(idx: number, newKey: string) {
    setEnvPairs((prev) => prev.map((pair, i) => (i === idx ? { ...pair, key: newKey } : pair)))
  }

  function handleValueChange(idx: number, newValue: string) {
    setEnvPairs((prev) => prev.map((pair, i) => (i === idx ? { ...pair, value: newValue } : pair)))
  }

  const isFormValid = !!serverName && !!command

  const handleSave = () => {
    if (!isFormValid) return
    const args = argsString
      .split(",")
      .map((arg) => arg.trim())
      .filter(Boolean)
    const env: Record<string, string> = {}
    envPairs.forEach((pair) => {
      env[pair.key] = pair.value
    })
    const serverId = serverName.toLowerCase().replace(/\s+/g, "-")
    const config: MCPServerConfig = {
      command,
      args,
      env: envPairs.length > 0 ? env : undefined,
      requiresEnv: envPairs.length > 0 ? envPairs.map((pair) => pair.key) : undefined,
    }
    const newServer: MCPServer = {
      id: serverId,
      name: serverName,
      ...(serverSummary ? { summary: serverSummary } : {}),
      config,
    }
    onAddServer(newServer)
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setServerName("")
    setServerSummary("")
    setCommand("")
    setArgsString("")
    setEnvPairs([])
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm()
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="border sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add New MCP Server</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="serverName" className="text-primary/80 text-xs">
              Name
            </Label>
            <Input
              id="serverName"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Server Name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="summary" className="text-primary/80 text-xs">
              Summary (optional)
            </Label>
            <Input
              id="summary"
              value={serverSummary}
              onChange={(e) => setServerSummary(e.target.value)}
              placeholder="Short description of the server capabilities"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="command" className="text-primary/80 text-xs">
              Command
            </Label>
            <Input
              id="command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
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
              onChange={(e) => setArgsString(e.target.value)}
              placeholder="Comma separated, e.g: -f,file.py,--verbose"
            />
          </div>
          <EnvInputFields
            envPairs={envPairs}
            onEnvChange={handleValueChange}
            onAddKey={handleAddKey}
            onRemoveKey={handleRemoveKey}
            onKeyNameChange={handleKeyNameChange}
            onValueChange={handleValueChange}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onMouseDown={handleSave}
            className="hover:cursor-pointer"
            disabled={!isFormValid}
          >
            Create Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
