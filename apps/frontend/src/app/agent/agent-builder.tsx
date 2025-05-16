"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useConnectionContext } from "@/hooks/use-connection"
import { useModelContext } from "@/hooks/use-model"
import { MCP_CONFIG } from "@/lib/config"
import { AgentConfig, MCPServerConfig } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useState } from "react"

type ServiceTypes = keyof typeof MCP_CONFIG

interface AgentBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddAgent?: (agent: AgentConfig) => void
  trigger?: React.ReactNode
}

export function AgentBuilder({ open, onOpenChange, onAddAgent, trigger }: AgentBuilderProps) {
  const { availableModels, selectedModelId, handleModelChange } = useModelContext()
  const { connect, disconnect, isConnected } = useConnectionContext()

  const [agentName, setAgentName] = useState("")
  const [persona, setPersona] = useState("")
  const [maxSteps, setMaxSteps] = useState(10)

  const serviceOptions = Object.keys(MCP_CONFIG) as ServiceTypes[]

  const handleServiceToggle = async (service: ServiceTypes, checked: boolean | "indeterminate") => {
    if (checked === true) {
      const config = MCP_CONFIG[service]
      if (config) {
        await connect(config)
      }
    } else {
      await disconnect(String(service))
    }
  }

  const handleCreateAgent = () => {
    const selectedServices = serviceOptions
      .filter((service) => isConnected(String(service)))
      .map((service) => MCP_CONFIG[service]) as MCPServerConfig[]

    const newAgent: AgentConfig = {
      id: `${agentName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      name: agentName,
      modelId: selectedModelId,
      systemPrompt: persona,
      mcpServers: selectedServices,
      maxExecutionSteps: maxSteps,
    }

    if (onAddAgent) {
      onAddAgent(newAgent)
    }

    // Reset form
    setAgentName("")
    setPersona("")
    setMaxSteps(10)

    // Close dialog
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
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
            <Select value={selectedModelId} onValueChange={handleModelChange}>
              <SelectTrigger id="modelSelect">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
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
              {serviceOptions.map((service) => {
                const config = MCP_CONFIG[service]
                return (
                  <div
                    key={service}
                    className={cn(
                      "flex items-center space-x-3 rounded-md border p-3",
                      isConnected(String(service)) && "bg-primary/5 border-primary/30",
                    )}
                  >
                    <Checkbox
                      id={`service-${service}`}
                      checked={isConnected(String(service))}
                      onCheckedChange={(checked: boolean | "indeterminate") => handleServiceToggle(service, checked)}
                    />
                    <div className="flex flex-1 items-center gap-2">
                      <Label htmlFor={`service-${service}`} className="cursor-pointer font-normal">
                        {config?.name || service}
                      </Label>
                    </div>
                  </div>
                )
              })}
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
