import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MCPServerConfig, Server } from "@/lib/types"
import { useState } from "react"

interface AddMCPDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddServer: (server: Server, config: MCPServerConfig) => void
}

export function AddMCPDialog({ open, onOpenChange, onAddServer }: AddMCPDialogProps) {
  const [serverId, setServerId] = useState<string>("")
  const [serverName, setServerName] = useState<string>("")
  const [serverSummary, setServerSummary] = useState<string>("")
  const [command, setCommand] = useState<string>("")
  const [argsString, setArgsString] = useState<string>("")
  const [envString, setEnvString] = useState<string>("")

  const handleSave = () => {
    if (!serverId || !serverName || !serverSummary || !command) {
      return
    }

    const args = argsString
      .split(",")
      .map((arg) => arg.trim())
      .filter(Boolean)

    const env: Record<string, string> = {}
    envString.split("\n").forEach((line) => {
      const [key, value] = line.split("=").map((part) => part.trim())
      if (key && value) {
        env[key] = value
      }
    })

    const newServer: Server = {
      id: serverId,
      name: serverName,
      summary: serverSummary,
    }

    const newConfig: MCPServerConfig = {
      id: serverId,
      name: serverName,
      command,
      args,
      env: Object.keys(env).length > 0 ? env : undefined,
    }

    onAddServer(newServer, newConfig)
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setServerId("")
    setServerName("")
    setServerSummary("")
    setCommand("")
    setArgsString("")
    setEnvString("")
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
            <Label htmlFor="serverId" className="text-primary/80 text-xs">
              Server ID
            </Label>
            <Input
              id="serverId"
              value={serverId}
              onChange={(e) => setServerId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="unique-server-id"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="displayName" className="text-primary/80 text-xs">
              Name
            </Label>
            <Input
              id="displayName"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Server Name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="summary" className="text-primary/80 text-xs">
              Summary
            </Label>
            <Textarea
              id="summary"
              value={serverSummary}
              onChange={(e) => setServerSummary(e.target.value)}
              placeholder="Short description of the server capabilities"
              rows={2}
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
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="environment">
              <AccordionTrigger className="hover:cursor-pointer">Environment Variables</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2">
                  <Label htmlFor="env" className="text-primary/80 text-xs">
                    Environment
                  </Label>
                  <Textarea
                    id="env"
                    value={envString}
                    onChange={(e) => setEnvString(e.target.value)}
                    placeholder="KEY=value&#10;ANOTHER_KEY=another_value"
                    rows={3}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onMouseDown={handleSave} className="hover:cursor-pointer">
            Create Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
