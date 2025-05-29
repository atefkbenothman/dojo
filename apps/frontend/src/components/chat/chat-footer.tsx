"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useChatProvider } from "@/hooks/use-chat"
import { useModelContext } from "@/hooks/use-model"
import type { AIModel } from "@dojo/config"
import { ArrowUp } from "lucide-react"
import { memo, useState, useCallback, useRef, useEffect } from "react"

interface ChatControlsProps {
  onSend: () => void
}

const ChatControls = memo(function ChatControls({ onSend }: ChatControlsProps) {
  const { models, selectedModel, setSelectedModelId } = useModelContext()

  const groupedModels = models.reduce<Record<string, AIModel[]>>((acc, model) => {
    ;(acc[model.provider] ??= []).push(model)
    return acc
  }, {})

  const handleSend = useCallback(() => {
    onSend()
  }, [onSend])

  return (
    <div className="dark:bg-input/30 flex w-full items-baseline overflow-hidden bg-transparent p-2">
      {/* Model Select */}
      <Select value={(selectedModel && selectedModel.id) || ""} onValueChange={setSelectedModelId}>
        <SelectTrigger className="hover:cursor-pointer">
          <SelectValue placeholder="Model">{selectedModel ? selectedModel.name : null}</SelectValue>
        </SelectTrigger>
        <SelectContent className="text-xs" align="start">
          {Object.entries(groupedModels).map(([providerId, models]) => {
            if (!models.length) return null
            return (
              <SelectGroup key={providerId}>
                <SelectLabel>{models[0]?.provider}</SelectLabel>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="hover:cursor-pointer">
                    {model.name}
                    {model.requiresApiKey && (
                      <span className="text-muted-foreground text-xs ml-1 font-normal">(requires key)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectGroup>
            )
          })}
        </SelectContent>
      </Select>
      {/* Send Button */}
      <Button className="ml-auto hover:cursor-pointer" variant="outline" onClick={handleSend}>
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
    <div className="flex flex-shrink-0 flex-col items-center gap-2">
      <div className="bg-background/80 dark:bg-input/30 relative w-full border">
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
