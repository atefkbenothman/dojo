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
import { useAIModels } from "@/hooks/use-ai-models"
import { useChatProvider } from "@/hooks/use-chat"
import { useImage } from "@/hooks/use-image"
import { useModelStore } from "@/store/use-model-store"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { AIModel, AIModelWithProvider } from "@dojo/db/convex/types"
import { ArrowUp } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"

interface ChatControlsProps {
  onSend: () => void
  modelsWithProviders: AIModelWithProvider
  selectedModel: AIModel | undefined
  setSelectedModelId: (id: Id<"models">) => void
}

const ChatControls = memo(function ChatControls({
  onSend,
  modelsWithProviders,
  selectedModel,
  setSelectedModelId,
}: ChatControlsProps) {
  const groupedModels = useMemo(() => {
    const grouped: Record<string, AIModel[]> = {}
    for (const model of modelsWithProviders) {
      const provider = model.provider?.name || "unknown"
      if (!grouped[provider]) {
        grouped[provider] = []
      }
      grouped[provider].push(model)
    }
    return grouped
  }, [modelsWithProviders])

  return (
    <div className="dark:bg-input/30 flex w-full items-baseline overflow-hidden bg-transparent p-2">
      {/* Model Select */}
      <Select value={(selectedModel && selectedModel.modelId) || ""} onValueChange={setSelectedModelId}>
        <SelectTrigger className="hover:cursor-pointer">
          <SelectValue placeholder="Model">{selectedModel ? selectedModel.name : null}</SelectValue>
        </SelectTrigger>
        <SelectContent className="text-xs" align="start">
          {Object.entries(groupedModels).map(([providerName, models]) => {
            if (!models.length) return null
            return (
              <SelectGroup key={providerName}>
                <SelectLabel>{providerName}</SelectLabel>
                {models.map((model) => (
                  <SelectItem key={model._id} value={model._id} className="hover:cursor-pointer">
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
      <Button className="ml-auto hover:cursor-pointer" variant="outline" onClick={onSend}>
        <ArrowUp className="h-4 w-4" strokeWidth={3} />
      </Button>
    </div>
  )
})

export const ChatFooter = memo(function ChatFooter() {
  const setSelectedModelId = useModelStore((state) => state.setSelectedModelId)

  const { selectedModel, modelsWithProviders } = useAIModels()

  const { handleChat } = useChatProvider()
  const { handleImageGeneration } = useImage()

  const [input, setInput] = useState<string>("")

  const inputRef = useRef(input)

  useEffect(() => {
    inputRef.current = input
  }, [input])

  const handleSend = useCallback(() => {
    if (inputRef.current.trim() === "") return

    if (selectedModel?.type === "image") {
      handleImageGeneration({
        message: inputRef.current,
        selectedModel,
      })
      setInput("")
      return
    }

    handleChat(inputRef.current)
    setInput("")
  }, [handleChat, inputRef, handleImageGeneration, selectedModel])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (input.trim() !== "") {
        handleSend()
        setInput("")
      }
    }
  }

  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-2">
      <div className="bg-background/80 dark:bg-input/30 relative w-full border">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="ring-none max-h-[280px] min-h-[120px] flex-1 resize-none border-none focus-visible:ring-transparent sm:text-[16px] md:text-xs"
        />
        <ChatControls
          onSend={handleSend}
          modelsWithProviders={modelsWithProviders}
          selectedModel={selectedModel}
          setSelectedModelId={setSelectedModelId}
        />
      </div>
    </div>
  )
})
