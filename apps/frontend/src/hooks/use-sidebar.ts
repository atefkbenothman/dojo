"use client"

import { useLocalStorage } from "./use-local-storage"
import { useState, useEffect, useCallback } from "react"

interface SidebarState {
  isCollapsed: boolean
  accordionSections: {
    workflows: string[]
    agents: string[]
    mcps: string[]
  }
}

const DEFAULT_SIDEBAR_STATE: SidebarState = {
  isCollapsed: false,
  accordionSections: {
    workflows: [],
    agents: [],
    mcps: [],
  },
}

const SIDEBAR_STATE_KEY = "dojo-sidebar-state"

type PageType = "workflows" | "agents" | "mcps"

export function useSidebar() {
  const { readStorage, writeStorage } = useLocalStorage()
  const [state, setState] = useState<SidebarState>(DEFAULT_SIDEBAR_STATE)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const storedState = readStorage<SidebarState>(SIDEBAR_STATE_KEY)

    if (storedState) {
      // Ensure the stored state has the correct structure
      const validatedState: SidebarState = {
        isCollapsed: Boolean(storedState.isCollapsed),
        accordionSections: {
          workflows: Array.isArray(storedState.accordionSections?.workflows)
            ? storedState.accordionSections.workflows
            : [],
          agents: Array.isArray(storedState.accordionSections?.agents) ? storedState.accordionSections.agents : [],
          mcps: Array.isArray(storedState.accordionSections?.mcps) ? storedState.accordionSections.mcps : [],
        },
      }
      setState(validatedState)
    }

    setIsInitialized(true)
  }, [readStorage])

  // Store state to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      writeStorage(SIDEBAR_STATE_KEY, state)
    }
  }, [state, isInitialized, writeStorage])

  // Sidebar collapse controls
  const toggleSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCollapsed: !prev.isCollapsed,
    }))
  }, [])

  const expandSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCollapsed: false,
    }))
  }, [])

  const collapseSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCollapsed: true,
    }))
  }, [])

  // Accordion section controls
  const setAccordionSections = useCallback((pageType: PageType, sections: string[]) => {
    setState((prev) => ({
      ...prev,
      accordionSections: {
        ...prev.accordionSections,
        [pageType]: sections,
      },
    }))
  }, [])

  const getAccordionSections = useCallback(
    (pageType: PageType): string[] => {
      return state.accordionSections[pageType]
    },
    [state.accordionSections],
  )

  return {
    // Sidebar state
    isCollapsed: state.isCollapsed,
    isInitialized,

    // Sidebar controls
    toggleSidebar,
    expandSidebar,
    collapseSidebar,

    // Accordion controls
    setAccordionSections,
    getAccordionSections,

    // Raw state for debugging
    state,
  }
}
