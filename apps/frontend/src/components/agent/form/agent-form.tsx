import { agentFormSchema, type AgentFormValues } from "@/components/agent/form/agent-form-schema"
import {
  filterMcpServersByVisibility,
  getDefaultAgentFormValues,
  getModelIdFromConvex,
  prepareAgentData,
} from "@/components/agent/form/agent-form-utils"
import { ModelSelect } from "@/components/model-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAgent, type AgentStatus, canRunAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { DEFAULT_MODEL_ID } from "@/lib/constants"
import { successToastStyle, errorToastStyle } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { Agent } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Wrench, AlertCircle, Copy, CheckCircle2 } from "lucide-react"
import { useMemo, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

interface AgentFormProps {
  agent?: Agent
  mode: "add" | "edit"
  variant?: "page" | "dialog"
  execution?: {
    status: AgentStatus
    error?: string
  } | null
  onClose?: () => void
  onDeleteClick?: (agent: Agent) => void
  onAgentCreated?: (agentId: string) => void
}

// Component for read-only notice
interface ReadOnlyNoticeSectionProps {
  canEdit: boolean
  isPublic: boolean | undefined
}

function ReadOnlyNoticeSection({ canEdit, isPublic }: ReadOnlyNoticeSectionProps) {
  if (canEdit) return null

  return (
    <Card className="p-3 sm:p-4 bg-muted/60 border-muted/20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        {isPublic
          ? "This is a public agent and cannot be edited. Clone it to create your own version."
          : "Sign in to edit this agent."}
      </div>
    </Card>
  )
}

// Component for status section
interface StatusSectionProps {
  statusInfo: {
    icon: React.ReactNode
    text: string
    className: string
  } | null
}

function StatusSection({ statusInfo }: StatusSectionProps) {
  if (!statusInfo) return null

  return (
    <Card className={cn("p-3 sm:p-4", statusInfo.className)}>
      <div className="flex items-center gap-2 text-sm">
        {statusInfo.icon}
        <span>{statusInfo.text}</span>
      </div>
    </Card>
  )
}

// Component for agent name section
interface AgentNameSectionProps {
  form: UseFormReturn<AgentFormValues>
  canEdit: boolean
}

