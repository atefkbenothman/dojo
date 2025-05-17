import { useState, useEffect, useCallback, RefObject } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"

export interface UseResizableChatPanelProps {
  chatPanelRef: RefObject<ImperativePanelHandle | null>
  play: () => void
  config: {
    defaultSizePercentage: number
    collapsedWidthPercentage: number
    expandedWidthPercentage: number
    smallScreenWidthThreshold?: number
  }
  initialCollapsed?: boolean
  initialMaximized?: boolean
}

export interface UseResizableChatPanelReturn {
  isChatPanelCollapsed: boolean
  isMaximized: boolean
  handleChatPanelToggle: (forceState?: boolean) => void
  handleMaximizeToggle: () => void
}

export function useResizableChatPanel({
  chatPanelRef,
  play,
  config,
  initialCollapsed = false,
  initialMaximized = false,
}: UseResizableChatPanelProps): UseResizableChatPanelReturn {
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState<boolean>(initialCollapsed)
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false)
  const [isMaximized, setIsMaximized] = useState<boolean>(initialMaximized)

  const {
    defaultSizePercentage,
    collapsedWidthPercentage,
    expandedWidthPercentage,
    smallScreenWidthThreshold = 640,
  } = config

  const resizeChatPanel = useCallback(
    (newSize: number) => {
      if (chatPanelRef.current) {
        chatPanelRef.current.resize(newSize)
      } else {
        console.warn("Chat panel ref not yet available for resize.")
      }
    },
    [chatPanelRef],
  )

  useEffect(() => {
    const checkScreenSize = () => {
      const small = window.innerWidth < smallScreenWidthThreshold
      setIsSmallScreen(small)

      if (small && isChatPanelCollapsed) {
        setIsChatPanelCollapsed(false)
        resizeChatPanel(expandedWidthPercentage)
      }
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [isChatPanelCollapsed, resizeChatPanel, expandedWidthPercentage, smallScreenWidthThreshold])

  const handleChatPanelToggle = useCallback(
    (forceState?: boolean) => {
      const targetCollapsedState = forceState !== undefined ? forceState : !isChatPanelCollapsed

      if (isSmallScreen && targetCollapsedState) {
        return
      }

      play()

      if (targetCollapsedState) {
        resizeChatPanel(collapsedWidthPercentage)
      } else {
        if (isMaximized) {
          setIsMaximized(false)
        }
        resizeChatPanel(expandedWidthPercentage)
      }
      setIsChatPanelCollapsed(targetCollapsedState)
    },
    [
      isChatPanelCollapsed,
      isSmallScreen,
      isMaximized,
      play,
      resizeChatPanel,
      collapsedWidthPercentage,
      expandedWidthPercentage,
    ],
  )

  const handleMaximizeToggle = useCallback(() => {
    const targetMaximizedState = !isMaximized
    play()
    if (targetMaximizedState) {
      resizeChatPanel(100)
      if (isChatPanelCollapsed) {
        setIsChatPanelCollapsed(false)
      }
    } else {
      resizeChatPanel(defaultSizePercentage)
    }
    setIsMaximized(targetMaximizedState)
  }, [isMaximized, isChatPanelCollapsed, play, resizeChatPanel, defaultSizePercentage])

  return {
    isChatPanelCollapsed,
    isMaximized,
    handleChatPanelToggle,
    handleMaximizeToggle,
  }
}
