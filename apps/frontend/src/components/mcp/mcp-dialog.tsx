"use client"

import { KeyValueInputFields } from "@/components/mcp/key-value-input-fields"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle, errorToastStyle } from "@/lib/styles"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { WithoutSystemFields } from "convex/server"
import { useMemo, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const mcpFormSchema = z.discriminatedUnion("transportType", [
  z.object({
    transportType: z.literal("stdio"),
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
  }),
  z.object({
    transportType: z.literal("http"),
    serverName: z.string().min(1, "Server name is required"),
    serverSummary: z.string().optional(),
    url: z.string().url("Please enter a valid URL"),
    headers: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    ),
  }),
  z.object({
    transportType: z.literal("sse"),
    serverName: z.string().min(1, "Server name is required"),
    serverSummary: z.string().optional(),
    url: z.string().url("Please enter a valid URL"),
    headers: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    ),
  }),
])

type MCPFormValues = z.infer<typeof mcpFormSchema>

export function createMCPObject(data: MCPFormValues): WithoutSystemFields<Doc<"mcp">> {
  const base = {
    name: data.serverName,
    summary: data.serverSummary,
    transportType: data.transportType,
    localOnly: data.transportType === "stdio",
  }

  switch (data.transportType) {
    case "stdio": {
      const args = data.argsString
        .split(",")
        .map((arg) => arg.trim())
        .filter(Boolean)
      const env = Object.fromEntries(data.envPairs.map((pair) => [pair.key, pair.value]))

      return {
        ...base,
        requiresUserKey: data.envPairs.length > 0,
        config: {
          type: "stdio" as const,
          command: data.command,
          args,
          ...(data.envPairs.length > 0 && {
            env,
            requiresEnv: data.envPairs.map((pair) => pair.key),
          }),
        },
      }
    }

    case "http":
    case "sse": {
      const headers = Object.fromEntries(
        data.headers
          .filter((h) => h.key && h.value) // Filter out empty headers
          .map((h) => [h.key, h.value]),
      )

      return {
        ...base,
        // Check if any header values need user input
        requiresUserKey: data.headers.some(
          (h) => h.value.includes("{{") || h.value === "" || h.key.toLowerCase() === "authorization",
        ),
        config: {
          type: data.transportType,
          url: data.url,
          ...(Object.keys(headers).length > 0 && { headers }),
        },
      }
    }
  }
}

export interface MCPDialogProps {
  mode: "add" | "edit"
  server?: MCPServer
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated?: boolean
}

