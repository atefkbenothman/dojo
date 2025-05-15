import { Router, Request, Response } from "express"
import fs from "fs"
import path from "path"
import { addSseClient, removeSseClient } from "@/sse"
import { WATCH_DIRECTORY_PATH } from "@/config"

const router = Router()

/* Subscribe to get file event updates */
router.get("/file-events", (req: Request, res: Response) => {
  addSseClient(res)
  req.on("close", () => {
    removeSseClient(res)
  })
})

/* Endpoint to get content of a specific file from the watched directory */
router.get("/file-content", async (req: Request, res: Response): Promise<void> => {
  const relativePath = req.query.path as string
  const watchDirectory = WATCH_DIRECTORY_PATH

  if (!watchDirectory) {
    console.error("[Files] Watch directory path is not configured")
    res.status(500).json({ error: "Server configuration error: Watch directory not set" })
    return
  }

  if (!relativePath) {
    res.status(400).json({ error: "Missing 'path' query parameter" })
    return
  }

  try {
    const requestedAbsolutePath = path.join(watchDirectory, relativePath)

    if (!fs.existsSync(requestedAbsolutePath) || !fs.statSync(requestedAbsolutePath).isFile()) {
      res.status(404).json({ error: `File not found or is not a file: ${relativePath}` })
      return
    }

    console.log(`[Files] Reading file: ${requestedAbsolutePath}`)
    const fileContent = await fs.promises.readFile(requestedAbsolutePath, "utf-8")

    const ext = path.extname(relativePath).toLowerCase()
    let contentType = "text/plain; charset=utf-8"

    switch (ext) {
      case ".json":
        contentType = "application/json; charset=utf-8"
        break
      case ".html":
        contentType = "text/html; charset=utf-8"
        break
      case ".css":
        contentType = "text/css; charset=utf-8"
        break
      case ".js":
      case ".mjs":
        contentType = "application/javascript; charset=utf-8"
        break
    }

    res.setHeader("Content-Type", contentType)
    res.status(200).send(fileContent)
  } catch (error) {
    console.error(`[Files] Error reading file '${relativePath}':`, error)
    res.status(500).json({ error: `Failed to read file: ${relativePath}` })
  }
})

/* Endpoint to list all files in the watched directory */
router.get("/list-files", (req: Request, res: Response) => {
  const watchDirectory = WATCH_DIRECTORY_PATH

  if (!watchDirectory) {
    console.error("[Files] Watch directory path is not configured")
    res.status(500).json({ error: "Server configuration error: Watch directory not set" })
    return
  }

  function walkDir(dir: string, base: string = ""): string[] {
    let results: string[] = []
    const list = fs.readdirSync(dir)
    for (const file of list) {
      const filePath = path.join(dir, file)
      const relPath = path.join(base, file)
      const stat = fs.statSync(filePath)
      if (stat && stat.isDirectory()) {
        results = results.concat(walkDir(filePath, relPath))
      } else if (stat && stat.isFile()) {
        results.push(relPath)
      }
    }
    return results
  }

  try {
    console.log(`[Files] Listing files in: ${watchDirectory}`)
    const files = walkDir(watchDirectory)
    res.status(200).json({ files })
  } catch (error) {
    console.error(`[Files] Error listing files in '${watchDirectory}':`, error)
    res.status(500).json({ error: "Failed to list files" })
  }
})

export default router
