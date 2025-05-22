import { getModelInstance } from "../ai/get-model.js"
import { DEFAULT_IMAGE_MODEL_ID } from "../config.js"
import { userContextMiddleware } from "../middleware/user-context.js"
import type { GenerateImageOptions, RequestWithUserContext } from "../types.js"
import { experimental_generateImage as generateImage, type ImageModel } from "ai"
import { Router, Request, Response } from "express"

const router = Router()

router.post("/image", userContextMiddleware, async (expressReq: Request, res: Response): Promise<void> => {
  const req = expressReq as RequestWithUserContext

  const userSession: RequestWithUserContext["userSession"] = req.userSession
  const { prompt, modelId, n, apiKey } = req.body as { prompt?: string; modelId?: string; n?: number; apiKey?: string }

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    res.status(400).json({ error: "Missing or invalid prompt" })
    return
  }
  if (!apiKey || typeof apiKey !== "string") {
    res.status(400).json({ error: "Missing or invalid API key" })
    return
  }

  const selectedModelId: string = modelId || DEFAULT_IMAGE_MODEL_ID
  let imageModel: ImageModel
  try {
    imageModel = getModelInstance(selectedModelId, apiKey) as ImageModel
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
    return
  }

  console.log(`[Core /image] request received for user: ${userSession.userId}, using model: ${selectedModelId}`)

  try {
    const options: GenerateImageOptions = { n }

    const { images }: { images: { base64: string }[] } = await generateImage({
      model: imageModel,
      prompt: prompt,
      n: options.n,
    })

    const resultImages = images.map((img: { base64: string }) => ({ base64: img.base64 }))
    res.status(200).json({ images: resultImages })
  } catch (error) {
    console.error(`[Core /image] Error generating image for user ${userSession.userId}:`, error)
    res.status(500).json({ error: "Failed to generate image" })
  }
})

export default router
