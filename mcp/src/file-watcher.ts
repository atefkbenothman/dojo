import { Router, Request, Response } from "express"
import fs from "fs"
import chokidar from "chokidar"
import path from "path"

const WATCH_DIRECTORY = path.resolve(__dirname, "../data")

if (!fs.existsSync(WATCH_DIRECTORY)) {
  console.warn(`[File Watcher] Directory specified to watch does not exist: ${WATCH_DIRECTORY}`)
}

const router = Router()

const WATCH_OPTIONS = {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true, // Don't fire 'add' events on initial scan
  // usePolling: true, // Use polling if native events don't work (e.g., network drives, some VM setups)
  // interval: 100, // Polling interval
  // binaryInterval: 300, // Polling interval for binary files
  // awaitWriteFinish: { // Wait for writes to finish before firing events
  //   stabilityThreshold: 2000,
  //   pollInterval: 100
  // }
}

const sseClients: Response[] = []

router.get("/file-events", (req: Request, res: Response) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  res.flushHeaders()

  console.log("[SSE] Client connected to /file-events")
  sseClients.push(res)

  req.on("close", () => {
    console.log("[SSE] Client disconnected")
    const index = sseClients.indexOf(res)
    if (index !== -1) {
      sseClients.splice(index, 1)
    }
  })
})

router.get("/file-content", async (req: Request, res: Response): Promise<void> => {
  const relativePath = req.query.path as string

  if (!relativePath) {
    res.status(400).json({ error: "Missing 'path' query parameter." })
    return
  }

  try {
    const requestedAbsolutePath = path.join(WATCH_DIRECTORY, relativePath)

    if (!fs.existsSync(requestedAbsolutePath) || !fs.statSync(requestedAbsolutePath).isFile()) {
      res.status(404).json({ error: `File not found or is not a file: ${relativePath}` })
      return
    }

    console.log(`[File Content] Reading file: ${requestedAbsolutePath}`)
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
    console.error(`[File Content] Error reading file '${relativePath}':`, error)
    res.status(500).json({ error: `Failed to read file: ${relativePath}` })
  }
})

const sendSseEvent = (eventData: any) => {
  const formattedData = JSON.stringify(eventData)
  ;[...sseClients].forEach((client) => {
    try {
      client.write(`data: ${formattedData}\n\n`)
    } catch (error) {
      console.error("[SSE] Error writing to client:", error)
    }
  })
}

type FileEvent = {
  type: "add" | "change" | "unlink"
  path: string
}

const DEBOUNCE_INTERVAL = 300
let eventBuffer: FileEvent[] = []
let debounceTimer: NodeJS.Timeout | null = null

function bufferEvent(event: FileEvent) {
  eventBuffer.push(event)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    sendSseEvent({ event: "fileBatchChanged", changes: eventBuffer })
    eventBuffer = []
    debounceTimer = null
  }, DEBOUNCE_INTERVAL)
}

const watcher = chokidar.watch(WATCH_DIRECTORY, WATCH_OPTIONS)

console.log(`[File Watcher] Chokidar watching ${WATCH_DIRECTORY}`)

watcher
  .on("add", (filePath) => {
    const relativePath = path.relative(WATCH_DIRECTORY, filePath)
    console.log(`[File Watcher] File added: ${relativePath}`)
    bufferEvent({ type: "add", path: relativePath })
  })
  .on("change", (filePath) => {
    const relativePath = path.relative(WATCH_DIRECTORY, filePath)
    console.log(`[File Watcher] File changed: ${relativePath}`)
    bufferEvent({ type: "change", path: relativePath })
  })
  .on("unlink", (filePath) => {
    const relativePath = path.relative(WATCH_DIRECTORY, filePath)
    console.log(`[File Watcher] File removed: ${relativePath}`)
    bufferEvent({ type: "unlink", path: relativePath })
  })
  .on("error", (error) => console.error(`[File Watcher] Error: ${error}`))
  .on("ready", () => {
    console.log("[File Watcher] Initial scan complete. Ready for changes.")
    const watched = watcher.getWatched()
    const allFiles = Object.entries(watched).flatMap(([dir, files]) => files.map((f) => path.join(dir, f)))
    console.log(`[File Watcher] Watching ${allFiles.length} files:`)
    allFiles.forEach((file) => console.log(`  - ${file}`))
  })

process.on("SIGINT", () =>
  watcher.close().then(() => {
    console.log("File watcher closed.")
    process.exit(0)
  }),
)
process.on("SIGTERM", () =>
  watcher.close().then(() => {
    console.log("File watcher closed.")
    process.exit(0)
  }),
)

router.get("/list-files", (req: Request, res: Response) => {
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
    const files = walkDir(WATCH_DIRECTORY)
    res.status(200).json({ files })
  } catch (error) {
    console.error(`[List Files] Error listing files:`, error)
    res.status(500).json({ error: "Failed to list files" })
  }
})

export default router
