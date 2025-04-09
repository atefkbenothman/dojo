"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChatProvider } from "@/hooks/use-chat"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowUp } from "lucide-react"

export function Chat() {
  const { messages, input, handleInputChange, handleSend } = useChatProvider()

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Message List */}
          <div className="space-y-2 p-2">
            {messages.map((msg, idx) =>
              msg.role === "user" ? (
                <div
                  key={idx}
                  className="bg-secondary text-secondary-foreground inline-block w-full p-2 px-2 py-1 wrap-break-word"
                >
                  <p className="text-xs">{msg.content.toString()}</p>
                </div>
              ) : (
                <div
                  key={idx}
                  className="bg-accent text-accent-foreground inline-block w-full p-2 px-2 py-1 wrap-break-word"
                >
                  <p className="text-xs">{msg.content.toString()}</p>
                </div>
              ),
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="flex flex-shrink-0 flex-col items-center gap-2 border-t p-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            className="ring-none max-h-[280px] min-h-[100px] flex-1 resize-none text-xs focus-visible:ring-transparent"
          />
          <div className="flex w-full">
            <Select>
              <SelectTrigger className="w-[104px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="ml-auto"
              variant="outline"
              onClick={handleSend}
              disabled={input.trim() === ""}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={3} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
