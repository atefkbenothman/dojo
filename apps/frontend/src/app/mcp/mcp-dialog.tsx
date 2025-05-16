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
import { Textarea } from "@/components/ui/textarea"
import { MCP_CONFIG } from "@/lib/config"
import { MCPServerConfig, Server } from "@/lib/types"
import { Settings } from "lucide-react"
import { useState } from "react"

interface MCPDialogProps {
  server: Server
  onSaveConfig: (config: MCPServerConfig) => void
  savedConfig?: MCPServerConfig
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MCPDialog({ server, onSaveConfig, savedConfig, open, onOpenChange }: MCPDialogProps) {
  const [config, setConfig] = useState<MCPServerConfig>(() => {
    if (savedConfig) {
      return savedConfig
    }
    const defaultConfig = MCP_CONFIG[server.id]
    if (defaultConfig) {
      return {
        id: server.id,
        name: server.name,
        command: defaultConfig.command,
        args: defaultConfig.args,
        env: defaultConfig.env,
      }
    }
    return {
      id: server.id,
      name: server.name,
      command: "",
      args: [],
      env: {},
    }
  })
  const [argsString, setArgsString] = useState(() =>
    savedConfig?.args ? savedConfig.args.join(", ") : config.args.join(", "),
  )
  const [envString, setEnvString] = useState(() => {
    if (savedConfig?.env) {
      return Object.entries(savedConfig.env)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")
    }
    if (config.env) {
      return Object.entries(config.env)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")
    }
    return ""
  })

  const handleSave = () => {
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

    const updatedConfig: MCPServerConfig = {
      ...config,
      args,
      env: Object.keys(env).length > 0 ? env : undefined,
    }

    onSaveConfig(updatedConfig)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
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
              <Label htmlFor="displayName" className="text-primary/80 text-xs">
                Name
              </Label>
              <Input
                id="displayName"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="command" className="text-primary/80 text-xs">
                Command
              </Label>
              <Input
                id="command"
                value={config.command}
                onChange={(e) => setConfig({ ...config, command: e.target.value })}
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
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
