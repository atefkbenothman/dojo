"use server"

import { Card, CardContent } from "@/components/ui/card"
import { MCPList } from "@/app/mcp/mcp-list"
import { getAvailableMCPServers } from "@/actions/mcp-client-actions"

export default async function Mcp() {
  const { servers, error } = await getAvailableMCPServers()

  if (error || !servers) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Card>
          <CardContent className="font-medium">
            No services available
          </CardContent>
        </Card>
      </div>
    )
  }

  return <MCPList servers={servers} />
}
