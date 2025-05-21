import { asyncTryCatch } from "@dojo/utils"
import { NextResponse } from "next/server"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { messages, userId, modelId, config, interactionType, apiKey } = await request.json()

  if (!interactionType) {
    console.error("[API Router /chat] Missing 'interactionType' in request body")
    return NextResponse.json(
      {
        error: "Missing 'interactionType' in request body. Cannot route request.",
      },
      { status: 400 },
    )
  }

  console.log(`[API Router /chat] Received interactionType: ${interactionType}, User: ${userId}`)

  switch (interactionType) {
    case "chat": {
      if (!messages || !modelId) {
        console.error("[API Router /chat] Missing 'messages' or 'modelId' for CHAT interaction. UserId check implicit.")
        return NextResponse.json(
          {
            error: "Missing 'messages' or 'modelId' for CHAT interaction.",
          },
          { status: 400 },
        )
      }

      console.log(`[API Router /chat] Routing to CHAT service. Model: ${modelId}, Messages Count: ${messages.length}`)

      const { data: chatData, error: chatError } = await asyncTryCatch(
        fetch(`${MCP_SERVICE_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, userId, modelId, apiKey }),
        }),
      )

      if (!chatData?.body || chatError) {
        console.error(`[API Router /chat] CHAT service backend responded with error: ${chatError}`)
        return NextResponse.json(
          {
            error: `CHAT service backend failed: ${chatError}`,
          },
          { status: 503 },
        )
      }

      console.log(`[API Router /chat] Successfully initiated CHAT stream via CHAT service for user ${userId}`)

      const chatResponseHeaders = new Headers()
      chatResponseHeaders.set("Content-Type", chatData.headers.get("Content-Type") || "text/plain; charset=utf-8")
      if (chatData.headers.get("Transfer-Encoding")) {
        chatResponseHeaders.set("Transfer-Encoding", chatData.headers.get("Transfer-Encoding")!)
      }
      if (chatData.headers.get("x-vercel-ai-data-stream")) {
        chatResponseHeaders.set("x-vercel-ai-data-stream", chatData.headers.get("x-vercel-ai-data-stream")!)
      }

      return new Response(chatData.body, {
        status: chatData.status,
        statusText: chatData.statusText,
        headers: chatResponseHeaders,
      })
    }
    case "agent": {
      if (!messages || !config) {
        console.error("[API Router /chat] Missing 'messages' or 'config' for AGENT interaction. UserId check implicit.")
        return NextResponse.json(
          {
            error: "Missing 'messages' or 'config' for AGENT interaction.",
          },
          { status: 400 },
        )
      }

      console.log(
        `[API Router /chat] Routing to AGENT service. Agent: '${config.name}', Messages Count: ${messages.length}`,
      )

      const { data: agentData, error: agentError } = await asyncTryCatch(
        fetch(`${MCP_SERVICE_URL}/agent/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, userId, config, apiKey }),
        }),
      )

      if (!agentData?.body || agentError) {
        console.error(
          `[API Router /chat] AGENT service backend responded with error for agent '${config.id}':`,
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
        `[API Router /chat] Successfully initiated AGENT stream via AGENT service for user ${userId}, agent '${config.id}'`,
      )

      const agentResponseHeaders = new Headers()
      agentResponseHeaders.set("Content-Type", agentData.headers.get("Content-Type") || "text/plain; charset=utf-8")
      if (agentData.headers.get("Transfer-Encoding")) {
        agentResponseHeaders.set("Transfer-Encoding", agentData.headers.get("Transfer-Encoding")!)
      }
      if (agentData.headers.get("x-vercel-ai-data-stream")) {
        agentResponseHeaders.set("x-vercel-ai-data-stream", agentData.headers.get("x-vercel-ai-data-stream")!)
      }

      return new Response(agentData.body, {
        status: agentData.status,
        statusText: agentData.statusText,
        headers: agentResponseHeaders,
      })
    }
    default:
      console.error(`[API Router /chat] Unknown 'interactionType': ${interactionType}`)
      return NextResponse.json(
        {
          error: `Unknown 'interactionType': ${interactionType}. Cannot route request.`,
        },
        { status: 400 },
      )
  }
}
