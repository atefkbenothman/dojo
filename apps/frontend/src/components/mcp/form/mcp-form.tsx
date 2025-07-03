import { KeyValueInputFields } from "@/components/mcp/form/key-value-input-fields"
import { mcpFormSchema, type MCPFormValues } from "@/components/mcp/form/mcp-form-schema"
import { createMCPObject, getDefaultFormValues } from "@/components/mcp/form/mcp-form-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useMCP, MCPConnectionState, isMCPConnected, isMCPConnecting, isMCPError } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle, errorToastStyle } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { MCPServer } from "@dojo/db/convex/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, CheckCircle2, Wrench } from "lucide-react"
import { useEffect, useCallback, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

// Component for read-only notice
interface ReadOnlyNoticeSectionProps {
  canEdit: boolean
  isPublic: boolean | undefined
}

function ReadOnlyNoticeSection({ canEdit, isPublic }: ReadOnlyNoticeSectionProps) {
  if (canEdit) return null

  return (
    <Card className="p-3 sm:p-4 bg-muted/60 border-muted/20">
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
              <FormItem>
                <KeyValueInputFields
                  pairs={field.value || []}
                  mode={mode}
                  onUpdatePairs={field.onChange}
                  disabled={!canEdit}
                  fieldName="envPairs"
                  fieldLabel="Environment Variables"
                  placeholder={{ key: "API_KEY", value: "Value" }}
                />
                <FormMessage />
              </FormItem>
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
              <FormItem>
                <KeyValueInputFields
                  pairs={field.value || []}
                  mode={mode}
                  onUpdatePairs={field.onChange}
                  disabled={!canEdit}
                  fieldName="headers"
                  fieldLabel="Headers"
                  placeholder={{ key: "Authorization", value: "Bearer token" }}
                />
                <FormMessage />
              </FormItem>
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
              <FormItem>
                <KeyValueInputFields
                  pairs={field.value || []}
                  mode={mode}
                  onUpdatePairs={field.onChange}
                  disabled={!canEdit}
                  fieldName="headers"
                  fieldLabel="Headers"
                  placeholder={{ key: "Authorization", value: "Bearer token" }}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
      </Tabs>
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
    <Card className={cn("p-3 sm:p-4", statusInfo.className)}>
      <div className="flex items-center gap-2 text-sm">
        {statusInfo.icon}
        <span>{statusInfo.text}</span>
      </div>
    </Card>
  )
}

// Component for tools section
interface ToolsSectionProps {
  tools?: Record<string, unknown>
}

function ToolsSection({ tools }: ToolsSectionProps) {
  if (!tools || Object.keys(tools).length === 0) return null

  const toolNames = Object.keys(tools)

  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">Available Tools ({toolNames.length})</p>
      <Card className="p-3 sm:p-4 bg-muted/20 border-muted/20">
        <div className="flex flex-wrap gap-2">
          {toolNames.map((toolName) => (
            <div key={toolName} className="bg-secondary/60 text-foreground rounded-md px-2.5 py-1 text-xs font-medium">
              {toolName}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

interface MCPFormProps {
  server?: MCPServer
  mode: "add" | "edit"
  variant?: "page" | "dialog"
  isAuthenticated?: boolean
  connectionStatus?: MCPConnectionState
  onClose?: () => void
  onDeleteClick?: (server: MCPServer) => void
}

export function MCPForm({
  server,
  mode,
  variant = "page",
  isAuthenticated = false,
  connectionStatus,
  onClose,
  onDeleteClick,
}: MCPFormProps) {
  const { play } = useSoundEffectContext()
  const { create, edit, clone, activeConnections } = useMCP()

  // Check if user can edit
  const isPublicServer = server?.isPublic || false
  const canEdit = Boolean(isAuthenticated && !isPublicServer)

  // Form setup with proper default values
  const form = useForm<MCPFormValues>({
    resolver: zodResolver(mcpFormSchema),
    defaultValues: getDefaultFormValues(server),
    mode: "all", // Validate all fields, not just the touched ones
  })

  // Watch the transport type from form state
  const currentTransportType = form.watch("transportType") as "stdio" | "http" | "sse"

  // Get connection status info
  const statusInfo = useMemo(() => {
    if (!connectionStatus) return null

    const isConnected = isMCPConnected(connectionStatus)
    const isConnecting = isMCPConnecting(connectionStatus)
    const hasError = isMCPError(connectionStatus)

    if (isConnecting) {
      return {
        icon: <LoadingAnimationInline className="text-yellow-600 dark:text-yellow-500" />,
        text: "Connecting to server...",
        className:
          "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50 text-yellow-700 dark:text-yellow-400",
      }
    }

    if (isConnected) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />,
        text: "Connected to server",
        className:
          "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400",
      }
    }

    if (hasError) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />,
        text: connectionStatus.error || "Connection failed",
        className:
          "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400",
      }
    }

    return null
  }, [connectionStatus])

  // Get tools for this server
  const tools = useMemo(() => {
    if (!server) return undefined
    const connection = activeConnections.find((conn) => conn.serverId === server._id)
    return connection?.tools
  }, [activeConnections, server])

  // Reset form when server changes
  useEffect(() => {
    if (server) {
      const defaultValues = getDefaultFormValues(server)
      form.reset(defaultValues)
    } else {
      // No server selected, reset to empty form
      form.reset(getDefaultFormValues())
    }
  }, [server, form])

  // Handle transport type change
  const handleTransportTypeChange = useCallback(
    (value: string) => {
      // Only allow changes if user can edit
      if (!canEdit) return

      const newTransportType = value as "stdio" | "http" | "sse"

      // Simply update the transport type - React Hook Form will preserve all other values
      form.setValue("transportType", newTransportType, {
        shouldDirty: true,
        shouldValidate: true,
      })
    },
    [canEdit, form],
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
      // Reset form state to clear dirty flag
      form.reset(data)
      onClose?.()
    } catch (error) {
      play("./sounds/error.mp3", { volume: 0.5 })
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(`Failed to save server: ${errorMessage}`, {
        icon: null,
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
    }
  }

  const handleCancel = () => {
    form.reset()
    onClose?.()
  }

  const handleDeleteClick = () => {
    if (!server || !onDeleteClick) return
    onDeleteClick(server)
  }

  const handleClone = useCallback(async () => {
    if (!server) return
    try {
      await clone(server._id)
      onClose?.()
    } catch (error) {
      // Error handling is already done in the clone function
      // But we should still prevent the dialog from closing on error
      console.error("Clone failed:", error)
    }
  }, [server, clone, onClose])

  const formContent = (
    <div className="flex flex-col h-full sm:h-auto sm:block space-y-4">
      <div className="space-y-2">
        <ReadOnlyNoticeSection canEdit={canEdit} isPublic={isPublicServer} />
        {mode === "edit" && <StatusSection statusInfo={statusInfo} />}
      </div>
      <div className="space-y-8">
        <ServerNameSection form={form} canEdit={canEdit} mode={mode} />
        <ServerSummarySection form={form} canEdit={canEdit} />
        <TransportTypeSection
          form={form}
          canEdit={canEdit}
          mode={mode}
          currentTransportType={currentTransportType}
          onTransportTypeChange={handleTransportTypeChange}
        />
        {mode === "edit" && <ToolsSection tools={tools} />}
      </div>
    </div>
  )

  const formFooter = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
      {mode === "edit" && canEdit && onDeleteClick && (
        <Button
          type="button"
          variant="destructive"
          onClick={handleDeleteClick}
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
    (mode === "edit" && canEdit && onDeleteClick) || // Delete button
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
    </>
  )
}
