"use client"

import { memo, useState, useCallback, useRef, useEffect } from "react"
import { useChatProvider } from "@/hooks/use-chat"
import { useModelContext } from "@/hooks/use-model"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUp } from "lucide-react"

interface ChatControlsProps {
  onSend: () => void
}

const ChatControls = memo(function ChatControls({ onSend }: ChatControlsProps) {
  const { availableModels, selectedModelId, handleModelChange } = useModelContext()

  return (
    <div className="dark:bg-input/30 flex w-full items-baseline overflow-hidden bg-transparent p-2">
      <Select value={selectedModelId} onValueChange={handleModelChange}>
        <SelectTrigger className="hover:cursor-pointer">
          <SelectValue placeholder="Model" />
        </SelectTrigger>
        <SelectContent className="text-xs" align="start">
          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="hover:cursor-pointer">
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button className="ml-auto hover:cursor-pointer" variant="outline" onClick={onSend}>
        <ArrowUp className="h-4 w-4" strokeWidth={3} />
      </Button>
    </div>
  )
})

export const ChatFooter = memo(function ChatFooter() {
  const { handleChat } = useChatProvider()

  const [input, setInput] = useState<string>("")

  const inputRef = useRef(input)

  useEffect(() => {
    inputRef.current = input
  }, [input])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSend = useCallback(() => {
    if (inputRef.current.trim() !== "") {
      handleChat(inputRef.current)
      setInput("")
    }
  }, [handleChat])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (input.trim() !== "") {
        handleChat(input)
        setInput("")
      }
    }
  }

  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-2 p-2">
      <div className="dark:bg-input/30 relative w-full border bg-transparent">
        <Textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="ring-none max-h-[280px] min-h-[120px] flex-1 resize-none border-none focus-visible:ring-transparent sm:text-[16px] md:text-xs"
        />
        <ChatControls onSend={handleSend} />
      </div>
    </div>
  )
})
