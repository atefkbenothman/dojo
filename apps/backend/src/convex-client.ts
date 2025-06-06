import { ConvexHttpClient } from "convex/browser"
import "dotenv/config"

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set")
}

export const convex = new ConvexHttpClient(process.env.CONVEX_URL)