function AgentNameSection({ form, canEdit }: AgentNameSectionProps) {
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

// Component for context prompt section
interface ContextSectionProps {
  form: UseFormReturn<AgentFormValues>
  canEdit: boolean
  onCopyContext: () => void
}

function ContextSection({ form, canEdit, onCopyContext }: ContextSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col">
        <p className="text-base font-medium text-muted-foreground">
          Context <span className="text-xs">(Optional)</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Additional context or instructions that will be passed to the agent when it runs.
        </p>
      </div>
      <FormField
        control={form.control}
        name="contextPrompt"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <Textarea
                  {...field}
                  className="min-h-[80px] max-h-[160px] h-[80px] font-mono text-sm bg-muted/20 pr-10"
                  placeholder="Enter additional context or instructions for this agent..."
                  disabled={!canEdit}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onCopyContext}
                  className="absolute top-1 right-1 sm:top-2 sm:right-2 h-7 w-7 sm:h-8 sm:w-8"
                  title="Copy context"
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

  // Extract the watched value to a variable to simplify the dependency array
  const watchedModelId = form.watch("aiModelId")

  // Convert between Convex ID and modelId
  const selectedModelId = useMemo(() => getModelIdFromConvex(models, watchedModelId), [models, watchedModelId])

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
        render={() => (
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
      <div className="flex-shrink-0">
        <p className="text-base font-medium text-muted-foreground">
          MCP Servers {selectedCount > 0 && <span className="text-sm font-normal">({selectedCount} selected)</span>}
        </p>
      </div>
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
                            "p-2 transition-all border-2 h-[60px] sm:h-[70px] flex flex-row items-center gap-3",
                            isChecked
                              ? "bg-primary/5 border-primary/30"
                              : "hover:bg-muted/50 hover:border-muted-foreground/30",
                            !canEdit && "opacity-60",
                          )}
                        >
                          {/* Checkbox on left side, vertically centered */}
                          <div className="flex items-center px-2">
                            <Checkbox
                              checked={isChecked}
                              disabled={!canEdit}
                              onCheckedChange={(checked) => {
                                if (!canEdit) return
                                if (checked) {
                                  field.onChange([...(field.value || []), server._id])
                                } else {
                                  field.onChange((field.value || []).filter((s: string) => s !== server._id))
                                }
                              }}
                              className="rounded-none hover:cursor-pointer"
                            />
                          </div>

                          <div className="flex flex-col gap-1 overflow-hidden flex-1 justify-center">
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

export function AgentForm({
  agent,
  mode,
  variant = "page",
  execution,
  onClose,
  onDeleteClick,
  onAgentCreated,
}: AgentFormProps) {
  const { mcpServers } = useMCP()
  const { models } = useAIModels()
  const { play } = useSoundEffectContext()
  const { create, edit, clone, runAgent } = useAgent()
  const { isAuthenticated } = useAuth()

  // Get default model for new agents
  const defaultModel = useMemo(() => {
    const defaultModel = models.find((m) => m.modelId === DEFAULT_MODEL_ID)
    return defaultModel?._id || ""
  }, [models])

  // Form setup
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: getDefaultAgentFormValues(agent, defaultModel),
  })

  // Check if user can edit
  const isPublicAgent = agent?.isPublic || false
  const canEdit = Boolean(isAuthenticated && !isPublicAgent)
  const canEditContext = Boolean(isAuthenticated && !isPublicAgent) || Boolean(!isAuthenticated && isPublicAgent)
  const canRun = agent ? canRunAgent(agent, isAuthenticated, execution?.status) : false
  const hasContextChanges = canEditContext && form.watch("contextPrompt") !== agent?.contextPrompt

  // Filter MCP servers based on agent visibility
  const availableMcpServers = useMemo(
    () => filterMcpServersByVisibility(mcpServers, mode, agent?.isPublic),
    [mcpServers, mode, agent?.isPublic],
  )

  // Get execution status info
  const statusInfo = useMemo(() => {
    if (!execution) return null

    switch (execution.status) {
      case "preparing":
        return {
          icon: <LoadingAnimationInline className="h-4 w-4" />,
          text: "Preparing...",
          className:
            "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50 text-yellow-700 dark:text-yellow-400",
        }
      case "connecting":
        return {
          icon: <LoadingAnimationInline className="text-yellow-600 dark:text-yellow-500" />,
          text: "Connecting to MCP servers...",
          className:
            "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50 text-yellow-700 dark:text-yellow-400",
        }
      case "running":
        return {
          icon: <LoadingAnimationInline className="h-4 w-4" />,
          text: "Running...",
          className:
            "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400",
        }
      case "completed":
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          text: "Completed",
          className:
            "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400",
        }
      case "failed":
      case "cancelled":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: execution.error || "Failed",
          className:
            "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400",
        }
      default:
        return null
    }
  }, [execution])

  // Reset form when agent changes
  useEffect(() => {
    if (agent) {
      form.reset(getDefaultAgentFormValues(agent, defaultModel))
    }
  }, [agent, form, defaultModel])

  const handleCopyPrompt = useCallback(() => {
    const currentPrompt = form.getValues("systemPrompt")
    navigator.clipboard.writeText(currentPrompt)
    play("./sounds/click.mp3", { volume: 0.5 })
    toast.success("System prompt copied to clipboard", {
      duration: 2000,
      position: "bottom-center",
    })
  }, [form, play])

  const handleCopyContext = useCallback(() => {
    const currentContext = form.getValues("contextPrompt") || ""
    navigator.clipboard.writeText(currentContext)
    play("./sounds/click.mp3", { volume: 0.5 })
    toast.success("Context copied to clipboard", {
      duration: 2000,
      position: "bottom-center",
    })
  }, [form, play])

  const handleRunWithContext = useCallback(() => {
    if (!agent) return
    const runtimeContext = form.getValues("contextPrompt")
    runAgent(agent, runtimeContext)
  }, [agent, form, runAgent])

  const handleSave = async (data: AgentFormValues) => {
    try {
      const agentData = prepareAgentData(data, false)

      if (mode === "add") {
        const agentId = await create(agentData)
        toast.success(`${data.name} agent added`, {
          icon: null,
          duration: 3000,
          position: "bottom-center",
          style: successToastStyle,
        })
        // Call the callback with the new agent ID
        if (agentId) {
          onAgentCreated?.(agentId)
        }
      } else if (agent) {
        await edit({
          id: agent._id,
          ...agentData,
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
      play("./sounds/error.mp3", { volume: 0.5 })
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(`Failed to save agent: ${errorMessage}`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
    }
  }

  const handleCancel = () => {
    form.reset()
    onClose?.()
  }

  const handleDeleteClick = () => {
    if (!agent || !onDeleteClick) return
    onDeleteClick(agent)
  }

  const handleClone = useCallback(async () => {
    if (!agent) return
    try {
      await clone(agent._id)
      onClose?.()
    } catch {
      // Error handling is already done in the clone function
    }
  }, [agent, clone, onClose])

  const formContent = (
    <div className="flex flex-col h-full sm:h-auto sm:block space-y-4">
      {(!canEdit || (mode === "edit" && statusInfo)) && (
        <div className="space-y-2">
          <ReadOnlyNoticeSection canEdit={canEdit} isPublic={isPublicAgent} />
          {mode === "edit" && <StatusSection statusInfo={statusInfo} />}
        </div>
      )}
      <div className="space-y-8">
        <AgentNameSection form={form} canEdit={canEdit} />
        <SystemPromptSection form={form} canEdit={canEdit} onCopyPrompt={handleCopyPrompt} />
        <ContextSection form={form} canEdit={canEditContext} onCopyContext={handleCopyContext} />
        <ModelSection form={form} canEdit={canEdit} />
        <OutputTypeSection form={form} canEdit={canEdit} />
        <div className="flex-1 sm:flex-initial min-h-0 sm:min-h-fit flex flex-col">
          <MCPServersSection
            form={form}
            canEdit={canEdit}
            mcpServers={availableMcpServers}
            outputType={form.watch("outputType")}
          />
        </div>
      </div>
    </div>
  )

  const formFooter = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
      {mode === "edit" && canEdit && onDeleteClick && (
        <Button
          type="button"
          variant="destructive"
          onClick={handleDeleteClick}
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
      {mode === "edit" && canRun && hasContextChanges && (
        <Button
          type="button"
          variant="default"
          onClick={handleRunWithContext}
          className="w-full sm:w-auto hover:cursor-pointer"
        >
          Run with Context
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
        variant="default"
      >
        {mode === "add" ? "Create Agent" : "Save"}
      </Button>
    </div>
  )

  if (variant === "dialog") {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col h-full">
          <Card className="p-0 border-[1.5px] gap-0 flex flex-col h-full">
            <CardHeader className="p-4 gap-0 border-b-[1.5px] flex-shrink-0">
              <CardTitle>{mode === "add" ? "New Agent" : `${agent?.name} Config`}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-background space-y-8 flex-1 overflow-y-auto">{formContent}</CardContent>
            <CardFooter className="p-4 gap-0 border-t-[1.5px] flex-shrink-0">{formFooter}</CardFooter>
          </Card>
        </form>
      </Form>
    )
  }

  // Page variant
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="h-full sm:h-auto flex flex-col">
        <Card className="p-0 border-0 sm:border-[1.5px] gap-0 rounded-none sm:rounded-lg h-full sm:h-auto flex flex-col">
          <CardHeader className="p-4 gap-0 border-b-[1.5px] flex-shrink-0 sticky top-0 z-10 bg-card sm:static">
            <CardTitle className="text-sm font-medium">
              {mode === "add" ? "New Agent" : `${agent?.name} Config`}
            </CardTitle>
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
  )
}
