"use client"

import { ModelSelect } from "@/components/model-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { Textarea } from "@/components/ui/textarea"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useGeneration } from "@/hooks/use-generation"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Sparkles } from "lucide-react"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

// Form schema for workflow generation
const workflowGenerateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  prompt: z.string().min(1, "Prompt is required"),
  aiModelId: z.string().min(1, "Model is required"),
})

type WorkflowGenerateFormValues = z.infer<typeof workflowGenerateFormSchema>

interface WorkflowGenerateFormProps {
  variant?: "page" | "dialog"
  onClose?: () => void
}

// Component for name input section
interface NameSectionProps {
  form: any
}

function NameSection({ form }: NameSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Workflow Name</p>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} placeholder="My AI Workflow" className="bg-muted/20" />
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
  form: any
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
                placeholder="Create a workflow that..."
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
  form: any
}

function ModelSection({ form }: ModelSectionProps) {
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
      <div>
        <p className="text-base font-medium text-muted-foreground">AI Model</p>
        <p className="text-xs text-muted-foreground">The model that will be used to generate the workflow</p>
      </div>
      <FormField
        control={form.control}
        name="aiModelId"
        render={({ field }) => (
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

export function WorkflowGenerateForm({
  variant = "dialog",
  onClose,
}: WorkflowGenerateFormProps) {
  const { play } = useSoundEffectContext()
  const { models } = useAIModels()
  const { generateWorkflow, isGeneratingWorkflow, activeWorkflowGeneration } = useGeneration()
  const { isAuthenticated } = useAuth()

  // Get generation status for UI
  const generationStatus = activeWorkflowGeneration?.status

  // Get default model for new workflows
  const defaultModel = useMemo(() => {
    const freeModel = models.find((m) => !m.requiresApiKey)
    return freeModel?._id || models[0]?._id || ""
  }, [models])

  // Form setup
  const form = useForm<WorkflowGenerateFormValues>({
    resolver: zodResolver(workflowGenerateFormSchema),
    defaultValues: {
      name: "",
      prompt: "",
      aiModelId: defaultModel,
    },
  })

  const handleGenerate = useCallback(
    async (data: WorkflowGenerateFormValues) => {
      try {
        play("./sounds/click.mp3", { volume: 0.5 })

        const result = await generateWorkflow({
          name: data.name,
          prompt: data.prompt,
          modelId: data.aiModelId,
        })

        if (result.success) {
          form.reset()
          onClose?.()
        }
      } catch (error) {
        console.error("Failed to generate workflow:", error)
      }
    },
    [play, generateWorkflow, form, onClose],
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
        disabled={!form.formState.isDirty || form.formState.isSubmitting || !isAuthenticated || isGeneratingWorkflow}
        className="w-full sm:w-auto hover:cursor-pointer"
        variant={variant === "dialog" ? "secondary" : "default"}
      >
        <div className="flex items-center gap-2">
          {isGeneratingWorkflow ? <LoadingAnimationInline /> : <Sparkles className="h-3 w-3" />}
          {isGeneratingWorkflow ? "Generating" : "Generate"}
        </div>
      </Button>
    </div>
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleGenerate)}>
        <Card
          className={cn("p-0 border-[1.5px] gap-0", isGeneratingWorkflow && "border-yellow-200 dark:border-yellow-800")}
        >
          <CardHeader className="p-4 gap-0 border-b-[1.5px]">
            <CardTitle className="flex items-center gap-2 leading-normal">Generate Workflow with AI</CardTitle>
          </CardHeader>
          <CardContent
            className={cn("p-4 bg-background space-y-8", isGeneratingWorkflow && "opacity-60 pointer-events-none")}
          >
            {formContent}
          </CardContent>
          <CardFooter className="p-4 gap-0 border-t-[1.5px]">{formFooter}</CardFooter>
        </Card>
      </form>
    </Form>
  )
}
