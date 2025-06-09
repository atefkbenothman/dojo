import { getConvexUser } from "../auth.js"
import { getOrCreateUserSession } from "../session.js"
import type { UserSession } from "../types.js"
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express"

export const createTRPCContext = async ({ req, res }: CreateExpressContextOptions) => {
  const authorization = req.headers.authorization
  const user = await getConvexUser(authorization)

  let userSession: UserSession | undefined = undefined
  if (user?._id) {
    userSession = getOrCreateUserSession(user._id)
    console.log(`[TRPC Context] User session created/retrieved for userId: ${user._id} from token.`)
  }

  return {
    req,
    res,
    userSession,
  }
}

export type Context = {
  req: CreateExpressContextOptions["req"]
  res: CreateExpressContextOptions["res"]
  userSession?: UserSession
}
