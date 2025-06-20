"use client"

import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { CheckCircle, XCircle, Loader2, Circle } from "lucide-react"
import { memo } from "react"

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

interface ExecutionTimelineProps {
  execution: WorkflowExecution
  agents: Agent[]
  workflowSteps: string[] // Array of agent IDs
}

export const ExecutionTimeline = memo(function ExecutionTimeline({
  execution,
  agents,
  workflowSteps,
}: ExecutionTimelineProps) {
  const getAgent = (agentId: string) => agents.find(agent => agent._id === agentId)
  
  const formatDuration = (startedAt: number, completedAt?: number) => {
    const end = completedAt || Date.now()
    const duration = Math.round((end - startedAt) / 1000)
    
    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }
  
  const getStepStatus = (stepIndex: number) => {
    if (!execution.stepExecutions) {
      // If no step executions yet, determine status based on current step
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
  
  const getStepDuration = (stepIndex: number) => {
    if (!execution.stepExecutions) return null
    
    const stepExecution = execution.stepExecutions.find(se => se.stepIndex === stepIndex)
    if (!stepExecution?.startedAt) return null
    
    const endTime = stepExecution.completedAt || Date.now()
    const duration = Math.round((endTime - stepExecution.startedAt) / 1000)
    
    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }
  
  const getStepError = (stepIndex: number) => {
    if (!execution.stepExecutions) return null
    const stepExecution = execution.stepExecutions.find(se => se.stepIndex === stepIndex)
    return stepExecution?.error || null
  }
  
  const getStatusIcon = (status: string, isCurrentStep: boolean) => {
    const iconClass = "h-4 w-4"
    
    switch (status) {
      case "completed":
        return <CheckCircle className={cn(iconClass, "text-green-500")} />
      case "failed":
        return <XCircle className={cn(iconClass, "text-red-500")} />
      case "running":
        return <Loader2 className={cn(iconClass, "text-blue-500 animate-spin")} />
      case "pending":
        return (
          <Circle 
            className={cn(
              iconClass, 
              isCurrentStep ? "text-blue-500 animate-pulse" : "text-gray-400"
            )} 
          />
        )
      default:
        return <Circle className={cn(iconClass, "text-gray-400")} />
    }
  }
  
  const getOverallStatus = () => {
    switch (execution.status) {
      case "preparing":
        return { text: "Preparing workflow...", color: "text-yellow-600" }
      case "running":
        const current = (execution.currentStep ?? 0) + 1
        return { 
          text: `Running step ${current} of ${execution.totalSteps}`, 
          color: "text-blue-600" 
        }
      case "completed":
        const totalDuration = execution.completedAt 
          ? Math.round((execution.completedAt - execution.startedAt) / 1000)
          : 0
        const formatDuration = (seconds: number) => {
          if (seconds < 60) return `${seconds}s`
          const minutes = Math.floor(seconds / 60)
          const remainingSeconds = seconds % 60
          return `${minutes}m ${remainingSeconds}s`
        }
        return { 
          text: `Completed in ${formatDuration(totalDuration)}`, 
          color: "text-green-600" 
        }
      case "failed":
        return { 
          text: execution.error ? `Failed: ${execution.error}` : "Execution failed", 
          color: "text-red-600" 
        }
      case "cancelled":
        return { text: "Cancelled", color: "text-gray-600" }
      default:
        return { text: "Unknown status", color: "text-gray-600" }
    }
  }
  
  const overallStatus = getOverallStatus()
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Execution Progress</h3>
          <div className={cn("text-sm font-medium", overallStatus.color)}>
            {overallStatus.text}
          </div>
        </div>
        
        {/* Performance metrics */}
        <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground">Total Steps</span>
            <div className="font-medium">{execution.totalSteps}</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Completed</span>
            <div className="font-medium">
              {execution.stepExecutions?.filter(se => se.status === "completed").length || 0}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Elapsed Time</span>
            <div className="font-medium">
              {formatDuration(
                execution.startedAt, 
                execution.completedAt || (execution.status === "running" ? Date.now() : execution.startedAt)
              )}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Avg Step Time</span>
            <div className="font-medium">
              {(() => {
                const completedSteps = execution.stepExecutions?.filter(se => 
                  se.status === "completed" && se.startedAt && se.completedAt
                ) || []
                
                if (completedSteps.length === 0) return "—"
                
                const totalStepTime = completedSteps.reduce((sum, step) => 
                  sum + (step.completedAt! - step.startedAt!), 0
                )
                const avgTime = Math.round(totalStepTime / completedSteps.length / 1000)
                
                return avgTime < 60 ? `${avgTime}s` : `${Math.floor(avgTime / 60)}m ${avgTime % 60}s`
              })()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {workflowSteps.map((agentId, stepIndex) => {
            const agent = getAgent(agentId)
            const stepStatus = getStepStatus(stepIndex)
            const duration = getStepDuration(stepIndex)
            const error = getStepError(stepIndex)
            const isCurrentStep = execution.currentStep === stepIndex
            
            if (!agent) return null
            
            return (
              <div key={`${stepIndex}-${agentId}`} className="flex gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background">
                    {getStatusIcon(stepStatus, isCurrentStep)}
                  </div>
                  {stepIndex < workflowSteps.length - 1 && (
                    <div 
                      className={cn(
                        "w-0.5 h-12 mt-2",
                        stepStatus === "completed" ? "bg-green-300" : "bg-gray-200"
                      )} 
                    />
                  )}
                </div>
                
                {/* Step content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Step {stepIndex + 1}: {agent.name}
                      </span>
                      {isCurrentStep && stepStatus === "running" && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          Currently Running
                        </span>
                      )}
                    </div>
                    {duration && (
                      <span className="text-xs text-muted-foreground">
                        {duration}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {agent.systemPrompt.length > 150 
                      ? `${agent.systemPrompt.slice(0, 150)}...` 
                      : agent.systemPrompt}
                  </p>
                  
                  {error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                      Error: {error}
                    </div>
                  )}
                  
                  {stepStatus === "completed" && !error && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded border">
                      Completed successfully
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})