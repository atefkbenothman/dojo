import { env } from "@/env"
import type { AgentConfig } from "@dojo/config"
import { asyncTryCatch } from "@dojo/utils"
import type { CoreMessage } from "ai"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

interface HandleChatInteractionArgs {
  messages: CoreMessage[]
  modelId: string
  apiKey?: string
  userId: string
}

interface HandleAgentInteractionArgs {
  messages: CoreMessage[]
  config: AgentConfig
  apiKey?: string
  userId: string
}

function buildProxyHeaders(headers: Headers) {
  const result = new Headers()
  result.set("Content-Type", headers.get("Content-Type") || "text/plain; charset=utf-8")
  if (headers.get("Transfer-Encoding")) result.set("Transfer-Encoding", headers.get("Transfer-Encoding")!)
  if (headers.get("x-vercel-ai-data-stream"))
    result.set("x-vercel-ai-data-stream", headers.get("x-vercel-ai-data-stream")!)
  return result
}

async function handleChatInteraction({ messages, modelId, apiKey, userId }: HandleChatInteractionArgs) {
  if (!messages || !modelId) {
    return NextResponse.json({ error: "Missing 'messages' or 'modelId' for CHAT interaction." }, { status: 400 })
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (userId) {
    headers["X-User-Id"] = userId
  }

  const chatBody: Record<string, string | CoreMessage[]> = { messages, modelId }

  // only send api key if it is provided
  if (apiKey) {
    chatBody.apiKey = apiKey
  }

  const { data: chatData, error: chatError } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/trpc/chat.sendMessage`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(chatBody),
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

  console.log(`[API /chat] Successfully initiated CHAT stream via CHAT service for user ${userId}`)

  return new Response(chatData.body, {
    status: chatData.status,
    statusText: chatData.statusText,
    headers: buildProxyHeaders(chatData.headers),
  })
}

async function handleAgentInteraction({ messages, config, apiKey, userId }: HandleAgentInteractionArgs) {
  if (!messages || !config) {
    return NextResponse.json({ error: "Missing 'messages' or 'config' for AGENT interaction." }, { status: 400 })
  }

  const { data: agentData, error: agentError } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, userId, config, apiKey }),
    }),
  )

  if (!agentData?.body || agentError) {
    console.error(
      `[API /chat] AGENT service backend responded with error for agent '${config.id}':`,
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
    `[API /chat] Successfully initiated AGENT stream via AGENT service for user ${userId}, agent '${config.id}'`,
  )

  return new Response(agentData.body, {
    status: agentData.status,
    statusText: agentData.statusText,
    headers: buildProxyHeaders(agentData.headers),
  })
}

export async function POST(request: Request) {
  const { messages, modelId, config, interactionType, apiKey } = await request.json()

  const cookieStore = await cookies()
  const userId = cookieStore.get("userId")?.value

  if (!userId) {
    console.error("[API /chat] Missing userId cookie. Rejecting request.")
    return NextResponse.json(
      { error: "Missing userId cookie. Please refresh the page or enable cookies." },
      { status: 401 },
    )
  }

  if (!interactionType) {
    console.error("[API /chat] Missing 'interactionType' in request body")
    return NextResponse.json(
      {
        error: "Missing 'interactionType' in request body. Cannot route request.",
      },
      { status: 400 },
    )
  }

  console.log(`[API /chat] Received interactionType: ${interactionType}, User: ${userId}`)

  switch (interactionType) {
    case "chat": {
      return await handleChatInteraction({ messages, modelId, apiKey, userId })
    }
    case "agent": {
      return await handleAgentInteraction({ messages, config, apiKey, userId })
    }
    default:
      console.error(`[API /chat] Unknown 'interactionType': ${interactionType}`)
      return NextResponse.json(
        {
          error: `Unknown 'interactionType': ${interactionType}. Cannot route request.`,
        },
        { status: 400 },
      )
  }
}
