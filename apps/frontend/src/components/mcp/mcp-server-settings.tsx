"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useMCP } from "@/hooks/use-mcp"
import { cn } from "@/lib/utils"
import { MCPServer } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Trash2, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

// Unified form schema that supports all transport types
const formSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  summary: z.string().optional(),
  transportType: z.enum(["stdio", "http", "sse"]),
  // Stdio fields
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  envVars: z.array(
    z.object({
      key: z.string().min(1, "Key is required"),
      value: z.string(),
    }),
  ).optional(),
  // HTTP/SSE fields
  url: z.string().optional(),
  headers: z.array(
    z.object({
      key: z.string().min(1, "Key is required"),
      value: z.string(),
    }),
  ).optional(),
})

type FormData = z.infer<typeof formSchema>

interface MCPServerSettingsProps {
  server: MCPServer
  isAuthenticated: boolean
  connectionStatus?: { status: string; error?: string; isStale?: boolean }
}

export function MCPServerSettings({
  server,
  isAuthenticated,
  connectionStatus,
}: MCPServerSettingsProps) {
  const { edit, remove } = useMCP()
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Initialize form with server data
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(server),
  })

  const { isDirty } = form.formState

  // Field arrays for dynamic inputs
  const envVarsField =
    server.transportType === "stdio" ? useFieldArray({ control: form.control, name: "envVars" as never }) : null

  const headersField =
    server.transportType !== "stdio" ? useFieldArray({ control: form.control, name: "headers" as never }) : null

  // Reset form when server changes
  useEffect(() => {
    form.reset(getDefaultValues(server))
  }, [server, form])

  async function onSubmit(data: FormData) {
    if (!isAuthenticated) return

    setIsSaving(true)
    try {
      const serverData = transformFormDataToServer(data, server)
      await edit({ id: server._id, ...serverData })
      toast.success("Server configuration saved")
      form.reset(data) // Reset dirty state
    } catch (error) {
      toast.error("Failed to save configuration")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!isAuthenticated) return

    try {
      await remove(server._id)
      toast.success("Server deleted")
      setShowDeleteConfirm(false)
    } catch (error) {
      toast.error("Failed to delete server")
      console.error(error)
    }
  }

  const isConnected = connectionStatus?.status === "connected" && !connectionStatus?.isStale

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-md">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Server Configuration</CardTitle>
                <CardDescription>Configure your MCP server settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* General Information Section */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAuthenticated} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            disabled={!isAuthenticated}
                            placeholder="What does this server do?"
                            className="resize-none"
                            rows={3}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Connection Configuration Section */}
                <div className="space-y-4 border-t pt-6">
                  <FormField
                    control={form.control}
                    name="transportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!isAuthenticated || isConnected}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="stdio">STDIO</SelectItem>
                            <SelectItem value="http">HTTP</SelectItem>
                            <SelectItem value="sse">SSE</SelectItem>
                          </SelectContent>
                        </Select>
                        {isConnected && <FormDescription>Disconnect to change transport type</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("transportType") === "stdio" ? (
                    <>
                      <FormField
                        control={form.control}
                        name="command"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Command</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={!isAuthenticated} placeholder="e.g., python, node, bash" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="args"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Arguments</FormLabel>
                            <FormControl>
                              <Input
                                value={field.value?.join(", ") || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      .split(",")
                                      .map((arg) => arg.trim())
                                      .filter(Boolean),
                                  )
                                }
                                disabled={!isAuthenticated}
                                placeholder="Comma separated, e.g: -m, server, --port, 3000"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Server URL</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isAuthenticated} placeholder="https://api.example.com/mcp" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Environment Variables / Headers */}
                {form.watch("transportType") === "stdio" && envVarsField && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-sm font-medium">Environment Variables</h3>
                    <p className="text-sm text-muted-foreground">Variables passed to the command</p>
                    {envVarsField.fields.length === 0 ? (
                      <div className="text-center py-4">
                        {!server.isPublic && (
                          <>
                            <p className="text-sm text-muted-foreground mb-2">No environment variables configured</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => envVarsField.append({ key: "", value: "" })}
                              disabled={!isAuthenticated}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Variable
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {envVarsField.fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                              <FormField
                                control={form.control}
                                name={`envVars.${index}.key` as const}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input {...field} placeholder="KEY_NAME" disabled={!isAuthenticated} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`envVars.${index}.value` as const}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input {...field} type="text" placeholder="Value" disabled={!isAuthenticated} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => envVarsField.remove(index)}
                                disabled={!isAuthenticated}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {!server.isPublic && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => envVarsField.append({ key: "", value: "" })}
                            disabled={!isAuthenticated}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Variable
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {form.watch("transportType") !== "stdio" && headersField && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-sm font-medium">Headers</h3>
                    <p className="text-sm text-muted-foreground">HTTP headers sent with requests</p>
                    {headersField.fields.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">No headers configured</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => headersField.append({ key: "", value: "" })}
                          disabled={!isAuthenticated}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Header
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {headersField.fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                              <FormField
                                control={form.control}
                                name={`headers.${index}.key` as const}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input {...field} placeholder="Header name" disabled={!isAuthenticated} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`headers.${index}.value` as const}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input {...field} type="text" placeholder="Value" disabled={!isAuthenticated} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => headersField.remove(index)}
                                disabled={!isAuthenticated}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => headersField.append({ key: "", value: "" })}
                          disabled={!isAuthenticated}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Header
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                {!server.isPublic && (
                  <div className="flex items-center justify-between border-t pt-6">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={!isAuthenticated}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Server
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                        disabled={!isDirty || !isAuthenticated}
                      >
                        Reset
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isDirty || !isAuthenticated || isSaving}
                        className={cn(isDirty && "bg-green-700 hover:bg-green-800 text-white border-green-500")}
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </form>
        </Form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Delete Server</CardTitle>
                <CardDescription>
                  Are you sure you want to delete "{server.name}"? This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions
function getDefaultValues(server: MCPServer): FormData {
  const base = {
    name: server.name,
    summary: server.summary || "",
    transportType: server.transportType as "stdio" | "http" | "sse",
  }

  if (server.transportType === "stdio" && server.config?.type === "stdio") {
    const envVars =
      server.config.requiresEnv?.map((key) => ({
        key,
        value: (server.config as any).env?.[key] || "",
      })) || []

    return {
      ...base,
      command: server.config.command || "",
      args: server.config.args || [],
      envVars,
    } as FormData
  } else if (server.config && (server.config.type === "http" || server.config.type === "sse")) {
    const headers = server.config.headers
      ? Object.entries(server.config.headers).map(([key, value]) => ({ key, value }))
      : []

    return {
      ...base,
      url: server.config.url || "",
      headers,
    } as FormData
  }

  // Fallback
  return {
    ...base,
    command: "",
    args: [],
    envVars: [],
  } as FormData
}

function transformFormDataToServer(data: FormData, originalServer: MCPServer) {
  const base = {
    name: data.name,
    summary: data.summary,
    isPublic: false, // All user-created servers are private
    transportType: data.transportType,
    localOnly: data.transportType === "stdio",
  }

  if (data.transportType === "stdio" && data.command) {
    // STDIO
    const envObj = (data.envVars || []).reduce(
      (acc, { key, value }) => {
        if (key) acc[key] = value
        return acc
      },
      {} as Record<string, string>,
    )

    const requiresEnv = (data.envVars || []).filter((v) => v.key).map((v) => v.key)

    return {
      ...base,
      requiresUserKey: requiresEnv.length > 0,
      config: {
        type: "stdio" as const,
        command: data.command!,
        args: data.args || [],
        ...(requiresEnv.length > 0 && {
          env: envObj,
          requiresEnv,
        }),
      },
    }
  } else {
    // HTTP/SSE
    const headersObj = (data.headers || []).reduce(
      (acc, { key, value }) => {
        if (key) acc[key] = value
        return acc
      },
      {} as Record<string, string>,
    )

    return {
      ...base,
      requiresUserKey: (data.headers || []).some(
        (h) => h.value.includes("{{") || h.value === "" || h.key.toLowerCase() === "authorization",
      ),
      config: {
        type: originalServer.transportType as "http" | "sse",
        url: data.url!,
        ...(Object.keys(headersObj).length > 0 && { headers: headersObj }),
      },
    }
  }
}
