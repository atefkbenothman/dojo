import { Router, Request, Response } from "express"
import { experimental_generateImage as generateImage } from "ai"
import { AVAILABLE_IMAGE_MODELS, DEFAULT_IMAGE_MODEL_ID } from "../config"
import type { GenerateImageOptions } from "../types"

const router = Router()

router.post("/image", async (req: Request, res: Response): Promise<void> => {
  const { prompt, modelId, n } = req.body

  const aiModel = AVAILABLE_IMAGE_MODELS[modelId] ?? AVAILABLE_IMAGE_MODELS[DEFAULT_IMAGE_MODEL_ID]
  console.log(`[Core /image] request received using model: ${aiModel.modelName}`)

  try {
    const options: GenerateImageOptions = { n }

    const { images } = await generateImage({
      model: aiModel.imageModel,
      prompt: prompt,
      n: options.n,
    })

    const resultImages = images.map((img) => ({ base64: img.base64 }))
    res.status(200).json({ images: resultImages })
  } catch (error) {
    console.error(`[Core /image]: Error generating image:`, error)
    res.status(500).json({ error: "Failed to generate image" })
  }
})

export default router
