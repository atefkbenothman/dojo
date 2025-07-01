import { AgentDeleteDialog } from "@/components/agent/agent-delete-dialog"
import { ModelSelect } from "@/components/model-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle, errorToastStyle } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { Agent } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Wrench, AlertCircle, Copy } from "lucide-react"
import { useMemo, useEffect, useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

// Form schema for agent editing
const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  outputType: z.enum(["text", "object"]),
  mcpServers: z.array(z.string()).optional(),
  aiModelId: z.string().min(1, "Model is required"),
})

type AgentFormValues = z.infer<typeof agentFormSchema>

interface AgentFormProps {
  agent?: Agent
  mode: "add" | "edit"
  variant?: "page" | "dialog"
  isAuthenticated?: boolean
  onClose?: () => void
}

// Component for read-only notice
interface ReadOnlyNoticeSectionProps {
  canEdit: boolean
  isPublic: boolean | undefined
}

function ReadOnlyNoticeSection({ canEdit, isPublic }: ReadOnlyNoticeSectionProps) {
  if (canEdit) return null

  return (
    <Card className="p-3 sm:p-4 bg-muted/50 border-muted">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        {isPublic
          ? "This is a public agent and cannot be edited. Clone it to create your own version."
          : "Sign in to edit this agent."}
      </div>
    </Card>
  )
}

// Component for agent name section
interface AgentNameSectionProps {
  form: UseFormReturn<AgentFormValues>
  canEdit: boolean
  mode: "add" | "edit"
}

function AgentNameSection({ form, canEdit, mode }: AgentNameSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Agent Name</p>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} placeholder="Agent name" disabled={!canEdit} className="bg-muted/20" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// Component for system prompt section
interface SystemPromptSectionProps {
  form: UseFormReturn<AgentFormValues>
  canEdit: boolean
  onCopyPrompt: () => void
}

function SystemPromptSection({ form, canEdit, onCopyPrompt }: SystemPromptSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">System Prompt</p>
      <FormField
        control={form.control}
        name="systemPrompt"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <Textarea
                  {...field}
                  className="min-h-[120px] max-h-[200px] h-[120px] font-mono text-sm bg-muted/20 pr-10"
                  placeholder="You are a helpful assistant..."
                  disabled={!canEdit}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onCopyPrompt}
                  className="absolute top-1 right-1 sm:top-2 sm:right-2 h-7 w-7 sm:h-8 sm:w-8"
                  title="Copy prompt"
                >
                  <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// Component for model selection
interface ModelSectionProps {
  form: UseFormReturn<AgentFormValues>
  canEdit: boolean
}

