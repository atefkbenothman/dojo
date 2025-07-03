import { MCPForm } from "@/components/mcp/form/mcp-form"
import { MCPConnectionState } from "@/hooks/use-mcp"
import type { MCPServer } from "@dojo/db/convex/types"

interface MCPContentAreaProps {
  server: MCPServer
  connectionStatus?: MCPConnectionState
  isAuthenticated?: boolean
}

export function MCPContentArea({ server, connectionStatus, isAuthenticated = false }: MCPContentAreaProps) {
  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex flex-col">
          <div className="max-w-4xl w-full px-0 sm:px-4 py-0 sm:py-8 h-full sm:h-auto flex flex-col sm:mx-auto sm:my-auto">
            <div className="h-full sm:h-auto min-w-[320px]">
              <MCPForm
                server={server}
                mode="edit"
                variant="page"
                isAuthenticated={isAuthenticated}
                connectionStatus={connectionStatus}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
