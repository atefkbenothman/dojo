import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useChatProvider } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"

export function MCPList() {
  const { connectionStatus, handleConnect, handleDisconnect, sessionId } =
    useChatProvider()

  return (
    <div className="flex flex-row gap-4">
      <Card
        className={cn(
          "w-[20rem]",
          connectionStatus === "connected" ? "border-chart-1 border" : "",
        )}
      >
        <CardHeader>
          <CardTitle>Github</CardTitle>
          <CardDescription>Online</CardDescription>
          <CardDescription>Status: {connectionStatus}</CardDescription>
          {sessionId && (
            <CardDescription>Session ID: {sessionId}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            onClick={
              connectionStatus === "connected"
                ? handleDisconnect
                : handleConnect
            }
            disabled={connectionStatus === "connecting"}
            className="w-full"
            variant={
              connectionStatus === "connected" ? "destructive" : "default"
            }
          >
            {connectionStatus === "connecting"
              ? "Connecting..."
              : connectionStatus === "connected"
                ? "Disconnect"
                : "Connect"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
