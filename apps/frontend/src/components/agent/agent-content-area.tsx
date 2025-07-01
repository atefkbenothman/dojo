import { ModelSelect } from "@/components/model-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { type AgentStatus } from "@/hooks/use-agent"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { Agent } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Cpu, Wrench, AlertCircle, CheckCircle2, Loader2, Copy } from "lucide-react"
import { useMemo, useEffect, useCallback } from "react"
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

// Component for read-only notice
interface ReadOnlyNoticeProps {
  canEdit: boolean
  isPublic: boolean | undefined
}

function ReadOnlyNotice({ canEdit, isPublic }: ReadOnlyNoticeProps) {
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
}

function AgentNameSection({ form, canEdit }: AgentNameSectionProps) {
  if (!canEdit) return null

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

// Component for configuration section
interface ConfigurationSectionProps {
  form: UseFormReturn<AgentFormValues>
  canEdit: boolean
  models: Doc<"models">[]
  mcpServers: Doc<"mcp">[]
  outputType: string
}

function ConfigurationSection({ form, canEdit, models, mcpServers, outputType }: ConfigurationSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <h2 className="text-base sm:text-lg font-semibold">Configuration</h2>
      </div>
      <Card className="p-3 sm:p-4 space-y-4">
        {/* Output Type */}
        <FormField
          control={form.control}
          name="outputType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Output Type</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange} disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select output type...">
                      {field.value === "text" ? "Text with tools" : "Structured JSON"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text with tools</SelectItem>
                    <SelectItem value="object">Structured JSON</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* MCP Servers */}
        {outputType === "text" && (
          <FormField
            control={form.control}
            name="mcpServers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MCP Servers</FormLabel>
                <div className="h-[200px] sm:h-[280px] overflow-y-auto border rounded-lg p-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mcpServers.length === 0 ? (
                      <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center h-[184px] sm:h-[264px] border-2 border-dashed rounded-lg">
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
                              "p-3 cursor-pointer transition-all border-2 h-[80px] sm:h-[90px] flex flex-col justify-between",
                              isChecked
                                ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                                : "hover:bg-muted/50 hover:border-muted-foreground/30",
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
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </Card>
    </div>
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
    <div className="space-y-3 mt-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <h2 className="text-base sm:text-lg font-semibold">Status</h2>
      </div>
      <Card className={cn("p-3 sm:p-4", statusInfo.className)}>
        <div className="flex items-center gap-2">
          {statusInfo.icon}
          <span className="text-sm font-medium">{statusInfo.text}</span>
        </div>
      </Card>
    </div>
  )
}

interface AgentContentAreaProps {
  agent: Agent
  model: Doc<"models"> | null | undefined
  execution: {
    status: AgentStatus
    error?: string
  } | null
  isAuthenticated?: boolean
}

export function AgentContentArea({ agent, model, execution, isAuthenticated = false }: AgentContentAreaProps) {
  const { mcpServers } = useMCP()
  const { models } = useAIModels()
  const { play } = useSoundEffectContext()
  const { edit } = useAgent()

  // Check if user can edit
  const canEdit = Boolean(isAuthenticated && !agent.isPublic)

  // Form setup
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      outputType: agent.outputType as "text" | "object",
      mcpServers: agent.mcpServers || [],
      aiModelId: agent.aiModelId,
    },
  })

  // Reset form when agent changes
  useEffect(() => {
    form.reset({
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      outputType: agent.outputType as "text" | "object",
      mcpServers: agent.mcpServers || [],
      aiModelId: agent.aiModelId,
    })
  }, [agent, form])

  // Get execution status info
  const statusInfo = useMemo(() => {
    if (!execution) return null

    switch (execution.status) {
      case "preparing":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Preparing...",
          className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
        }
      case "running":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Running...",
          className: "text-green-600 bg-green-50 dark:bg-green-950/30",
        }
      case "completed":
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          text: "Completed",
          className: "text-green-600 bg-green-50 dark:bg-green-950/30",
        }
      case "failed":
      case "cancelled":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: execution.error || "Failed",
          className: "text-red-600 bg-red-50 dark:bg-red-950/30",
        }
      default:
        return null
    }
  }, [execution])

  const handleCopyPrompt = () => {
    const currentPrompt = form.getValues("systemPrompt")
    navigator.clipboard.writeText(currentPrompt)
    play("./sounds/click.mp3", { volume: 0.5 })
    toast.success("System prompt copied to clipboard", {
      duration: 2000,
      position: "bottom-center",
    })
  }

  const handleSave = async (data: AgentFormValues) => {
    try {
      await edit({
        id: agent._id,
        name: data.name,
        systemPrompt: data.systemPrompt,
        outputType: data.outputType,
        mcpServers: data.mcpServers as Id<"mcp">[],
        aiModelId: data.aiModelId as Id<"models">,
        isPublic: false,
      })

      toast.success("Agent saved", {
        icon: null,
        duration: 3000,
        position: "bottom-center",
        style: successToastStyle,
      })
      play("./sounds/save.mp3", { volume: 0.5 })
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
  }

  return (
    <div className="flex-1 overflow-y-auto relative">
      <div className="max-w-4xl mx-auto my-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <Card className="p-0 border-[1.5px] gap-0">
              <CardHeader className="p-4 gap-0 border-b-[1.5px]">
                <CardTitle>{agent.name} Config</CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-background space-y-8">
                <ReadOnlyNotice canEdit={canEdit} isPublic={agent.isPublic} />
                <AgentNameSection form={form} canEdit={canEdit} />
                <SystemPromptSection form={form} canEdit={canEdit} onCopyPrompt={handleCopyPrompt} />
                <ModelSection form={form} canEdit={canEdit} />
                <ConfigurationSection
                  form={form}
                  canEdit={canEdit}
                  models={models}
                  mcpServers={mcpServers}
                  outputType={agent.outputType}
                />
              </CardContent>
              <CardFooter className="p-4 gap-0 border-t-[1.5px]">
                {canEdit && (
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={!form.formState.isDirty || form.formState.isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!form.formState.isDirty || form.formState.isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Save
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          </form>
        </Form>
        {/* Status Section */}
        <StatusSection statusInfo={statusInfo} />
      </div>
    </div>
  )
}