function ModelSection({ form, canEdit }: ModelSectionProps) {
  const { models } = useAIModels()

  // Convert between Convex ID and modelId
  const selectedModelId = useMemo(() => {
    const model = models.find((m) => m._id === form.watch("aiModelId"))
    return model?.modelId
  }, [models, form.watch("aiModelId")])

  const handleModelChange = useCallback(
    (modelId: string) => {
      const model = models.find((m) => m.modelId === modelId)
      if (model) {
        form.setValue("aiModelId", model._id, { shouldDirty: true })
      }
    },
    [models, form],
  )

  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">AI Model</p>
      <FormField
        control={form.control}
        name="aiModelId"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <ModelSelect
                disabled={!canEdit}
                className="text-sm w-full"
                value={selectedModelId}
                onValueChange={handleModelChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// Component for output type selection
interface OutputTypeSectionProps {
  form: UseFormReturn<AgentFormValues>
  canEdit: boolean
}

function OutputTypeSection({ form, canEdit }: OutputTypeSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Output Type</p>
      <FormField
        control={form.control}
        name="outputType"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                <SelectTrigger className="w-full bg-muted/20">
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
    </div>
  )
}

// Component for MCP servers selection
interface MCPServersSectionProps {
  form: UseFormReturn<AgentFormValues>
  canEdit: boolean
  mcpServers: Doc<"mcp">[]
  outputType: string
}

function MCPServersSection({ form, canEdit, mcpServers, outputType }: MCPServersSectionProps) {
  if (outputType !== "text") return null

  const selectedServerIds = form.watch("mcpServers") || []
  const selectedCount = selectedServerIds.length

  return (
    <div className="flex flex-col h-full sm:h-auto space-y-2">
      <p className="text-base font-medium text-muted-foreground flex-shrink-0">
        MCP Servers {selectedCount > 0 && <span className="text-sm font-normal">({selectedCount} selected)</span>}
      </p>
      <FormField
        control={form.control}
        name="mcpServers"
        render={({ field }) => (
          <FormItem className="flex-1 sm:flex-initial min-h-0 sm:min-h-fit flex flex-col">
            <FormControl>
              <div className="flex-1 sm:flex-initial min-h-[200px] max-h-[300px] sm:max-h-none sm:h-[280px] overflow-y-auto border rounded-lg p-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent bg-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mcpServers.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center min-h-[184px] sm:min-h-[264px] border-2 border-dashed rounded-lg">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No MCP servers available</p>
                      <p className="text-xs text-muted-foreground mt-1">Add MCP servers to enable tools</p>
                    </div>
                  ) : (
                    mcpServers.map((server) => {
                      const isChecked = field.value?.includes(server._id)

                      return (
                        <Card
                          key={server._id}
                          className={cn(
                            "p-2 cursor-pointer transition-all border-2 h-[60px] sm:h-[70px] flex flex-col justify-between",
                            isChecked
                              ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                              : "hover:bg-muted/50 hover:border-muted-foreground/30",
                            !canEdit && "cursor-not-allowed opacity-60",
                          )}
                          onClick={() => {
                            if (!canEdit) return
                            if (isChecked) {
                              field.onChange((field.value || []).filter((s: string) => s !== server._id))
                            } else {
                              field.onChange([...(field.value || []), server._id])
                            }
                          }}
                        >
                          <div className="flex flex-col gap-1 overflow-hidden">
                            {/* Server name */}
                            <div className="font-medium text-xs sm:text-sm text-foreground line-clamp-1">
                              {server.name}
                            </div>

                            {/* Description if available */}
                            {server.summary && (
                              <div className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2">
                                {server.summary}
                              </div>
                            )}
                          </div>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export function AgentForm({ agent, mode, variant = "page", isAuthenticated = false, onClose }: AgentFormProps) {
  const { mcpServers } = useMCP()
  const { models } = useAIModels()
  const { play } = useSoundEffectContext()
  const { create, edit, remove, clone } = useAgent()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Check if user can edit
  const isPublicAgent = agent?.isPublic || false
  const canEdit = Boolean(isAuthenticated && !isPublicAgent)

  // Get default model for new agents
  const defaultModel = useMemo(() => {
    const freeModel = models.find((m) => !m.requiresApiKey)
    return freeModel?._id || models[0]?._id || ""
  }, [models])

  // Form setup
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agent?.name || "",
      systemPrompt: agent?.systemPrompt || "",
      outputType: (agent?.outputType as "text" | "object") || "text",
      mcpServers: agent?.mcpServers || [],
      aiModelId: agent?.aiModelId || defaultModel,
    },
  })

  // Reset form when agent changes
  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        outputType: agent.outputType as "text" | "object",
        mcpServers: agent.mcpServers || [],
        aiModelId: agent.aiModelId,
      })
    }
  }, [agent, form])

  const handleCopyPrompt = useCallback(() => {
    const currentPrompt = form.getValues("systemPrompt")
    navigator.clipboard.writeText(currentPrompt)
    play("./sounds/click.mp3", { volume: 0.5 })
    toast.success("System prompt copied to clipboard", {
      duration: 2000,
      position: "bottom-center",
    })
  }, [form, play])

  const handleSave = async (data: AgentFormValues) => {
    try {
      if (mode === "add") {
        await create({
          name: data.name,
          systemPrompt: data.systemPrompt,
          outputType: data.outputType,
          mcpServers: (data.mcpServers || []) as Id<"mcp">[],
          aiModelId: data.aiModelId as Id<"models">,
          isPublic: false,
        })
        toast.success(`${data.name} agent added`, {
          icon: null,
          duration: 3000,
          position: "bottom-center",
          style: successToastStyle,
        })
      } else if (agent) {
        await edit({
          id: agent._id,
          name: data.name,
          systemPrompt: data.systemPrompt,
          outputType: data.outputType,
          mcpServers: (data.mcpServers || []) as Id<"mcp">[],
          aiModelId: data.aiModelId as Id<"models">,
          isPublic: false,
        })
        toast.success("Agent saved", {
          icon: null,
          duration: 3000,
          position: "bottom-center",
          style: successToastStyle,
        })
      }
      play("./sounds/save.mp3", { volume: 0.5 })
      onClose?.()
    } catch (error) {
      toast.error("Failed to save agent", {
        icon: null,
        duration: 3000,
        position: "bottom-center",
      })
    }
  }

  const handleCancel = () => {
    form.reset()
    onClose?.()
  }

  const handleDelete = async () => {
    if (!agent) return
    try {
      await remove({ id: agent._id })
      toast.error(`${agent.name} agent deleted`, {
        icon: null,
        duration: 3000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      play("./sounds/delete.mp3", { volume: 0.5 })
      onClose?.()
    } catch (error) {
      toast.error("Failed to delete agent", {
        icon: null,
        duration: 3000,
        position: "bottom-center",
      })
    }
  }

  const handleClone = useCallback(async () => {
    if (!agent) return
    try {
      await clone(agent._id)
      onClose?.()
    } catch (error) {
      // Error handling is already done in the clone function
    }
  }, [agent, clone, onClose])

  const formContent = (
    <div className="flex flex-col h-full sm:h-auto sm:block space-y-8">
      <ReadOnlyNoticeSection canEdit={canEdit} isPublic={isPublicAgent} />
      <AgentNameSection form={form} canEdit={canEdit} mode={mode} />
      <SystemPromptSection form={form} canEdit={canEdit} onCopyPrompt={handleCopyPrompt} />
      <ModelSection form={form} canEdit={canEdit} />
      <OutputTypeSection form={form} canEdit={canEdit} />
      <div className="flex-1 sm:flex-initial min-h-0 sm:min-h-fit flex flex-col">
        <MCPServersSection
          form={form}
          canEdit={canEdit}
          mcpServers={mcpServers}
          outputType={form.watch("outputType")}
        />
      </div>
    </div>
  )

  const formFooter = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
      {mode === "edit" && canEdit && (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
          className="w-full sm:w-auto hover:cursor-pointer border-destructive"
        >
          Delete
        </Button>
      )}
      {mode === "edit" && isPublicAgent && isAuthenticated && (
        <Button type="button" variant="outline" onClick={handleClone} className="w-full sm:w-auto hover:cursor-pointer">
          Clone
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        disabled={!form.formState.isDirty || form.formState.isSubmitting}
        className="w-full sm:w-auto hover:cursor-pointer"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={!form.formState.isDirty || form.formState.isSubmitting || !canEdit}
        className="w-full sm:w-auto hover:cursor-pointer"
        variant={variant === "dialog" ? "secondary" : "default"}
      >
        {mode === "add" ? "Create Agent" : "Save"}
      </Button>
    </div>
  )

  if (variant === "dialog") {
    return (
      <>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <Card className="p-0 border-[1.5px] gap-0">
              <CardHeader className="p-4 gap-0 border-b-[1.5px]">
                <CardTitle>{mode === "add" ? "New Agent" : `${agent?.name} Config`}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-background space-y-8">{formContent}</CardContent>
              <CardFooter className="p-4 gap-0 border-t-[1.5px]">{formFooter}</CardFooter>
            </Card>
          </form>
        </Form>
        <AgentDeleteDialog
          agent={agent || null}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
        />
      </>
    )
  }

  // Page variant
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="h-full sm:h-auto flex flex-col">
          <Card className="p-0 border-0 sm:border-[1.5px] gap-0 rounded-none sm:rounded-lg h-full sm:h-auto flex flex-col">
            <CardHeader className="p-4 gap-0 border-b-[1.5px] flex-shrink-0 sticky top-0 z-10 bg-card sm:static">
              <CardTitle>{mode === "add" ? "New Agent" : `${agent?.name} Config`}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-background flex-1 sm:flex-initial overflow-y-auto sm:overflow-visible flex flex-col">
              {formContent}
            </CardContent>
            <CardFooter className="p-4 gap-0 border-t-[1.5px] flex-shrink-0 sticky bottom-0 z-10 bg-card sm:static">
              {formFooter}
            </CardFooter>
          </Card>
        </form>
      </Form>
      <AgentDeleteDialog
        agent={agent || null}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
      />
    </>
  )
}
