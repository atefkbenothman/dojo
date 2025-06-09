import { convex } from "./convex-client.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import { Doc } from "@dojo/db/convex/_generated/dataModel.js"

export async function getConvexUser(authorization: string | undefined): Promise<Doc<"users"> | null> {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }
  const token = authorization.substring(7)

  // Set the auth token for the Convex client
  convex.setAuth(token)

  const user = await convex.query(api.user.currentUser)

  if (!user) {
    console.error("[Auth] Error fetching user from Convex. Token might be invalid or expired.")
    return null
  }

  return user
}
