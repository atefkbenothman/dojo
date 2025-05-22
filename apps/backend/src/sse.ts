import { FileBatchChangeEvent } from "./types.js"
import { Response } from "express"

const sseClients = new Set<Response>()

export function addSseClient(res: Response): void {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  res.flushHeaders()

  sseClients.add(res)
  console.log(`[SSE] Client connected. Total clients: ${sseClients.size}`)
}

export function removeSseClient(res: Response): void {
  sseClients.delete(res)
  console.log(`[SSE] Client disconnected. Total clients: ${sseClients.size}`)
}

export function broadcastSseEvent(eventData: FileBatchChangeEvent): void {
  if (sseClients.size === 0) {
    return
  }

  const formattedData = JSON.stringify(eventData)
  const message = `data: ${formattedData}\n\n`

  console.log(`[SSE] Broadcasting event to ${sseClients.size} clients:`, formattedData)

  const clientsToRemove = new Set<Response>()

  sseClients.forEach((client) => {
    try {
      client.write(message)
    } catch (error) {
      console.error("[SSE] Error writing to client, marking for removal:", error)
      clientsToRemove.add(client)
    }
  })

  clientsToRemove.forEach((client) => removeSseClient(client))
}
