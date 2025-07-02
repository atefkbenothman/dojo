"use client"

import { ModelSelect } from "@/components/model-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAIModels } from "@/hooks/use-ai-models"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
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
  isAuthenticated?: boolean
  onClose?: () => void
}

// Component for name input section
interface NameSectionProps {
  form: any
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
        <p className="text-xs text-muted-foreground">The model that will be used to generate the agent</p>
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

export function AgentGenerateForm({ variant = "dialog", isAuthenticated = false, onClose }: AgentGenerateFormProps) {
  const { play } = useSoundEffectContext()
  const { models } = useAIModels()

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

  const handleGenerate = useCallback(
    async (data: AgentGenerateFormValues) => {
      try {
        // TODO: Implement AI generation logic
        console.log("Generating agent with:", data)
        play("./sounds/click.mp3", { volume: 0.5 })
        // For now, just close the dialog
        onClose?.()
      } catch (error) {
        console.error("Failed to generate agent:", error)
      }
    },
    [play, onClose],
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
        disabled={!form.formState.isDirty || form.formState.isSubmitting || !isAuthenticated}
        className="w-full sm:w-auto hover:cursor-pointer"
        variant={variant === "dialog" ? "secondary" : "default"}
      >
        Generate
      </Button>
    </div>
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleGenerate)}>
        <Card className="p-0 border-[1.5px] gap-0">
          <CardHeader className="p-4 gap-0 border-b-[1.5px]">
            <CardTitle>Generate Agent with AI</CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-background space-y-8">{formContent}</CardContent>
          <CardFooter className="p-4 gap-0 border-t-[1.5px]">{formFooter}</CardFooter>
        </Card>
      </form>
    </Form>
  )

  // Page variant (if needed in the future)
  // if (variant === "page") {
  //   return (
  //     <Form {...form}>
  //       <form onSubmit={form.handleSubmit(handleGenerate)} className="h-full sm:h-auto flex flex-col">
  //         <Card className="p-0 border-0 sm:border-[1.5px] gap-0 rounded-none sm:rounded-lg h-full sm:h-auto flex flex-col">
  //           <CardHeader className="p-4 gap-0 border-b-[1.5px] flex-shrink-0 sticky top-0 z-10 bg-card sm:static">
  //             <CardTitle>Generate Agent with AI</CardTitle>
  //           </CardHeader>
  //           <CardContent className="p-4 bg-background flex-1 sm:flex-initial overflow-y-auto sm:overflow-visible flex flex-col">
  //             {formContent}
  //           </CardContent>
  //           <CardFooter className="p-4 gap-0 border-t-[1.5px] flex-shrink-0 sticky bottom-0 z-10 bg-card sm:static">
  //             {formFooter}
  //           </CardFooter>
  //         </Card>
  //       </form>
  //     </Form>
  //   )
  // }
}
