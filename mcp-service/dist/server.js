"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const mcp_client_1 = require("./mcp-client");
// In-memory map to hold active connections, keyed by sessionId
const activeConnections = new Map();
const MAX_CONNECTIONS = 10;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const app = (0, express_1.default)();
const port = process.env.PORT || 8888;
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("MCP Service is running!");
});
app.post("/connect", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== "string") {
        console.warn("[server]: /connect called without a valid sessionId");
        res.status(400).json({
            message: "Missing or invalid sessionId"
        });
        return;
    }
    console.log(`[server]: /connect request received for sessionId: ${sessionId}`);
    // Check if connection already exists
    if (activeConnections.has(sessionId)) {
        console.log(`[server]: Session ${sessionId} is already connected`);
        res.status(200).json({
            message: "Already connected"
        });
        return;
    }
    // Check connection limit
    if (activeConnections.size >= MAX_CONNECTIONS) {
        console.warn(`[server]: Connection limit ${MAX_CONNECTIONS} reached. Rejecting ${sessionId}`);
        res.status(503).json({
            message: "Service busy, connection limit reached"
        });
        return;
    }
    let mcpClient = null;
    try {
        mcpClient = new mcp_client_1.MCPClient(path.resolve(process.cwd(), ".."));
        console.log(`[server]: Starting MCPClient connection for ${sessionId}...`);
        await mcpClient.start();
        const connectionData = {
            client: mcpClient,
            lastActivityTimestamp: Date.now()
        };
        // Store the new connection
        activeConnections.set(sessionId, connectionData);
        console.log(`[server]: Connection established for ${sessionId}. Total connections: ${activeConnections.size}`);
        res.status(200).json({ message: "Connection successful" });
    }
    catch (err) {
        console.error(`[server]: Error establising connection for ${sessionId}:`, err);
        activeConnections.delete(sessionId);
        res.status(500).json({ message: "Failed to establish connection" });
    }
});
app.post("/disconnect", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== "string") {
        console.warn("[server]: /disconnect called without a valid sessionId");
        res.status(400).json({ message: "Missing or invalid sessionId" });
        return;
    }
    console.log(`[server]: /disconnect request received for sessionId: ${sessionId}`);
    const connectionData = activeConnections.get(sessionId);
    if (!connectionData) {
        console.log(`[server]: Session ${sessionId} not found for disconnection`);
        res.status(200).json({ message: "Session not found or already disconnected" });
        return;
    }
    try {
        await connectionData.client.cleanup();
        activeConnections.delete(sessionId);
        console.log(`[server]: Connection closed for ${sessionId}. Total connections: ${activeConnections.size}`);
        res.status(200).json({ message: "Disconnection successful" });
    }
    catch (err) {
        console.error(`[server]: Error during disconnection for ${sessionId}:`, err);
        activeConnections.delete(sessionId);
        console.log(`[server]: Connection removed for ${sessionId} after error during close. Total connections: ${activeConnections.size}`);
        res.status(500).json({ message: "Error during disconnection cleanup" });
    }
});
app.post("/chat", async (req, res) => {
    const { sessionId, messages } = req.body;
    if (!sessionId || typeof sessionId !== "string") {
        console.warn("[server]: /chat called without a valid sessionId");
        res.status(400).json({ message: "Missing or invalid sessionId" });
        return;
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.warn(`[server]: /chat called for ${sessionId} without a valid message array`);
        res.status(400).json({ message: "Missing or invalid messages array" });
        return;
    }
    console.log(`[server]: /chat request received for sessionId: ${sessionId}`);
    const connectionData = activeConnections.get(sessionId);
    if (!connectionData) {
        console.log(`[server]: Session ${sessionId} not found for chat`);
        res.status(404).json({
            message: "Sesssion not found or not connected. Please connect first"
        });
        return;
    }
    connectionData.lastActivityTimestamp = Date.now();
    console.log(`[server]: Updated last activity time for ${sessionId}`);
    try {
        console.log(`[server]: Calling MCPClient chat for ${sessionId}...`);
        const response = await connectionData.client.chat(messages);
        if (!response) {
            console.warn(`[server]: MCPClient chat for ${sessionId} returned undefined: ${response}`);
            res.status(500).json({ message: response });
            return;
        }
        res.status(200).json({ response: response });
        return;
    }
    catch (err) {
        console.error(`[server]: Error during simulated chat for ${sessionId}:`, err);
        res.status(500).json({
            message: "Error processing chat message"
        });
        return;
    }
});
// Start the server
app.listen(port, () => {
    console.log(`[server]: MCP Service listening on port ${port}`);
    console.log(`[server]: Initializing with ${activeConnections.size} connections.`);
    console.log(`[server]: Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes.`);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