export function MCPDialog({ mode, server, open, onOpenChange, isAuthenticated = false }: MCPDialogProps) {
  const { play } = useSoundEffectContext()

  const { create, edit, remove } = useMCP()

  // Check if this is a public server that shouldn't be editable
  const isPublicServer = server?.isPublic || false
  const canEdit = isAuthenticated && !isPublicServer

  // Track the current transport type for tabs
  const [currentTransportType, setCurrentTransportType] = useState<"stdio" | "http" | "sse">("stdio")

  const formValues = useMemo((): MCPFormValues => {
    if (!server) {
      // Default to stdio for new servers
      return {
        transportType: "stdio" as const,
        serverName: "",
        serverSummary: "",
        command: "",
        argsString: "",
        envPairs: [],
      }
    }

    // Handle different transport types for existing servers
    const baseValues = {
      serverName: server.name || "",
      serverSummary: server.summary || "",
    }

    if (server.transportType === "http" || server.transportType === "sse") {
      // Handle HTTP/SSE servers
      const headers =
        server.config && "headers" in server.config && server.config.headers
          ? Object.entries(server.config.headers).map(([key, value]) => ({ key, value }))
          : []

      return {
        ...baseValues,
        transportType: server.transportType,
        url: server.config && "url" in server.config ? server.config.url : "",
        headers,
      } as MCPFormValues
    } else {
      // Handle stdio servers (default)
      let envPairs: Array<{ key: string; value: string }> = []
      let command = ""
      let argsString = ""

      if (server.config && server.config.type === "stdio") {
        const stdioConfig = server.config
        const requiredKeys = stdioConfig.requiresEnv || []
        const configEnv = stdioConfig.env || {}
        envPairs = requiredKeys.map((key: string) => ({
          key,
          value: configEnv[key] || "",
        }))
        command = stdioConfig.command || ""
        argsString = (stdioConfig.args || []).join(", ")
      }

      return {
        ...baseValues,
        transportType: "stdio" as const,
        command,
        argsString,
        envPairs,
      }
    }
  }, [server])

  const form = useForm<MCPFormValues>({
    resolver: zodResolver(mcpFormSchema),
    values: formValues,
  })

  // Sync transport type with form values
  useEffect(() => {
    setCurrentTransportType(formValues.transportType)
  }, [formValues.transportType])

  // Handle tab change (only in add mode)
  const handleTransportTypeChange = (value: string) => {
    if (mode === "edit") return // Don't allow changing transport type in edit mode

    const newTransportType = value as "stdio" | "http" | "sse"
    setCurrentTransportType(newTransportType)

    // Reset form with new transport type
    if (newTransportType === "stdio") {
      form.reset({
        transportType: "stdio",
        serverName: form.getValues("serverName"),
        serverSummary: form.getValues("serverSummary"),
        command: "",
        argsString: "",
        envPairs: [],
      })
    } else {
      form.reset({
        transportType: newTransportType,
        serverName: form.getValues("serverName"),
        serverSummary: form.getValues("serverSummary"),
        url: "",
        headers: [],
      })
    }
  }

  const handleSave = async (data: MCPFormValues) => {
    const serverData = createMCPObject(data)
    if (mode === "add") {
      await create(serverData)
      toast.success(`${serverData.name} config added to database`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
    } else if (mode === "edit" && server?._id) {
      await edit({ id: server._id, ...serverData })
      toast.success(`${serverData.name} config saved to database`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
    }
    setTimeout(() => play("./sounds/save.mp3", { volume: 0.5 }), 100)
    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!server?._id) return
    await remove(server._id)
    toast.error(`${server?.name} config deleted from database`, {
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
                      <Input placeholder="Server Name" {...field} disabled={!canEdit} />
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
                      <Input
                        placeholder="Short description of server capabilities"
                        {...field}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Tabs value={currentTransportType} onValueChange={handleTransportTypeChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="stdio" disabled={mode === "edit"}>
                    Local (stdio)
                  </TabsTrigger>
                  <TabsTrigger value="http" disabled={mode === "edit"}>
                    Remote (HTTP)
                  </TabsTrigger>
                  <TabsTrigger value="sse" disabled={mode === "edit"}>
                    Remote (SSE)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stdio" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="command"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary/80 text-xs">Command</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., python3, node, bash" {...field} disabled={!isAuthenticated} />
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
                          <Input
                            placeholder="Comma separated, e.g: -f,file.py,--verbose"
                            {...field}
                            disabled={!canEdit}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="envPairs"
                    render={({ field }) => (
                      <KeyValueInputFields
                        pairs={field.value}
                        mode={mode}
                        onUpdatePairs={field.onChange}
                        disabled={!canEdit}
                        fieldName="envPairs"
                        fieldLabel="Environment Variables"
                        placeholder={{ key: "API_KEY", value: "Value" }}
                      />
                    )}
                  />
                </TabsContent>

                <TabsContent value="http" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary/80 text-xs">Server URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com/mcp" {...field} disabled={!isAuthenticated} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headers"
                    render={({ field }) => (
                      <KeyValueInputFields
                        pairs={field.value || []}
                        mode={mode}
                        onUpdatePairs={field.onChange}
                        disabled={!canEdit}
                        fieldName="headers"
                        fieldLabel="Headers"
                        placeholder={{ key: "Authorization", value: "Bearer token" }}
                      />
                    )}
                  />
                </TabsContent>

                <TabsContent value="sse" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary/80 text-xs">Server URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com/sse" {...field} disabled={!isAuthenticated} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headers"
                    render={({ field }) => (
                      <KeyValueInputFields
                        pairs={field.value || []}
                        mode={mode}
                        onUpdatePairs={field.onChange}
                        disabled={!canEdit}
                        fieldName="headers"
                        fieldLabel="Headers"
                        placeholder={{ key: "Authorization", value: "Bearer token" }}
                      />
                    )}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="hover:cursor-pointer border-destructive"
                  disabled={!canEdit}
                  title={!canEdit ? "You must be logged in to delete a server." : undefined}
                >
                  Delete
                </Button>
              )}
              <Button
                type="submit"
                disabled={!form.formState.isValid || !canEdit}
                className="hover:cursor-pointer"
                variant="secondary"
                title={!canEdit ? "You must be logged in to save changes." : undefined}
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
