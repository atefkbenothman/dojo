import { createClientFromAuth } from "./convex-request-client"
import { logger } from "./logger"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"

export async function getConvexUser(authorization: string | undefined): Promise<Doc<"users"> | null> {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  // Create a new client instance for this request with auth
  const client = createClientFromAuth(authorization)

  const user = await client.query(api.user.currentUser)

  if (!user) {
    logger.error("Auth", "Error fetching user from Convex. Token might be invalid or expired")
    return null
  }

  return user
}
