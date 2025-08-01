"use client"

import { getModelIdFromConvex } from "@/components/agent/form/agent-form-utils"
import { ModelSelect } from "@/components/model-select"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { Textarea } from "@/components/ui/textarea"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useGeneration } from "@/hooks/use-generation"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Sparkles } from "lucide-react"
import { useCallback, useMemo, useEffect } from "react"
import { useForm, UseFormReturn } from "react-hook-form"
import { z } from "zod"

// Form schema for agent generation
const agentGenerateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  prompt: z.string().min(1, "Prompt is required"),
  aiModelId: z.string().min(1, "Model is required"),
})

type AgentGenerateFormValues = z.infer<typeof agentGenerateFormSchema>

interface AgentGenerateFormProps {
  variant?: "page" | "dialog"
  onClose?: () => void
}

// Component for name input section
interface NameSectionProps {
  form: UseFormReturn<AgentGenerateFormValues>
}

function NameSection({ form }: NameSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Agent Name</p>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} placeholder="My AI Assistant" className="bg-muted/20" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// Component for prompt section
interface PromptSectionProps {
  form: UseFormReturn<AgentGenerateFormValues>
}

function PromptSection({ form }: PromptSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Prompt</p>
      <FormField
        control={form.control}
        name="prompt"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea
                {...field}
                className="min-h-[120px] max-h-[200px] h-[120px] font-mono text-sm bg-muted/20"
                placeholder="Create an agent that helps with..."
              />
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
  form: UseFormReturn<AgentGenerateFormValues>
}

function ModelSection({ form }: ModelSectionProps) {
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
      <div>
        <p className="text-base font-medium text-muted-foreground">AI Model</p>
        <p className="text-xs text-muted-foreground">The model that will be used to generate the agent</p>
      </div>
      <FormField
        control={form.control}
        name="aiModelId"
        render={() => (
          <FormItem>
            <FormControl>
              <ModelSelect
                disabled={false}
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

export function AgentGenerateForm({ onClose }: Pick<AgentGenerateFormProps, "onClose">) {
  const { models } = useAIModels()
  const { generateAgent, isGeneratingAgent } = useGeneration()
  const { isAuthenticated } = useAuth()

  // Get default model for new agents
  const defaultModel = useMemo(() => {
    const freeModel = models.find((m) => !m.requiresApiKey)
    return freeModel?._id || models[0]?._id || ""
  }, [models])

  // Form setup
  const form = useForm<AgentGenerateFormValues>({
    resolver: zodResolver(agentGenerateFormSchema),
    defaultValues: {
      name: "",
      prompt: "",
      aiModelId: defaultModel,
    },
  })

  // Update form when default model becomes available
  useEffect(() => {
    if (defaultModel && defaultModel !== form.getValues("aiModelId")) {
      form.setValue("aiModelId", defaultModel, { shouldDirty: false })
    }
  }, [defaultModel, form])

  const handleGenerate = useCallback(
    async (data: AgentGenerateFormValues) => {
      try {
        const result = await generateAgent({
          name: data.name,
          prompt: data.prompt,
          modelId: data.aiModelId,
        })

        if (result.success) {
          form.reset()
          onClose?.()
        }
      } catch (error) {
        console.error("Failed to generate agent:", error)
      }
    },
    [generateAgent, form, onClose],
  )

  const handleCancel = useCallback(() => {
    form.reset()
    onClose?.()
  }, [form, onClose])

  const formContent = (
    <div className="flex flex-col h-full sm:h-auto sm:block space-y-8">
      <NameSection form={form} />
      <ModelSection form={form} />
      <PromptSection form={form} />
    </div>
  )

  const formFooter = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
      <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto hover:cursor-pointer">
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={!form.formState.isDirty || form.formState.isSubmitting || !isAuthenticated || isGeneratingAgent}
        className="w-full sm:w-auto hover:cursor-pointer"
        variant="default"
      >
        <div className="flex items-center gap-2">
          {isGeneratingAgent ? <LoadingAnimationInline /> : <Sparkles className="h-3 w-3" />}
          {isGeneratingAgent ? "Generating" : "Generate"}
        </div>
      </Button>
    </div>
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleGenerate)} className="w-full">
        <Card
          className={cn(
            "p-0 border-[1.5px] gap-0",
            isGeneratingAgent &&
              "[background:linear-gradient(45deg,#172033,theme(colors.slate.800)_50%,#172033)_padding-box,conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,_theme(colors.indigo.500)_86%,_theme(colors.indigo.300)_90%,_theme(colors.indigo.500)_94%,_theme(colors.slate.600/.48))_border-box] border border-transparent animate-border",
          )}
        >
          <CardHeader className="p-4 gap-0 border-b-[1.5px]">
            <CardTitle className="flex items-center gap-2 leading-normal">Generate Agent with AI</CardTitle>
          </CardHeader>
          <CardContent
            className={cn("p-4 bg-background space-y-8", isGeneratingAgent && "opacity-60 pointer-events-none")}
          >
            {formContent}
          </CardContent>
          <CardFooter className="p-4 gap-0 border-t-[1.5px]">{formFooter}</CardFooter>
          {isGeneratingAgent && (
            <BorderBeam duration={4} size={300} colorFrom="purple" colorTo="purple" borderWidth={3} />
          )}
        </Card>
      </form>
    </Form>
  )
}
