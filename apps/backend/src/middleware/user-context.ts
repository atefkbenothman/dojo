import { getOrCreateUserSession } from "../core.js"
import { RequestWithUserContext } from "../types.js"
import { Request, Response, NextFunction } from "express"

interface UserContextBody {
  userId?: string
}

export function userContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expressReq = req as RequestWithUserContext

  const { userId } = expressReq.body as UserContextBody

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ success: false, message: "Missing or invalid userId" })
    return
  }

  expressReq.userId = userId

  expressReq.userSession = getOrCreateUserSession(userId)

  next()
}
