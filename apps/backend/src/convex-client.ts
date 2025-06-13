import { env } from "@dojo/env/backend"
import { ConvexHttpClient } from "convex/browser"

if (!env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set")
}

export const convex = new ConvexHttpClient(env.CONVEX_URL)
