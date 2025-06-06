import { getOrCreateUserSession } from "../session.js"
import type { UserSession, RequestWithUserContext } from "../types.js"
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express"

export const createTRPCContext = ({ req, res }: CreateExpressContextOptions) => {
  const expressReq = req as RequestWithUserContext
  const userId = expressReq.headers["x-user-id"] as string | undefined

  let userSession: UserSession | undefined = undefined
  if (userId && typeof userId === "string" && userId.trim() !== "") {
    userSession = getOrCreateUserSession(userId)
    console.log(`[TRPC Context] User session created/retrieved for userId: ${userId} from header.`)
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
