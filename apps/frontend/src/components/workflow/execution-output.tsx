"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { CheckCircle, XCircle, Clock, Loader2, Copy, ChevronDown, ChevronRight } from "lucide-react"
import { memo, useState, useCallback } from "react"

interface WorkflowExecution {
  _id: string
  workflowId: string
  status: "preparing" | "running" | "completed" | "failed" | "cancelled"
  currentStep?: number
  totalSteps: number
  stepExecutions?: Array<{
    stepIndex: number
    agentId: string
    status: "pending" | "running" | "completed" | "failed"
    startedAt?: number
    completedAt?: number
    error?: string
  }>
  startedAt: number
  completedAt?: number
  error?: string
}

interface StepOutputData {
  stepIndex: number
  agentName: string
  output: string
  status: "running" | "completed" | "failed"
  startTime: number
  endTime?: number
}

interface ExecutionOutputProps {
  execution: WorkflowExecution
  agents: Agent[]
  workflowSteps: string[]
  stepOutputs?: StepOutputData[] // This would come from real-time streaming
}

export const ExecutionOutput = memo(function ExecutionOutput({
  execution,
  agents,
  workflowSteps,
  stepOutputs = [],
}: ExecutionOutputProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(
    new Set(execution.currentStep !== undefined ? [execution.currentStep] : [])
  )
  
  const getAgent = (agentId: string) => agents.find(agent => agent._id === agentId)
  
  const toggleStepExpansion = useCallback((stepIndex: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepIndex)) {
        next.delete(stepIndex)
      } else {
        next.add(stepIndex)
      }
      return next
    })
  }, [])
  
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }, [])
  
  const getStepStatus = (stepIndex: number) => {
    if (!execution.stepExecutions) {
      if (execution.currentStep === undefined) return "pending"
      if (stepIndex < execution.currentStep) return "completed"
      if (stepIndex === execution.currentStep) {
        return execution.status === "running" ? "running" : "pending"
      }
      return "pending"
    }
    
    const stepExecution = execution.stepExecutions.find(se => se.stepIndex === stepIndex)
    return stepExecution?.status || "pending"
  }
  
  const getStepOutput = (stepIndex: number) => {
    return stepOutputs.find(output => output.stepIndex === stepIndex)
  }
  
  const getStatusIcon = (status: string) => {
    const iconClass = "h-4 w-4"
    
    switch (status) {
      case "completed":
        return <CheckCircle className={cn(iconClass, "text-green-500")} />
      case "failed":
        return <XCircle className={cn(iconClass, "text-red-500")} />
      case "running":
        return <Loader2 className={cn(iconClass, "text-blue-500 animate-spin")} />
      case "pending":
        return <Clock className={cn(iconClass, "text-gray-400")} />
      default:
        return <Clock className={cn(iconClass, "text-gray-400")} />
    }
  }
  
  const formatDuration = (startTime: number, endTime?: number) => {
    const end = endTime || Date.now()
    const duration = Math.round((end - startTime) / 1000)
    
    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }
  
  const formatOutput = (output: string) => {
    // Simple formatting - could be enhanced with syntax highlighting
    if (output.includes('```')) {
      // Handle code blocks
      return output.split('```').map((part, index) => {
        if (index % 2 === 1) {
          // This is a code block
          return (
            <pre key={index} className="bg-gray-100 p-3 rounded-md my-2 overflow-x-auto text-sm">
              <code>{part}</code>
            </pre>
          )
        }
        // Regular text
        return <span key={index}>{part}</span>
      })
    }
    
    // Handle line breaks
    return output.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < output.split('\n').length - 1 && <br />}
      </span>
    ))
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold">Step Outputs</h3>
            <p className="text-sm text-muted-foreground">
              Real-time output from each workflow step
            </p>
          </div>
          
          {/* Quick stats */}
          <div className="text-right text-xs space-y-1">
            <div className="text-muted-foreground">
              Progress: {execution.stepExecutions?.filter(se => se.status === "completed").length || 0}/{execution.totalSteps}
            </div>
            <div className="text-muted-foreground">
              Runtime: {formatDuration(execution.startedAt, execution.completedAt || (execution.status === "running" ? Date.now() : execution.startedAt))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Output content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {workflowSteps.map((agentId, stepIndex) => {
          const agent = getAgent(agentId)
          const stepStatus = getStepStatus(stepIndex)
          const stepOutput = getStepOutput(stepIndex)
          const isExpanded = expandedSteps.has(stepIndex)
          const isCurrentStep = execution.currentStep === stepIndex
          
          if (!agent) return null
          
          return (
            <Card 
              key={`${stepIndex}-${agentId}`} 
              className={cn(
                "transition-all duration-200",
                isCurrentStep && "border-blue-500 shadow-md",
                stepStatus === "completed" && "border-green-200",
                stepStatus === "failed" && "border-red-200"
              )}
            >
              <CardHeader 
                className="pb-3 cursor-pointer hover:bg-gray-50" 
                onClick={() => toggleStepExpansion(stepIndex)}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(stepStatus)}
                    <span>Step {stepIndex + 1}: {agent.name}</span>
                    {isCurrentStep && stepStatus === "running" && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {stepOutput && (
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(stepOutput.startTime, stepOutput.endTime)}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  {/* Agent prompt */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium mb-1">Agent Instructions:</h4>
                    <p className="text-sm text-gray-600">{agent.systemPrompt}</p>
                  </div>
                  
                  {/* Output */}
                  {stepOutput ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Output:</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(stepOutput.output)}
                          className="h-7 px-2"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      
                      <div className="bg-white border rounded-md p-4 max-h-96 overflow-y-auto">
                        <div className="text-sm whitespace-pre-wrap font-mono">
                          {stepStatus === "running" && (
                            <div className="mb-2 text-blue-600 font-medium">
                              🔄 Generating response...
                            </div>
                          )}
                          {formatOutput(stepOutput.output)}
                          {stepStatus === "running" && (
                            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                          )}
                        </div>
                      </div>
                      
                      {stepStatus === "failed" && execution.stepExecutions && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <h5 className="text-sm font-medium text-red-800 mb-1">Error:</h5>
                          <p className="text-sm text-red-700">
                            {execution.stepExecutions.find(se => se.stepIndex === stepIndex)?.error || "Unknown error occurred"}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : stepStatus === "pending" ? (
                    <div className="p-8 text-center text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Waiting to execute...</p>
                    </div>
                  ) : stepStatus === "running" ? (
                    <div className="p-8 text-center text-blue-600">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      <p className="text-sm">Executing step...</p>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-sm">No output available</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
        
        {workflowSteps.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              No steps configured in this workflow
            </p>
          </div>
        )}
      </div>
    </div>
  )
})