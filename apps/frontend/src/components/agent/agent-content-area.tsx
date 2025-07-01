import { AgentForm } from "@/components/agent/agent-form"
import { Card } from "@/components/ui/card"
import { type AgentStatus } from "@/hooks/use-agent"
import { cn } from "@/lib/utils"
import type { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { Agent } from "@dojo/db/convex/types"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useMemo } from "react"

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
    <div className="space-y-3 mt-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <h2 className="text-base sm:text-lg font-semibold">Status</h2>
      </div>
      <Card className={cn("p-3 sm:p-4", statusInfo.className)}>
        <div className="flex items-center gap-2">
          {statusInfo.icon}
          <span className="text-sm font-medium">{statusInfo.text}</span>
        </div>
      </Card>
    </div>
  )
}

interface AgentContentAreaProps {
  agent: Agent
  model: Doc<"models"> | null | undefined
  execution: {
    status: AgentStatus
    error?: string
  } | null
  isAuthenticated?: boolean
}

export function AgentContentArea({ agent, model, execution, isAuthenticated = false }: AgentContentAreaProps) {
  // Get execution status info
  const statusInfo = useMemo(() => {
    if (!execution) return null

    switch (execution.status) {
      case "preparing":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Preparing...",
          className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
        }
      case "running":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Running...",
          className: "text-green-600 bg-green-50 dark:bg-green-950/30",
        }
      case "completed":
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          text: "Completed",
          className: "text-green-600 bg-green-50 dark:bg-green-950/30",
        }
      case "failed":
      case "cancelled":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: execution.error || "Failed",
          className: "text-red-600 bg-red-50 dark:bg-red-950/30",
        }
      default:
        return null
    }
  }, [execution])

  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="max-w-4xl w-full px-4 py-8">
          <AgentForm agent={agent} mode="edit" variant="page" isAuthenticated={isAuthenticated} />
          {/* Status Section */}
          <StatusSection statusInfo={statusInfo} />
        </div>
      </div>
    </div>
  )
}
