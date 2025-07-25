import { internal } from "./_generated/api"
import { cronJobs } from "convex/server"

const crons = cronJobs()

// Run this job every 24 hours to clear out old anonymous sessions
crons.interval("clear stale anonymous sessions", { hours: 24 }, internal.sessions.cleanup)

// Run this job every 24 hours to clean up orphaned workflow nodes
crons.interval("cleanup orphaned workflow nodes", { hours: 24 }, internal.workflows.cleanupOrphanedNodes)

export default crons
