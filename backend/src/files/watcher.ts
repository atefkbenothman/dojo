import fs from "fs"
import path from "path"
import chokidar, { FSWatcher } from "chokidar"
import { EventEmitter } from "events"
import { FileChangeEvent, FileBatchChangeEvent } from "../types"
import { WATCH_DIRECTORY_PATH } from "../config"

const DEBOUNCE_INTERVAL = 300

export const watcherEmitter = new EventEmitter()

let eventBuffer: FileChangeEvent[] = []
let debounceTimer: NodeJS.Timeout | null = null

function bufferEvent(event: FileChangeEvent) {
  eventBuffer.push(event)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const batchEvent: FileBatchChangeEvent = { event: "fileBatchChanged", changes: eventBuffer }
    watcherEmitter.emit("fileBatchChanged", batchEvent)
    eventBuffer = []
    debounceTimer = null
  }, DEBOUNCE_INTERVAL)
}

const WATCH_OPTIONS = {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true,
}

let watcher: FSWatcher | null = null

/* Watch files */
export function startWatching(): void {
  if (watcher) {
    console.log("[Watcher] Watcher already started")
    return
  }

  if (!WATCH_DIRECTORY_PATH || typeof WATCH_DIRECTORY_PATH !== "string") {
    console.error("[Watcher] WATCH_DIRECTORY_PATH from config is invalid or not set.")
    return
  }

  const resolvedWatchPath = path.isAbsolute(WATCH_DIRECTORY_PATH)
    ? WATCH_DIRECTORY_PATH
    : path.resolve(WATCH_DIRECTORY_PATH)

  if (!fs.existsSync(resolvedWatchPath)) {
    console.warn(`[Watcher] Directory specified to watch does not exist: ${resolvedWatchPath}`)
    return
  }

  watcher = chokidar.watch(resolvedWatchPath, WATCH_OPTIONS)

  console.log(`[Watcher] Chokidar watching ${resolvedWatchPath}`)

  watcher
    .on("add", (filePath: string) => {
      const relativePath = path.relative(resolvedWatchPath, filePath)
      console.log(`[Watcher] File added: ${relativePath}`)
      bufferEvent({ type: "add", path: relativePath })
    })
    .on("change", (filePath: string) => {
      const relativePath = path.relative(resolvedWatchPath, filePath)
      console.log(`[Watcher] File changed: ${relativePath}`)
      bufferEvent({ type: "change", path: relativePath })
    })
    .on("unlink", (filePath: string) => {
      const relativePath = path.relative(resolvedWatchPath, filePath)
      console.log(`[Watcher] File removed: ${relativePath}`)
      bufferEvent({ type: "unlink", path: relativePath })
    })
    .on("error", (error: unknown) => console.error(`[Watcher] Error: ${error}`))
    .on("ready", () => {
      console.log("[Watcher] Initial scan complete. Ready for changes.")
      if (watcher) {
        const watched = watcher.getWatched()
        const fileCount = Object.values(watched).reduce((sum, files: string[]) => sum + files.length, 0)
        console.log(`[Watcher] Currently watching ${fileCount} files/dirs.`)
      }
    })

  process.on("SIGINT", closeWatcher)
  process.on("SIGTERM", closeWatcher)
}

async function closeWatcher() {
  if (watcher) {
    console.log("[Watcher] Closing file watcher...")
    await watcher.close()
    console.log("[Watcher] File watcher closed")
    watcher = null
    process.exit(0)
  } else {
    process.exit(0)
  }
}
