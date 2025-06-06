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
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle, errorToastStyle } from "@/lib/styles"
import { Agent } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { nanoid } from "nanoid"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  systemPrompt: z.string().min(1, "System prompt is required"),
  type: z.enum(["text", "object"]),
  mcpServers: z.array(z.string()).optional(),
})

type AgentFormValues = z.infer<typeof agentFormSchema>

export interface AgentDialogProps {
  mode: "add" | "edit"
  agent?: Agent
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentDialog({ mode, agent, open, onOpenChange }: AgentDialogProps) {
  const { play } = useSoundEffectContext()
  const { selectedModel } = useAIModels()
  const { mcpServers } = useMCP()

  // const { saveAgentToAvailableAgents, removeAgentFromAvailableAgents } = useAgent()

  const formValues = useMemo((): AgentFormValues => {
    if (!agent) {
      return {
        name: "",
        systemPrompt: "",
        type: "text",
        mcpServers: [],
      }
    }
    return {
      name: agent.name || "",
      systemPrompt: agent.systemPrompt || "",
      type: (agent.outputType as "text" | "object") || "text",
      mcpServers: agent.mcpServers || [],
    }
  }, [agent])

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    values: formValues,
  })

  // const createAgentFromForm = (data: AgentFormValues): AgentConfig => {
  //   // if (data.output.type === "text") {
  //   //   const mcpServers = (data.output.mcpServers || [])
  //   //     .map((id) => allAvailableServers[id])
  //   //     .filter((s): s is NonNullable<typeof s> => Boolean(s))
  //   //   return {
  //   //     id: agent?.id || nanoid(),
  //   //     name: data.name,
  //   //     description: data.description,
  //   //     systemPrompt: data.systemPrompt,
  //   //     output: {
  //   //       type: "text",
  //   //       ...(mcpServers.length > 0 ? { mcpServers } : {}),
  //   //     },
  //   //   }
  //   // } else {
  //   //   let parsedSchema: any
  //   //   try {
  //   //     parsedSchema = JSON.parse(data.output.objectJsonSchema)
  //   //   } catch {
  //   //     parsedSchema = {}
  //   //   }
  //   //   return {
  //   //     id: agent?.id || nanoid(),
  //   //     name: data.name,
  //   //     description: data.description,
  //   //     systemPrompt: data.systemPrompt,
  //   //     output: {
  //   //       type: "object",
  //   //       objectJsonSchema: parsedSchema,
  //   //     },
  //   //   }
  //   // }
  // }

  function handleSave(data: AgentFormValues) {
    // const newOrUpdatedAgent = createAgentFromForm(data)
    // saveAgentToAvailableAgents(newOrUpdatedAgent)
    // toast.success(`${newOrUpdatedAgent.name} agent ${mode === "add" ? "added to" : "saved to"} localstorage`, {
    //   icon: null,
    //   duration: 5000,
    //   position: "bottom-center",
    //   style: successToastStyle,
    // })
    // setTimeout(() => play("./sounds/save.mp3", { volume: 0.5 }), 100)
    // onOpenChange(false)
  }

  function handleDelete() {
    // if (agent?.id) removeAgentFromAvailableAgents(agent.id)
    // toast.error(`${agent?.name} agent deleted from localstorage`, {
    //   icon: null,
    //   duration: 5000,
    //   position: "bottom-center",
    //   style: errorToastStyle,
    // })
    // setTimeout(() => play("./sounds/delete.mp3", { volume: 0.5 }), 100)
    // onOpenChange(false)
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
                      <Input placeholder="Agent Name" {...field} />
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
                    <FormLabel className="text-primary/80 text-xs">
                      Description <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea className="h-24" placeholder="A helpful assistant..." {...field} />
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
                      <Textarea className="h-24" placeholder="You are a helpful assistant..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Output Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={mode === "edit"}>
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
              {form.watch("type") === "text" && (
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
                                          if (isChecked) {
                                            field.onChange([...(field.value || []), server._id])
                                          } else {
                                            field.onChange((field.value || []).filter((s) => s !== server._id))
                                          }
                                        }}
                                        className="rounded-none hover:cursor-pointer"
                                      />
                                      <div className="flex flex-1 items-center gap-2">
                                        <Label
                                          htmlFor={`service-${server._id}`}
                                          className="hover:cursor-pointer font-normal"
                                          onMouseDown={() => play("./sounds/click.mp3", { volume: 0.5 })}
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
                >
                  Delete
                </Button>
              )}
              <Button
                type="submit"
                disabled={!form.formState.isValid}
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
