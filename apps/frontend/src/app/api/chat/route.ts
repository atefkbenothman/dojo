import { env } from "@dojo/env/frontend"
import { asyncTryCatch } from "@dojo/utils"
import type { CoreMessage } from "ai"
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

/* Chat */
async function handleChat(
  authorization: string | null,
  guestSessionId: string | null,
  messages: CoreMessage[],
  chat: { modelId: string },
) {
  if (!messages || !chat.modelId) {
    return NextResponse.json({ error: "Missing 'messages' or 'modelId' for CHAT interaction." }, { status: 400 })
  }

  const { data, error } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(guestSessionId ? { "X-Guest-Session-ID": guestSessionId } : {}),
      },
      body: JSON.stringify({ messages, chat }),
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

  console.log(`[API /chat] Successfully initiated CHAT stream via CHAT service`)

  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: buildProxyHeaders(data.headers),
  })
}

/* Agent */
async function handleAgent(
  authorization: string | null,
  guestSessionId: string | null,
  messages: CoreMessage[],
  agent: { modelId: string; agentId: string },
) {
  if (!messages || !agent.modelId) {
    return NextResponse.json({ error: "Missing 'messages' or 'modelId' for AGENT interaction." }, { status: 400 })
  }

  const { data, error } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/api/agent/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(guestSessionId ? { "X-Guest-Session-ID": guestSessionId } : {}),
      },
      body: JSON.stringify({
        messages,
        agent: agent,
      }),
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

  console.log(`[API /chat] Successfully initiated AGENT stream via AGENT service`)

  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: buildProxyHeaders(data.headers),
  })
}

/* Workflow */
const handleWorkflow = async (
  authorization: string | null,
  guestSessionId: string | null,
  messages: CoreMessage[],
  workflow: { modelId: string; workflowId: string },
) => {
  console.log(`[API /chat] Received workflow: ${workflow}`)

  if (!messages || !workflow.modelId) {
    return NextResponse.json({ error: "Missing 'messages' or 'modelId' for WORKFLOW interaction." }, { status: 400 })
  }

  const { data, error } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/api/workflow/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(guestSessionId ? { "X-Guest-Session-ID": guestSessionId } : {}),
      },
      body: JSON.stringify({
        messages,
        workflow: workflow,
      }),
    }),
  )

  if (!data?.body || error) {
    console.error(`[API Router /chat] WORKFLOW service backend responded with error: ${error}`)
    return NextResponse.json({ error: `WORKFLOW service backend failed: ${error}` }, { status: 503 })
  }

  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: buildProxyHeaders(data.headers),
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { messages, interactionType } = body
  const authorization = request.headers.get("Authorization")
  const guestSessionId = request.headers.get("X-Guest-Session-ID")

  if (!authorization && !guestSessionId) {
    console.log("[API /chat] No authorization or session header. Request may fail if backend requires session.")
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

  console.log(`[API /chat] Received interactionType: ${interactionType}`)

  switch (interactionType) {
    case "chat": {
      const { chat } = body
      if (!chat) {
        return NextResponse.json({ error: "Missing 'chat' object in request body." }, { status: 400 })
      }
      return await handleChat(authorization, guestSessionId, messages, chat)
    }
    case "agent": {
      const { agent } = body
      if (!agent) {
        return NextResponse.json({ error: "Missing 'agent' object in request body." }, { status: 400 })
      }
      return await handleAgent(authorization, guestSessionId, messages, agent)
    }
    case "workflow": {
      const { workflow } = body
      if (!workflow) {
        return NextResponse.json({ error: "Missing 'workflow' object in request body." }, { status: 400 })
      }
      return await handleWorkflow(authorization, guestSessionId, messages, workflow)
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
