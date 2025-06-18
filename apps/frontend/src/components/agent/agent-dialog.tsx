"use client"

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { Agent } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { WithoutSystemFields } from "convex/server"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  outputType: z.enum(["text", "object"]),
  mcpServers: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  aiModelId: z.string().min(1, "Model is required"),
})

type AgentFormValues = z.infer<typeof agentFormSchema>

export function createAgentObject(data: AgentFormValues): WithoutSystemFields<Doc<"agents">> {
  return {
    name: data.name,
    systemPrompt: data.systemPrompt,
    outputType: data.outputType,
    mcpServers: (data.mcpServers || []) as Id<"mcp">[],
    isPublic: false,
    aiModelId: data.aiModelId as Id<"models">,
  }
}

export interface AgentDialogProps {
  mode: "add" | "edit"
  agent?: Agent
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated?: boolean
}

export function AgentDialog({ mode, agent, open, onOpenChange, isAuthenticated = false }: AgentDialogProps) {
  const { play } = useSoundEffectContext()
  const { mcpServers } = useMCP()
  const { models } = useAIModels()
  const { create, edit, remove } = useAgent()

  // Group models by free vs paid
  const { freeModels, paidModels } = useMemo(() => {
    const free = models.filter((m) => !m.requiresApiKey)
    const paid = models.filter((m) => m.requiresApiKey)
    return { freeModels: free, paidModels: paid }
  }, [models])

  const formValues = useMemo((): AgentFormValues => {
    if (!agent) {
      // Default to first free model for new agents
      const defaultModel = freeModels[0]?._id || models[0]?._id || ""
      return {
        name: "",
        systemPrompt: "",
        outputType: "text",
        mcpServers: [],
        isPublic: false,
        aiModelId: defaultModel,
      }
    }
    return {
      name: agent.name || "",
      systemPrompt: agent.systemPrompt || "",
      outputType: (agent.outputType as "text" | "object") || "text",
      mcpServers: agent.mcpServers || [],
      isPublic: agent.isPublic || false,
      aiModelId: agent.aiModelId || freeModels[0]?._id || models[0]?._id || "",
    }
  }, [agent, freeModels, models])

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    values: formValues,
  })

  // Watch for isPublic changes to validate model selection
  const isPublic = form.watch("isPublic")
  const selectedModelId = form.watch("aiModelId")

  // Validate public agents use free models
  useMemo(() => {
    if (isPublic && selectedModelId) {
      const selectedModel = models.find((m) => m._id === selectedModelId)
      if (selectedModel?.requiresApiKey) {
        form.setError("aiModelId", {
          type: "manual",
          message: "Public agents must use free models",
        })
      } else {
        form.clearErrors("aiModelId")
      }
    }
  }, [isPublic, selectedModelId, models, form])

  async function handleSave(data: AgentFormValues) {
    const agentData = createAgentObject(data)
    if (mode === "add") {
      await create(agentData)
      toast.success(`${agentData.name} agent added`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
    } else if (mode === "edit" && agent) {
      await edit({ id: agent._id, ...agentData })
      toast.success(`${agentData.name} agent saved`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
    }
    setTimeout(() => play("./sounds/save.mp3", { volume: 0.5 }), 100)
    onOpenChange(false)
  }

  async function handleDelete() {
    if (!agent) return
    await remove({ id: agent._id })
    toast.error(`${agent.name} agent deleted`, {
      icon: null,
      duration: 5000,
      position: "bottom-center",
      style: errorToastStyle,
    })
    setTimeout(() => play("./sounds/delete.mp3", { volume: 0.5 }), 100)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-2 sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Agent" : `Configure ${agent?.name} Agent`}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Agent Name" {...field} disabled={!isAuthenticated} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">System Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-24"
                        placeholder="You are a helpful assistant..."
                        {...field}
                        disabled={!isAuthenticated}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aiModelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">AI Model</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!isAuthenticated}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a model">
                            {models.find((m) => m._id === field.value)?.name || "Select a model"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {freeModels.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Free Models</SelectLabel>
                              {freeModels.map((model) => (
                                <SelectItem key={model._id} value={model._id}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                          {paidModels.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Requires API Key</SelectLabel>
                              {paidModels.map((model) => (
                                <SelectItem key={model._id} value={model._id}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {isPublic ? "Public agents must use free models" : "Select the AI model for this agent"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="outputType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Output Type</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!isAuthenticated || mode === "edit"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select output type...">
                            {field.value === "text" ? "Text" : "Object"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="object">Object</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("outputType") === "text" && (
                <FormField
                  control={form.control}
                  name="mcpServers"
                  render={({ field }) => (
                    <FormItem>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="mcp-servers">
                          <AccordionTrigger className="hover:cursor-pointer">
                            <FormLabel className="text-primary/80 text-xs">
                              MCP Servers <span className="text-muted-foreground text-xs">(optional)</span>
                            </FormLabel>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              <div className="bg-muted/40 grid gap-3 p-4 sm:grid-cols-2">
                                {Object.values(mcpServers).map((server) => {
                                  const checked = field.value?.some((s) => s === server._id)
                                  return (
                                    <div
                                      key={server._id}
                                      className={
                                        `flex items-center space-x-3 border p-3` +
                                        (checked ? " bg-primary/5 border-primary/30" : "")
                                      }
                                    >
                                      <Checkbox
                                        id={`service-${server._id}`}
                                        checked={checked}
                                        onCheckedChange={(isChecked) => {
                                          if (!isAuthenticated) return
                                          if (isChecked) {
                                            field.onChange([...(field.value || []), server._id])
                                          } else {
                                            field.onChange((field.value || []).filter((s) => s !== server._id))
                                          }
                                        }}
                                        className="rounded-none hover:cursor-pointer"
                                        disabled={!isAuthenticated}
                                      />
                                      <div className="flex flex-1 items-center gap-2">
                                        <Label
                                          htmlFor={`service-${server._id}`}
                                          className="hover:cursor-pointer font-normal"
                                          onMouseDown={
                                            isAuthenticated
                                              ? () => play("./sounds/click.mp3", { volume: 0.5 })
                                              : undefined
                                          }
                                        >
                                          {server.name}
                                        </Label>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <DialogFooter>
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="hover:cursor-pointer border-destructive"
                  disabled={!isAuthenticated}
                >
                  Delete
                </Button>
              )}
              <Button
                type="submit"
                disabled={!form.formState.isValid || !isAuthenticated}
                className="hover:cursor-pointer"
                variant="secondary"
              >
                {mode === "add" ? "Create Agent" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
