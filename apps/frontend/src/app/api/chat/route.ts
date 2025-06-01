import { env } from "@/env"
import { type ChatInteraction, type AgentInteraction } from "@dojo/config"
import { asyncTryCatch } from "@dojo/utils"
import type { CoreMessage } from "ai"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

function buildProxyHeaders(headers: Headers) {
  const result = new Headers()
  result.set("Content-Type", headers.get("Content-Type") || "text/plain; charset=utf-8")
  if (headers.get("Transfer-Encoding")) {
    result.set("Transfer-Encoding", headers.get("Transfer-Encoding")!)
  }
  if (headers.get("x-vercel-ai-data-stream")) {
    result.set("x-vercel-ai-data-stream", headers.get("x-vercel-ai-data-stream")!)
  }
  return result
}

async function handleChat(userId: string, apiKey: string | undefined, messages: CoreMessage[], chat: ChatInteraction) {
  if (!messages || !chat.modelId) {
    return NextResponse.json({ error: "Missing 'messages' or 'modelId' for CHAT interaction." }, { status: 400 })
  }

  const { data, error } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/trpc/chat.sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "X-User-Id": userId } : {}),
      },
      body: JSON.stringify({ messages, modelId: chat.modelId, apiKey: apiKey || undefined }),
    }),
  )

  if (!data?.body || error) {
    console.error(`[API Router /chat] CHAT service backend responded with error: ${error}`)
    return NextResponse.json(
      {
        error: `CHAT service backend failed: ${error}`,
      },
      { status: 503 },
    )
  }

  console.log(`[API /chat] Successfully initiated CHAT stream via CHAT service for user ${userId}`)

  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: buildProxyHeaders(data.headers),
  })
}

async function handleAgent(userId: string, apiKey: string, messages: CoreMessage[], agent: AgentInteraction) {
  if (!messages || !agent.agentConfig.aiModelId) {
    return NextResponse.json({ error: "Missing 'messages' or 'modelId' for AGENT interaction." }, { status: 400 })
  }

  if (!apiKey) {
    console.error("[API /chat] API key is required for AGENT interaction.")
    return NextResponse.json({ error: "API key is required for AGENT interaction." }, { status: 400 })
  }

  const { data, error } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/trpc/agent.run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "X-User-Id": userId } : {}),
      },
      body: JSON.stringify({ messages, apiKey, config: agent.agentConfig }),
    }),
  )

  if (!data?.body || error) {
    console.error(`[API Router /chat] AGENT service backend responded with error: ${error}`)
    return NextResponse.json(
      {
        error: `AGENT service backend failed: ${error}`,
      },
      { status: 503 },
    )
  }

  console.log(`[API /chat] Successfully initiated AGENT stream via AGENT service for user ${userId}`)

  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: buildProxyHeaders(data.headers),
  })
}

export async function POST(request: Request) {
  const body = await request.json()

  const { messages, interactionType, apiKey } = body

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
      const { chat } = body
      if (!chat) {
        return NextResponse.json({ error: "Missing 'chat' object in request body." }, { status: 400 })
      }
      return await handleChat(userId, apiKey, messages, chat)
    }
    case "agent": {
      const { agent } = body
      if (!agent) {
        return NextResponse.json({ error: "Missing 'agent' object in request body." }, { status: 400 })
      }
      return await handleAgent(userId, apiKey, messages, agent)
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
