// import { getModelInstance } from "../../../services/ai/models"
import { logger } from "../../../lib/logger"
import type { Context } from "../context"
import { protectedProcedure, router } from "../trpc"
import { TRPCError } from "@trpc/server"
// import { experimental_generateImage as generateImage, type ImageModel } from "ai"
import { z } from "zod"

// interface SDKImageObject {
//   base64?: string
//   url?: string
// }

export const imageGenerationInputSchema = z.object({
  prompt: z.string().min(1, { message: "Prompt cannot be empty." }),
  modelId: z.string().min(1, { message: "Model ID cannot be empty." }),
  n: z.number().int().min(1).max(4).optional(),
  size: z
    .custom<`${number}x${number}`>((val) => {
      return typeof val === "string" && /^\d+x\d+$/.test(val)
    })
    .optional()
    .describe('The size of the generated images. E.g. "1024x1024".'),
  quality: z.string().optional().describe("The quality of the image that will be generated."),
  style: z.string().optional().describe("The style of the generated images."),
})

export const imageRouter = router({
  generate: protectedProcedure
    .input(imageGenerationInputSchema)
    .mutation(({ input, ctx }: { input: z.infer<typeof imageGenerationInputSchema>; ctx: Context }) => {
      // const { prompt, modelId, n, size, quality, style } = input
      const { modelId } = input
      const { session } = ctx

      if (!session?.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated." })
      }

      logger.info("TRPC /image.generate", `Request received for user: ${session.userId}, using model: ${modelId}`)

      // let imageModel: ImageModel
      try {
        // imageModel = getModelInstance(modelId) as ImageModel
      } catch (err) {
        logger.error("TRPC /image.generate", `Error getting model instance for user ${session.userId}`, err)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to get model instance.",
        })
      }

      // try {
      //   const options: {
      //     n?: number
      //     size?: `${number}x${number}`
      //     quality?: string
      //     style?: string
      //   } = {}
      //   if (n) options.n = n
      //   if (size) options.size = size
      //   if (quality) options.quality = quality
      //   if (style) options.style = style

      //   const { images } = await generateImage({
      //     model: imageModel,
      //     prompt: prompt,
      //     ...options,
      //   })

      //   const resultImages = images.map((img: SDKImageObject) => {
      //     if (img.base64 && typeof img.base64 === "string") {
      //       return { base64: img.base64 }
      //     } else if (img.url && typeof img.url === "string") {
      //       return { url: img.url }
      //     }
      //     console.error("[TRPC /image.generate] Unexpected image format from AI SDK:", img)
      //     return { error: "Unexpected image format from AI SDK." }
      //   })

      //   return { images: resultImages }
      // } catch (error) {
      //   console.error(`[TRPC /image.generate] Error generating image for user ${session.userId}:`, error)
      //   throw new TRPCError({
      //     code: "INTERNAL_SERVER_ERROR",
      //     message: "Failed to generate image.",
      //     cause: error instanceof Error ? error : undefined,
      //   })
      // }
    }),
})

export type ImageRouter = typeof imageRouter
