"use client"

import { EnvInputFields } from "@/components/mcp/env-input-fields"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMCPForm } from "@/hooks/use-mcp-form"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle, errorToastStyle } from "@/lib/styles"
import type { MCPServer, MCPServerConfig } from "@dojo/config"
import { toast } from "sonner"

export interface MCPDialogProps {
  mode: "add" | "edit"
  server?: MCPServer
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddServer?: (server: MCPServer) => void
  onSaveConfig?: (config: MCPServerConfig) => void
  onDelete?: () => void
}

export function MCPDialog({ mode, server, open, onOpenChange, onAddServer, onSaveConfig, onDelete }: MCPDialogProps) {
  const { play } = useSoundEffectContext()
  const { formData, updateFormData, resetForm, createServerFromForm, createConfigFromForm, isFormValid } = useMCPForm(
    mode,
    server,
  )

  const handleSave = () => {
    play("./sounds/click.mp3", { volume: 0.5 })

    if (!isFormValid) return

    if (mode === "add" && onAddServer) {
      const newServer = createServerFromForm()
      onAddServer(newServer)
      toast.success(`${newServer.name} config added to localstorage`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
      setTimeout(() => play("./sounds/save.mp3", { volume: 0.5 }), 100)
    } else if (mode === "edit" && onSaveConfig && server) {
      const updatedConfig = createConfigFromForm()
      onSaveConfig(updatedConfig)
      toast.success(`${server.name} config saved to localstorage`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
      setTimeout(() => play("./sounds/save.mp3", { volume: 0.5 }), 100)
    }

    handleClose()
  }

  const handleDelete = () => {
    if (!onDelete || !server) return

    play("./sounds/click.mp3", { volume: 0.5 })
    onDelete()
    toast.error(`${server.name} config deleted from localstorage`, {
      icon: null,
      duration: 5000,
      position: "bottom-center",
      style: errorToastStyle,
    })
    setTimeout(() => play("./sounds/delete.mp3", { volume: 0.5 }), 100)
    handleClose()
  }

  const handleClose = () => {
    if (mode === "add") resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add MCP Server" : `Configure ${server?.name}`}</DialogTitle>
          {mode === "edit" && server?.summary && <p className="text-sm text-muted-foreground">{server.summary}</p>}
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {mode === "add" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="serverName" className="text-primary/80 text-xs">
                  Name
                </Label>
                <Input
                  id="serverName"
                  value={formData.serverName}
                  onChange={(e) => updateFormData({ serverName: e.target.value })}
                  placeholder="Server Name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="summary" className="text-primary/80 text-xs">
                  Summary (optional)
                </Label>
                <Input
                  id="summary"
                  value={formData.serverSummary}
                  onChange={(e) => updateFormData({ serverSummary: e.target.value })}
                  placeholder="Short description of server capabilities"
                />
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="command" className="text-primary/80 text-xs">
              Command
            </Label>
            <Input
              id="command"
              value={formData.command}
              onChange={(e) => updateFormData({ command: e.target.value })}
              placeholder="e.g., python3, node, bash"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="args" className="text-primary/80 text-xs">
              Arguments
            </Label>
            <Input
              id="args"
              value={formData.argsString}
              onChange={(e) => updateFormData({ argsString: e.target.value })}
              placeholder="Comma separated, e.g: -f,file.py,--verbose"
            />
          </div>

          <EnvInputFields
            envPairs={formData.envPairs}
            mode={mode}
            onUpdateEnvPairs={(envPairs) => updateFormData({ envPairs })}
          />
        </div>

        <DialogFooter>
          {mode === "edit" && (
            <Button variant="destructive" onClick={handleDelete} className="hover:cursor-pointer border-destructive">
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={!isFormValid} className="hover:cursor-pointer" variant="secondary">
            {mode === "add" ? "Create Server" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
