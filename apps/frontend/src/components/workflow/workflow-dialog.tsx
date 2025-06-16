"use client"

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useWorkflow } from "@/hooks/use-workflow"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { WithoutSystemFields } from "convex/server"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const workflowFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  instructions: z.string().min(1, "Instructions are required"),
  aiModelId: z.string().min(1, "AI Model is required"),
  steps: z.array(z.string()).min(1, "At least one step is required"),
  isPublic: z.boolean().optional(),
})

type WorkflowFormValues = z.infer<typeof workflowFormSchema>

export function createWorkflowObject(data: WorkflowFormValues): WithoutSystemFields<Doc<"workflows">> {
  return {
    name: data.name,
    description: data.description,
    instructions: data.instructions,
    aiModelId: data.aiModelId as Id<"models">,
    steps: data.steps as Id<"agents">[],
    isPublic: false,
  }
}

export interface WorkflowDialogProps {
  mode: "add" | "edit"
  workflow?: Workflow
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated?: boolean
}

export function WorkflowDialog({ mode, workflow, open, onOpenChange, isAuthenticated = false }: WorkflowDialogProps) {
  const { play } = useSoundEffectContext()
  const { agents } = useAgent()
  const { models } = useAIModels()
  const { create, edit, remove } = useWorkflow()

  const formValues = useMemo((): WorkflowFormValues => {
    if (!workflow) {
      return {
        name: "",
        description: "",
        instructions: "",
        aiModelId: "",
        steps: [],
        isPublic: false,
      }
    }
    return {
      name: workflow.name || "",
      description: workflow.description || "",
      instructions: workflow.instructions || "",
      aiModelId: workflow.aiModelId || "",
      steps: workflow.steps || [],
      isPublic: workflow.isPublic || false,
    }
  }, [workflow])

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    values: formValues,
  })

  async function handleSave(data: WorkflowFormValues) {
    const workflowData = createWorkflowObject(data)
    if (mode === "add") {
      await create(workflowData)
      toast.success(`${workflowData.name} workflow added`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
    } else if (mode === "edit" && workflow) {
      await edit({ id: workflow._id, ...workflowData })
      toast.success(`${workflowData.name} workflow saved`, {
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
    if (!workflow) return
    await remove({ id: workflow._id })
    toast.error(`${workflow.name} workflow deleted`, {
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
      <DialogContent
        className="border border-2 sm:max-w-md max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Workflow" : `Configure ${workflow?.name} Workflow`}</DialogTitle>
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
                      <Input placeholder="Workflow Name" {...field} disabled={!isAuthenticated} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the workflow" {...field} disabled={!isAuthenticated} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-24"
                        placeholder="Detailed instructions for the workflow..."
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
                          <SelectValue placeholder="Select AI model...">
                            {models.find((m) => m._id === field.value)?.name || "Select AI model..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model._id} value={model._id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="steps"
                render={({ field }) => (
                  <FormItem>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="workflow-steps">
                        <AccordionTrigger className="hover:cursor-pointer">
                          <FormLabel className="text-primary/80 text-xs">
                            Workflow Steps ({field.value?.length || 0} selected)
                          </FormLabel>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            <div className="bg-muted/40 grid gap-3 p-4 max-h-[200px] overflow-y-auto">
                              {agents.map((agent) => {
                                const checked = field.value?.some((s) => s === agent._id)
                                const stepIndex = field.value?.indexOf(agent._id)
                                return (
                                  <div
                                    key={agent._id}
                                    className={
                                      `flex items-center space-x-3 border p-3` +
                                      (checked ? " bg-primary/5 border-primary/30" : "")
                                    }
                                  >
                                    <Checkbox
                                      id={`agent-${agent._id}`}
                                      checked={checked}
                                      onCheckedChange={(isChecked) => {
                                        if (!isAuthenticated) return
                                        if (isChecked) {
                                          field.onChange([...(field.value || []), agent._id])
                                        } else {
                                          field.onChange((field.value || []).filter((s) => s !== agent._id))
                                        }
                                      }}
                                      className="rounded-none hover:cursor-pointer"
                                      disabled={!isAuthenticated}
                                    />
                                    <div className="flex flex-1 items-center gap-2">
                                      <Label
                                        htmlFor={`agent-${agent._id}`}
                                        className="hover:cursor-pointer font-normal flex-1"
                                        onMouseDown={
                                          isAuthenticated
                                            ? () => play("./sounds/click.mp3", { volume: 0.5 })
                                            : undefined
                                        }
                                      >
                                        {agent.name}
                                      </Label>
                                      {checked && stepIndex !== undefined && (
                                        <span className="text-xs text-muted-foreground">Step {stepIndex + 1}</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Select agents in the order they should be executed
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {mode === "add" ? "Create Workflow" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
