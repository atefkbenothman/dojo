"use server"

import { DemoVideo } from "@/components/demo-video"

export default async function Home() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <p className="text-primary p-2 text-base font-medium max-w-2xl">
        Built on top of Vercel&apos;s AI SDK, <strong>Dojo</strong> aims to help both developers and non-developers
        easily configure and chain-together ai agents to solve complex tasks.
        <br />
        <br />
        At it&apos;s core, <strong>Dojo</strong> is an MCP client that allows users to chat and interact with MCP
        servers/tools which can take action on the behalf of the user.
        <br />
        <br />
        Users can build and configure their own agents and define their behaviors, and then chain agents together to
        solve more involved, complex tasks
      </p>
      <DemoVideo />
    </div>
  )
}
