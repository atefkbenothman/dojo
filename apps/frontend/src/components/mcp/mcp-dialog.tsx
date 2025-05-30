"use client"

import { EnvInputFields } from "@/components/mcp/env-input-fields"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useMCPContext } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle, errorToastStyle } from "@/lib/styles"
import type { MCPServer } from "@dojo/config"
import { zodResolver } from "@hookform/resolvers/zod"
import { nanoid } from "nanoid"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const mcpFormSchema = z.object({
  serverName: z.string().min(1, "Server name is required"),
  serverSummary: z.string().optional(),
  command: z.string().min(1, "Command is required"),
  argsString: z.string(),
  envPairs: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    }),
  ),
})

type MCPFormValues = z.infer<typeof mcpFormSchema>

export interface MCPDialogProps {
  mode: "add" | "edit"
  server?: MCPServer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MCPDialog({ mode, server, open, onOpenChange }: MCPDialogProps) {
  const { play } = useSoundEffectContext()
  const { saveServerToAvailableServers, removeServerFromAvailableServers } = useMCPContext()

  const formValues = useMemo((): MCPFormValues => {
    if (!server) {
      return {
        serverName: "",
        serverSummary: "",
        command: "",
        argsString: "",
        envPairs: [],
      }
    }

    const requiredKeys = server.config?.requiresEnv || []
    const configEnv = server.config?.env || {}
    const envPairs = requiredKeys.map((key) => ({
      key,
      value: configEnv[key] || "",
    }))

    return {
      serverName: server.name || "",
      serverSummary: server.summary || "",
      command: server.config?.command || "",
      argsString: (server.config?.args || []).join(", "),
      envPairs,
    }
  }, [server])

  const form = useForm<MCPFormValues>({
    resolver: zodResolver(mcpFormSchema),
    values: formValues,
  })

  const createServerFromForm = (data: MCPFormValues): MCPServer => {
    const args = data.argsString
      .split(",")
      .map((arg) => arg.trim())
      .filter(Boolean)
    const env = Object.fromEntries(data.envPairs.map((pair) => [pair.key, pair.value]))

    return {
      id: server?.id || nanoid(),
      name: data.serverName,
      ...(data.serverSummary && { summary: data.serverSummary }),
      config: {
        command: data.command,
        args,
        ...(data.envPairs.length > 0 && {
          env,
          requiresEnv: data.envPairs.map((pair) => pair.key),
        }),
      },
    }
  }

  const handleSave = (data: MCPFormValues) => {
    const newOrUpdatedServer = createServerFromForm(data)
    saveServerToAvailableServers(newOrUpdatedServer)
    toast.success(`${newOrUpdatedServer.name} config ${mode === "add" ? "added to" : "saved to"} localstorage`, {
      icon: null,
      duration: 5000,
      position: "bottom-center",
      style: successToastStyle,
    })
    setTimeout(() => play("./sounds/save.mp3", { volume: 0.5 }), 100)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (server?.id) removeServerFromAvailableServers(server.id)
    toast.error(`${server?.name} config deleted from localstorage`, {
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
          <DialogTitle>{mode === "add" ? "Add MCP Server" : `Configure ${server?.name}`}</DialogTitle>
          {mode === "edit" && server?.summary && <p className="text-sm text-muted-foreground">{server.summary}</p>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="serverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Server Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serverSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Summary (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Short description of server capabilities" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="command"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Command</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., python3, node, bash" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="argsString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary/80 text-xs">Arguments</FormLabel>
                    <FormControl>
                      <Input placeholder="Comma separated, e.g: -f,file.py,--verbose" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="envPairs"
                render={({ field }) => (
                  <EnvInputFields envPairs={field.value} mode={mode} onUpdateEnvPairs={field.onChange} />
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
                {mode === "add" ? "Create Server" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
