import { KeyValueInputFields } from "@/components/mcp/key-value-input-fields"
import { MCPDeleteDialog } from "@/components/mcp/mcp-delete-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle, errorToastStyle } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer, AllowedStdioCommand } from "@dojo/db/convex/types"
import { ALLOWED_STDIO_COMMANDS } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { WithoutSystemFields } from "convex/server"
import { AlertCircle, Wrench } from "lucide-react"
import { useMemo, useEffect, useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

// Form schema for MCP server editing
const mcpFormSchema = z.discriminatedUnion("transportType", [
  z.object({
    transportType: z.literal("stdio"),
    name: z.string().min(1, "Name is required"),
    summary: z.string().optional(),
    command: z.enum(ALLOWED_STDIO_COMMANDS, {
      errorMap: () => ({ message: "Only npx and uvx commands are allowed" }),
    }),
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
    name: z.string().min(1, "Name is required"),
    summary: z.string().optional(),
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
    name: z.string().min(1, "Name is required"),
    summary: z.string().optional(),
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

interface MCPFormProps {
  server?: MCPServer
  mode: "add" | "edit"
  variant?: "page" | "dialog"
  isAuthenticated?: boolean
  onClose?: () => void
}

// Component for read-only notice
interface ReadOnlyNoticeSectionProps {
  canEdit: boolean
  isPublic: boolean | undefined
}

function ReadOnlyNoticeSection({ canEdit, isPublic }: ReadOnlyNoticeSectionProps) {
  if (canEdit) return null

  return (
    <Card className="p-3 sm:p-4 bg-muted/50 border-muted">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        {isPublic
          ? "This is a public server and cannot be edited. Clone it to create your own version."
          : "Sign in to edit this server."}
      </div>
    </Card>
  )
}

// Component for server name section
interface ServerNameSectionProps {
  form: UseFormReturn<MCPFormValues>
  canEdit: boolean
  mode: "add" | "edit"
}

function ServerNameSection({ form, canEdit, mode }: ServerNameSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Server Name</p>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} placeholder="Server name" disabled={!canEdit} className="bg-muted/20" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// Component for server summary section
interface ServerSummarySectionProps {
  form: UseFormReturn<MCPFormValues>
  canEdit: boolean
}

function ServerSummarySection({ form, canEdit }: ServerSummarySectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Description</p>
      <FormField
        control={form.control}
        name="summary"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea
                {...field}
                className="min-h-[80px] max-h-[120px] h-[80px] text-sm bg-muted/20"
                placeholder="What does this server do?"
                disabled={!canEdit}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// Component for transport type selection
interface TransportTypeSectionProps {
  form: UseFormReturn<MCPFormValues>
  canEdit: boolean
  mode: "add" | "edit"
  currentTransportType: "stdio" | "http" | "sse"
  onTransportTypeChange: (value: string) => void
}

function TransportTypeSection({
  form,
  canEdit,
  mode,
  currentTransportType,
  onTransportTypeChange,
}: TransportTypeSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Transport Type</p>
      <Tabs value={currentTransportType} onValueChange={onTransportTypeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 h-12">
          <TabsTrigger value="stdio" disabled={!canEdit}>
            Local (stdio)
          </TabsTrigger>
          <TabsTrigger value="http" disabled={!canEdit}>
            Remote (HTTP)
          </TabsTrigger>
          <TabsTrigger value="sse" disabled={!canEdit}>
            Remote (SSE)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stdio" className="space-y-4 mt-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Command</p>
            <FormField
              control={form.control}
              name="command"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder="npx or uvx" disabled={!canEdit} className="bg-muted/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Arguments</p>
            <FormField
              control={form.control}
              name="argsString"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Comma separated, e.g: -f,file.py,--verbose"
                      disabled={!canEdit}
                      className="bg-muted/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="envPairs"
            render={({ field }) => (
              <KeyValueInputFields
                pairs={field.value || []}
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
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Server URL</p>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://api.example.com/mcp"
                      disabled={!canEdit}
                      className="bg-muted/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Server URL</p>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://api.example.com/sse"
                      disabled={!canEdit}
                      className="bg-muted/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
  )
}

// Helper function to create MCP object from form data
function createMCPObject(data: MCPFormValues): WithoutSystemFields<Doc<"mcp">> {
  const base = {
    name: data.name,
    summary: data.summary,
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
          command: data.command as AllowedStdioCommand,
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
      const headers = Object.fromEntries(data.headers.filter((h) => h.key && h.value).map((h) => [h.key, h.value]))

      return {
        ...base,
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

// Helper function to get default form values
function getDefaultFormValues(server?: MCPServer): MCPFormValues {
  if (!server) {
    return {
      transportType: "stdio" as const,
      name: "",
      summary: "",
      command: "npx" as AllowedStdioCommand,
      argsString: "",
      envPairs: [],
    }
  }

  const baseValues = {
    name: server.name || "",
    summary: server.summary || "",
  }

  if (server.transportType === "http" || server.transportType === "sse") {
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
      command = stdioConfig.command || "npx"
      argsString = (stdioConfig.args || []).join(", ")
    }

    return {
      ...baseValues,
      transportType: "stdio" as const,
      command: command as AllowedStdioCommand,
      argsString,
      envPairs,
    }
  }
}

export function MCPForm({ server, mode, variant = "page", isAuthenticated = false, onClose }: MCPFormProps) {
  const { play } = useSoundEffectContext()
  const { create, edit, remove, clone } = useMCP()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [currentTransportType, setCurrentTransportType] = useState<"stdio" | "http" | "sse">(
    server?.transportType || "stdio",
  )

  // Check if user can edit
  const isPublicServer = server?.isPublic || false
  const canEdit = Boolean(isAuthenticated && !isPublicServer)

  // Form setup with proper default values
  const form = useForm<MCPFormValues>({
    resolver: zodResolver(mcpFormSchema),
    defaultValues: getDefaultFormValues(server),
  })

  // Initialize transport type values based on the server data
  const getInitialTransportTypeValues = () => {
    const defaultValues = getDefaultFormValues(server)
    const initialValues: {
      stdio: { command: AllowedStdioCommand; argsString: string; envPairs: Array<{ key: string; value: string }> }
      http: { url: string; headers: Array<{ key: string; value: string }> }
      sse: { url: string; headers: Array<{ key: string; value: string }> }
    } = {
      stdio: { command: "npx", argsString: "", envPairs: [] },
      http: { url: "", headers: [] },
      sse: { url: "", headers: [] },
    }

    if (server) {
      if (server.transportType === "stdio" && defaultValues.transportType === "stdio") {
        initialValues.stdio = {
          command: defaultValues.command || "npx",
          argsString: defaultValues.argsString || "",
          envPairs: defaultValues.envPairs || [],
        }
      } else if (
        (server.transportType === "http" || server.transportType === "sse") &&
        (defaultValues.transportType === "http" || defaultValues.transportType === "sse")
      ) {
        const httpOrSseDefaults = defaultValues as { url: string; headers: Array<{ key: string; value: string }> }
        initialValues[server.transportType] = {
          url: httpOrSseDefaults.url || "",
          headers: httpOrSseDefaults.headers || [],
        }
      }
    }

    return initialValues
  }

  // Store form values for each transport type to preserve them when switching
  const [transportTypeValues, setTransportTypeValues] = useState<{
    stdio: { command: AllowedStdioCommand; argsString: string; envPairs: Array<{ key: string; value: string }> }
    http: { url: string; headers: Array<{ key: string; value: string }> }
    sse: { url: string; headers: Array<{ key: string; value: string }> }
  }>(getInitialTransportTypeValues())

  // Reset form when server changes
  useEffect(() => {
    if (server) {
      const defaultValues = getDefaultFormValues(server)
      form.reset(defaultValues)
      setCurrentTransportType(server.transportType as "stdio" | "http" | "sse")

      // Initialize transport type values for the current server
      const newTransportTypeValues: {
        stdio: { command: AllowedStdioCommand; argsString: string; envPairs: Array<{ key: string; value: string }> }
        http: { url: string; headers: Array<{ key: string; value: string }> }
        sse: { url: string; headers: Array<{ key: string; value: string }> }
      } = {
        stdio: { command: "npx", argsString: "", envPairs: [] },
        http: { url: "", headers: [] },
        sse: { url: "", headers: [] },
      }

      if (server.transportType === "stdio" && defaultValues.transportType === "stdio") {
        newTransportTypeValues.stdio = {
          command: defaultValues.command || "npx",
          argsString: defaultValues.argsString || "",
          envPairs: defaultValues.envPairs || [],
        }
      } else if (server.transportType === "http" && defaultValues.transportType === "http") {
        const httpDefaults = defaultValues as { url: string; headers: Array<{ key: string; value: string }> }
        newTransportTypeValues.http = {
          url: httpDefaults.url || "",
          headers: httpDefaults.headers || [],
        }
      } else if (server.transportType === "sse" && defaultValues.transportType === "sse") {
        const sseDefaults = defaultValues as { url: string; headers: Array<{ key: string; value: string }> }
        newTransportTypeValues.sse = {
          url: sseDefaults.url || "",
          headers: sseDefaults.headers || [],
        }
      }

      setTransportTypeValues(newTransportTypeValues)
    }
  }, [server, form])

  // Handle transport type change
  const handleTransportTypeChange = useCallback(
    (value: string) => {
      // Only allow changes if user can edit
      if (!canEdit) return

      const oldTransportType = currentTransportType
      const newTransportType = value as "stdio" | "http" | "sse"

      // Save current values before switching
      if (oldTransportType === "stdio") {
        setTransportTypeValues((prev) => ({
          ...prev,
          stdio: {
            command: form.getValues("command"),
            argsString: form.getValues("argsString"),
            envPairs: form.getValues("envPairs"),
          },
        }))
      } else {
        setTransportTypeValues((prev) => ({
          ...prev,
          [oldTransportType]: {
            url: form.getValues("url"),
            headers: form.getValues("headers"),
          },
        }))
      }

      setCurrentTransportType(newTransportType)

      // Keep existing name and summary
      const currentName = form.getValues("name")
      const currentSummary = form.getValues("summary")

      // Load saved values for the new transport type
      if (newTransportType === "stdio") {
        form.reset({
          transportType: "stdio",
          name: currentName,
          summary: currentSummary,
          command: transportTypeValues.stdio.command,
          argsString: transportTypeValues.stdio.argsString,
          envPairs: transportTypeValues.stdio.envPairs,
        })
      } else {
        form.reset({
          transportType: newTransportType,
          name: currentName,
          summary: currentSummary,
          url: transportTypeValues[newTransportType].url,
          headers: transportTypeValues[newTransportType].headers,
        })
      }
    },
    [canEdit, form, currentTransportType, transportTypeValues],
  )

  const handleSave = async (data: MCPFormValues) => {
    try {
      const serverData = createMCPObject(data)
      if (mode === "add") {
        await create(serverData)
        toast.success(`${serverData.name} server added`, {
          icon: null,
          duration: 3000,
          position: "bottom-center",
          style: successToastStyle,
        })
      } else if (server) {
        await edit({ id: server._id, ...serverData })
        toast.success("Server configuration saved", {
          icon: null,
          duration: 3000,
          position: "bottom-center",
          style: successToastStyle,
        })
      }
      play("./sounds/save.mp3", { volume: 0.5 })
      onClose?.()
    } catch (error) {
      toast.error("Failed to save server", {
        icon: null,
        duration: 3000,
        position: "bottom-center",
      })
    }
  }

  const handleCancel = () => {
    form.reset()
    onClose?.()
  }

  const handleDelete = async () => {
    if (!server) return
    try {
      await remove(server._id)
      toast.error(`${server.name} server deleted`, {
        icon: null,
        duration: 3000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      play("./sounds/delete.mp3", { volume: 0.5 })
      onClose?.()
    } catch (error) {
      toast.error("Failed to delete server", {
        icon: null,
        duration: 3000,
        position: "bottom-center",
      })
    }
  }

  const handleClone = useCallback(async () => {
    if (!server) return
    try {
      await clone(server._id)
      onClose?.()
    } catch (error) {
      // Error handling is already done in the clone function
    }
  }, [server, clone, onClose])

  const formContent = (
    <div className="flex flex-col h-full sm:h-auto sm:block space-y-8">
      <ReadOnlyNoticeSection canEdit={canEdit} isPublic={isPublicServer} />
      <ServerNameSection form={form} canEdit={canEdit} mode={mode} />
      <ServerSummarySection form={form} canEdit={canEdit} />
      <TransportTypeSection
        form={form}
        canEdit={canEdit}
        mode={mode}
        currentTransportType={currentTransportType}
        onTransportTypeChange={handleTransportTypeChange}
      />
    </div>
  )

  const formFooter = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
      {mode === "edit" && canEdit && (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
          className="w-full sm:w-auto hover:cursor-pointer border-destructive"
        >
          Delete
        </Button>
      )}
      {mode === "edit" && isPublicServer && isAuthenticated && (
        <Button type="button" variant="outline" onClick={handleClone} className="w-full sm:w-auto hover:cursor-pointer">
          Clone
        </Button>
      )}
      {!isPublicServer && (
        <>
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
            variant={variant === "dialog" ? "secondary" : "default"}
          >
            {mode === "add" ? "Create Server" : "Save"}
          </Button>
        </>
      )}
    </div>
  )

  // Check if we should show the footer
  const shouldShowFooter =
    (mode === "edit" && canEdit) || // Delete button
    (mode === "edit" && isPublicServer && isAuthenticated) || // Clone button
    !isPublicServer // Cancel and Save buttons

  if (variant === "dialog") {
    return (
      <>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <Card className="p-0 border-[1.5px] gap-0">
              <CardHeader className="p-4 gap-0 border-b-[1.5px]">
                <CardTitle>
                  {mode === "add" ? "New MCP Server" : `${form.watch("name") || server?.name} Config`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-background space-y-8">{formContent}</CardContent>
              {shouldShowFooter && <CardFooter className="p-4 gap-0 border-t-[1.5px]">{formFooter}</CardFooter>}
            </Card>
          </form>
        </Form>
        <MCPDeleteDialog
          server={server || null}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
        />
      </>
    )
  }

  // Page variant
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="h-full sm:h-auto flex flex-col">
          <Card className="p-0 border-0 sm:border-[1.5px] gap-0 rounded-none sm:rounded-lg h-full sm:h-auto flex flex-col">
            <CardHeader className="p-4 gap-0 border-b-[1.5px] flex-shrink-0 sticky top-0 z-10 bg-card sm:static">
              <CardTitle className="text-sm font-medium">
                {mode === "add" ? "New MCP Server" : `${form.watch("name") || server?.name} Config`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-background flex-1 sm:flex-initial overflow-y-auto sm:overflow-visible flex flex-col">
              {formContent}
            </CardContent>
            {shouldShowFooter && (
              <CardFooter className="p-4 gap-0 border-t-[1.5px] flex-shrink-0 sticky bottom-0 z-10 bg-card sm:static">
                {formFooter}
              </CardFooter>
            )}
          </Card>
        </form>
      </Form>
      <MCPDeleteDialog
        server={server || null}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
      />
    </>
  )
}
