import { useState, useCallback, RefObject } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"

export interface UseResizableChatPanelProps {
  chatPanelRef: RefObject<ImperativePanelHandle | null>
  play: () => void
  config: {
    defaultSizePercentage: number
    expandedWidthPercentage: number
    collapsedSizePercentage: number
  }
  initialIsMaximized?: boolean
}

export interface UseResizableChatPanelReturn {
  isChatPanelCollapsed: boolean
  isMaximized: boolean
  handleChatPanelToggle: (forceState?: boolean) => void
  handleMaximizeToggle: () => void
  syncPanelCollapsedState: (isCollapsed: boolean) => void
}

export function useResizableChatPanel({
  chatPanelRef,
  play,
  config,
  initialIsMaximized,
}: UseResizableChatPanelProps): UseResizableChatPanelReturn {
  const { defaultSizePercentage, expandedWidthPercentage, collapsedSizePercentage } = config

  const initialIsCollapsed = defaultSizePercentage <= collapsedSizePercentage

  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState<boolean>(initialIsCollapsed)
  const [isMaximized, setIsMaximized] = useState<boolean>(initialIsMaximized ?? false)

  const syncPanelCollapsedState = useCallback(
    (isCollapsed: boolean) => {
      setIsChatPanelCollapsed(isCollapsed)
      if (isCollapsed && isMaximized) {
        setIsMaximized(false)
      }
    },
    [isMaximized],
  )

  const resizeChatPanel = useCallback(
    (newSize: number) => {
      chatPanelRef.current?.resize(newSize)
    },
    [chatPanelRef],
  )

  const handleMaximizeToggle = useCallback(() => {
    const panel = chatPanelRef.current
    if (!panel) return

    play()
    const targetMaximizedState = !isMaximized

    if (targetMaximizedState) {
      resizeChatPanel(100)
    } else {
      if (isChatPanelCollapsed) {
        panel.collapse()
      } else {
        resizeChatPanel(expandedWidthPercentage)
      }
    }
    setIsMaximized(targetMaximizedState)
  }, [isMaximized, isChatPanelCollapsed, play, chatPanelRef, expandedWidthPercentage, resizeChatPanel])

  const handleChatPanelToggle = useCallback(
    (forceState?: boolean) => {
      const panel = chatPanelRef.current
      if (!panel) return

      play()

      let targetCollapsedState: boolean
      if (forceState !== undefined) {
        targetCollapsedState = forceState
      } else {
        targetCollapsedState = !isChatPanelCollapsed
      }

      if (isMaximized && !targetCollapsedState) {
        handleMaximizeToggle()
        return
      } else if (isMaximized && targetCollapsedState) {
        resizeChatPanel(expandedWidthPercentage)
        setIsMaximized(false)
      }

      if (targetCollapsedState) {
        panel.collapse()
      } else {
        panel.resize(expandedWidthPercentage)
      }
    },
    [
      isChatPanelCollapsed,
      isMaximized,
      play,
      chatPanelRef,
      expandedWidthPercentage,
      handleMaximizeToggle,
      resizeChatPanel,
    ],
  )

  return {
    isChatPanelCollapsed,
    isMaximized,
    handleChatPanelToggle,
    handleMaximizeToggle,
    syncPanelCollapsedState,
  }
}
