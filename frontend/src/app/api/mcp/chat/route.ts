import { NextResponse } from "next/server"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { messages, sessionId, modelId, config, interactionType } = await request.json()

  if (!interactionType) {
    console.error("[API Router /mcp/chat] Missing 'interactionType' in request body")
    return NextResponse.json(
      {
        error: "Missing 'interactionType' in request body. Cannot route request.",
      },
      { status: 400 },
    )
  }

  console.log(`[API Router /mcp/chat] Received interactionType: ${interactionType}, Session: ${sessionId}`)

  switch (interactionType) {
    case "chat":
      if (!messages || !modelId) {
        console.error(
          "[API Router /mcp/chat] Missing 'messages' or 'modelId' for CHAT interaction. SessionId check implicit.",
        )
        return NextResponse.json(
          {
            error: "Missing 'messages' or 'modelId' for CHAT interaction.",
          },
          { status: 400 },
        )
      }

      console.log(
        `[API Router /mcp/chat] Routing to CHAT service. Model: ${modelId}, Messages Count: ${messages.length}`,
      )

      const { data: chatData, error: chatError } = await asyncTryCatch(
        fetch(`${MCP_SERVICE_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, sessionId, modelId }),
        }),
      )

      if (!chatData?.body || chatError) {
        console.error(`[API Router /mcp/chat] CHAT service backend responded with error: ${chatError}`)
        return NextResponse.json(
          {
            error: `CHAT service backend failed: ${chatError}`,
          },
          { status: 503 },
        )
      }

      console.log(`[API Router /mcp/chat] Successfully initiated CHAT stream via CHAT service for session ${sessionId}`)

      return new Response(chatData.body, {
        status: chatData.status,
        statusText: chatData.statusText,
        headers: {
          "Content-Type": chatData.headers.get("Content-Type") || "text/plain; charset=utf-8",
          "Transfer-Encoding": chatData.headers.get("Transfer-Encoding") || "chunked",
        },
      })
    case "agent":
      if (!messages || !config) {
        console.error(
          "[API Router /mcp/chat] Missing 'messages' or 'config' for AGENT interaction. SessionId check implicit.",
        )
        return NextResponse.json(
          {
            error: "Missing 'messages' or 'config' for AGENT interaction.",
          },
          { status: 400 },
        )
      }

      console.log(
        `[API Router /mcp/chat] Routing to AGENT service. Agent: '${config.name}', Messages Count: ${messages.length}`,
      )

      const { data: agentData, error: agentError } = await asyncTryCatch(
        fetch(`${MCP_SERVICE_URL}/agent/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, sessionId, config }),
        }),
      )

      if (!agentData?.body || agentError) {
        console.error(
          `[API Router /mcp/chat] AGENT service backend responded with error for agent '${config.id}':`,
          agentError || "Response body missing",
        )
        return NextResponse.json(
          {
            error: `AGENT service backend failed: ${agentError || "Response body missing"}`,
          },
          { status: 503 },
        )
      }

      console.log(
        `[API Router /mcp/chat] Successfully initiated AGENT stream via AGENT service for session ${sessionId}, agent '${config.id}'`,
      )

      return new Response(agentData.body, {
        status: agentData.status,
        statusText: agentData.statusText,
        headers: {
          "Content-Type": agentData.headers.get("Content-Type") || "text/plain; charset=utf-8",
          "Transfer-Encoding": agentData.headers.get("Transfer-Encoding") || "chunked",
        },
      })
    default:
      console.error(`[API Router /mcp/chat] Unknown 'interactionType': ${interactionType}`)
      return NextResponse.json(
        {
          error: `Unknown 'interactionType': ${interactionType}. Cannot route request.`,
        },
        { status: 400 },
      )
  }
}
