import { AVAILABLE_IMAGE_MODELS, DEFAULT_IMAGE_MODEL_ID } from "@/config"
import { userContextMiddleware } from "@/middleware/user-context"
import type { GenerateImageOptions, RequestWithUserContext } from "@/types"
import { experimental_generateImage as generateImage } from "ai"
import { Router, Request, Response } from "express"

const router = Router()

router.post("/image", userContextMiddleware, async (expressReq: Request, res: Response): Promise<void> => {
  const req = expressReq as RequestWithUserContext

  const { userSession, body } = req
  const { prompt, modelId, n } = body

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    res.status(400).json({ error: "Missing or invalid prompt" })
    return
  }

  const selectedModelId = modelId || DEFAULT_IMAGE_MODEL_ID
  const aiModelEntry = AVAILABLE_IMAGE_MODELS[selectedModelId]

  if (!aiModelEntry || !aiModelEntry.imageModel) {
    console.error(
      `[Core /image] Image Model '${selectedModelId}' not found or not configured for user '${userSession.userId}'`,
    )
    res.status(500).json({ error: `Image Model '${selectedModelId}' not configured on backend` })
    return
  }

  console.log(`[Core /image] request received for user: ${userSession.userId}, using model: ${aiModelEntry.modelName}`)

  try {
    const options: GenerateImageOptions = { n }

    const { images } = await generateImage({
      model: aiModelEntry.imageModel,
      prompt: prompt,
      n: options.n,
    })

    const resultImages = images.map((img) => ({ base64: img.base64 }))
    res.status(200).json({ images: resultImages })
  } catch (error) {
    console.error(`[Core /image] Error generating image for user ${userSession.userId}:`, error)
    res.status(500).json({ error: "Failed to generate image" })
  }
})

export default router
