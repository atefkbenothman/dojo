import { getOrCreateUserSession } from "@/core"
import { RequestWithUserContext } from "@/types"
import { Request, Response, NextFunction } from "express"

export function userContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expressReq = req as RequestWithUserContext

  const { userId } = expressReq.body

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ success: false, message: "Missing or invalid userId" })
    return
  }

  expressReq.userId = userId

  expressReq.userSession = getOrCreateUserSession(userId)

  next()
}
