"use client"

import { ModelSelect } from "@/components/model-select"
import { Button } from "@/components/ui/button"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { Textarea } from "@/components/ui/textarea"
import { useAIModels } from "@/hooks/use-ai-models"
import { useChatProvider } from "@/hooks/use-chat"
import { useImage } from "@/hooks/use-image"
import { useImageStore } from "@/store/use-image-store"
import { useModelStore } from "@/store/use-model-store"
import { ArrowUp } from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"

interface ChatControlsProps {
  onSend: () => void
  isLoading: boolean
}

const ChatControls = memo(function ChatControls({ onSend, isLoading }: ChatControlsProps) {
  const setSelectedModelId = useModelStore((state) => state.setSelectedModelId)
  const { selectedModel } = useAIModels()

  return (
    <div className="dark:bg-input/30 flex w-full items-baseline overflow-hidden bg-transparent p-2">
      {/* Model Select */}
      <ModelSelect className="text-sm w-fit" value={selectedModel?.modelId} onValueChange={setSelectedModelId} />
      {/* Send Button */}
      <Button className="ml-auto hover:cursor-pointer" variant="outline" onClick={onSend} disabled={isLoading}>
        {isLoading ? <LoadingAnimationInline className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" strokeWidth={3} />}
      </Button>
    </div>
  )
})

export const ChatFooter = memo(function ChatFooter() {
  const { selectedModel } = useAIModels()
  const { handleChat, status } = useChatProvider()
  const { handleImageGeneration } = useImage()
  const { isImageGenerating } = useImageStore()

  const [input, setInput] = useState<string>("")

  const inputRef = useRef(input)

  useEffect(() => {
    inputRef.current = input
  }, [input])

  const handleSend = useCallback(() => {
    const trimmedInput = inputRef.current.trim()
    if (trimmedInput === "") return

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
      handleSend()
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
          isLoading={status === "submitted" || status === "streaming" || isImageGenerating}
        />
      </div>
    </div>
  )
})
