"use client"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useMCPContext } from "@/hooks/use-mcp"
import { useModelContext } from "@/hooks/use-model"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import type { AgentConfig, MCPServer } from "@dojo/config"
import { PlusIcon } from "lucide-react"
import { useCallback, useState } from "react"

interface AgentBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddAgent?: (agent: AgentConfig) => void
}

function AgentBuilderDialog({ open, onOpenChange, onAddAgent }: AgentBuilderDialogProps) {
  const { mcpServers, connect, disconnect, getConnectionStatus } = useMCPContext()
  const { selectedModel, models, setSelectedModelId } = useModelContext()

  const isConnected = useCallback(
    (serverId: string) => {
      return getConnectionStatus(serverId) === "connected"
    },
    [getConnectionStatus],
  )

  const [agentName, setAgentName] = useState("")
  const [persona, setPersona] = useState("")
  const [maxSteps, setMaxSteps] = useState(10)

  const handleServiceToggle = async (server: MCPServer, checked: boolean | "indeterminate") => {
    if (checked === true) {
      await connect({ server })
    } else {
      await disconnect(server.id)
    }
  }

  const handleCreateAgent = () => {
    const selectedServices = Object.values(mcpServers).filter((server: MCPServer) => isConnected(server.id))
    const newAgent: AgentConfig = {
      id: `${agentName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      name: agentName,
      modelId: selectedModel.id,
      systemPrompt: persona,
      mcpServers: selectedServices,
      maxExecutionSteps: maxSteps,
    }
    if (onAddAgent) {
      onAddAgent(newAgent)
    }
    setAgentName("")
    setPersona("")
    setMaxSteps(10)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>{"Define your AI agent's capabilities, personality, and behavior"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="agentName" className="font-medium">
              Agent Name
            </Label>
            <Input
              id="agentName"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modelSelect" className="font-medium">
              LLM Model
            </Label>
            <Select value={selectedModel.id} onValueChange={(value) => setSelectedModelId(value)}>
              <SelectTrigger id="modelSelect">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona" className="font-medium">
              Agent Persona
            </Label>
            <Textarea
              id="persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="min-h-[120px]"
              placeholder="Define the agent's persona, objectives, constraints, and behavior instructions..."
            />
          </div>
          <div className="space-y-3">
            <Label className="font-medium">MCP Servers</Label>
            <div className="bg-muted/40 grid gap-3 rounded-lg p-4 sm:grid-cols-2">
              {Object.values(mcpServers).map((server: MCPServer) => (
                <div
                  key={server.id}
                  className={cn(
                    "flex items-center space-x-3 rounded-md border p-3",
                    isConnected(server.id) && "bg-primary/5 border-primary/30",
                  )}
                >
                  <Checkbox
                    id={`service-${server.id}`}
                    checked={isConnected(server.id)}
                    onCheckedChange={(checked: boolean | "indeterminate") => handleServiceToggle(server, checked)}
                  />
                  <div className="flex flex-1 items-center gap-2">
                    <Label htmlFor={`service-${server.id}`} className="cursor-pointer font-normal">
                      {server.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxSteps" className="font-medium">
              Maximum Execution Steps
            </Label>
            <Select value={String(maxSteps)} onValueChange={(value) => setMaxSteps(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select step limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 steps</SelectItem>
                <SelectItem value="10">10 steps</SelectItem>
                <SelectItem value="15">15 steps</SelectItem>
                <SelectItem value="20">20 steps</SelectItem>
                <SelectItem value="30">30 steps</SelectItem>
                <SelectItem value="50">50 steps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={handleCreateAgent} disabled={!agentName}>
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// AddAgentCard component
interface AddAgentCardProps {
  onAddAgent: (agent: AgentConfig) => void
}

export function AddAgentCard({ onAddAgent }: AddAgentCardProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { play } = useSoundEffectContext()

  return (
    <>
      <Card
        className="hover:border-primary/80 hover:bg-muted/50 relative h-[10rem] max-h-[10rem] w-full max-w-xs cursor-pointer border transition-colors"
        onMouseDown={() => {
          play("./click.mp3", { volume: 0.5 })
          setIsAddDialogOpen(true)
        }}
      >
        <CardHeader className="flex h-full items-center justify-center">
          <CardTitle className="text-primary/90 flex items-center font-medium">
            <PlusIcon className="mr-2 h-5 w-5" />
            Add New Agent
          </CardTitle>
        </CardHeader>
      </Card>
      <AgentBuilderDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddAgent={onAddAgent} />
    </>
  )
}
