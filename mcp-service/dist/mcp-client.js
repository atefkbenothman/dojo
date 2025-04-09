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
exports.MCPClient = void 0;
const path = __importStar(require("path"));
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const google_1 = require("@ai-sdk/google");
const ai_1 = require("ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({
    path: path.resolve(process.cwd(), "../.env")
});
class MCPClient {
    client = null;
    transport = null;
    composeFilePath;
    command;
    args;
    tools = undefined;
    model = null;
    constructor(composeFilePath = path.resolve(process.cwd(), "..")) {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is missing");
        }
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        if (!GOOGLE_API_KEY) {
            throw new Error("GOOGLE_API_KEY is missing");
        }
        this.composeFilePath = composeFilePath;
        this.command = "docker-compose";
        this.args = ["run", "--rm", "github-mcp-server"];
        this.initializeAI(GOOGLE_API_KEY, GROQ_API_KEY);
        console.log(`Client SDK configured to run: ${this.command} ${this.args.join(" ")} in ${this.composeFilePath}`);
    }
    initializeAI(googleApiKey, groqApiKey) {
        try {
            const google = (0, google_1.createGoogleGenerativeAI)({ apiKey: googleApiKey });
            this.model = (0, ai_1.wrapLanguageModel)({
                model: google("gemini-1.5-flash"),
                middleware: (0, ai_1.extractReasoningMiddleware)({ tagName: "think" }),
            });
            // const groq = createGroq({ apiKey: groqApiKey })
            // this.model = wrapLanguageModel({
            //   model: groq("llama-3.3-70b-versatile"),
            //   middleware: extractReasoningMiddleware({ tagName: "think" }),
            // })
            if (this.model) {
                console.log(`Initialized AI: [${this.model.provider}] [${this.model.modelId}]`);
            }
            else {
                throw new Error("Failed to initialize any AI model");
            }
        }
        catch (err) {
            console.error("Could not initialize AI model:", err);
            throw err;
        }
    }
    async start() {
        if (this.client) {
            console.warn("Client already started");
            return;
        }
        this.client = new index_js_1.Client({
            name: "mcp-client",
            version: "1.0.0"
        });
        this.transport = new stdio_js_1.StdioClientTransport({
            command: this.command,
            args: this.args,
            cwd: this.composeFilePath
        });
        try {
            console.log("Connecting client and initiating handshake...");
            await this.client.connect(this.transport);
            const toolsResults = await this.client.listTools();
            this.tools = toolsResults.tools.reduce((acc, tool) => {
                acc[tool.name] = {
                    description: tool.description,
                    parameters: (0, ai_1.jsonSchema)(tool.inputSchema)
                };
                return acc;
            }, {});
            console.log("Connected to server with tools: ", Object.values(this.tools).map(tool => tool.description));
        }
        catch (err) {
            console.error("Failed to connect MCP client: ", err);
            this.client = null;
            this.transport = null;
            throw err;
        }
    }
    async chat(messages) {
        if (!this.model) {
            console.warn("AI model not initialized");
            return "Error: AI model not available.";
        }
        if (!this.client) {
            console.warn("Client not connected");
            return "Error: MCP Client not connected.";
        }
        if (!messages || messages.length === 0) {
            return "Error: cannot process empty message history";
        }
        console.log(`Generating AI response based on ${messages.length} messages. Last message:`, messages[messages.length - 1]?.content);
        try {
            let response = await (0, ai_1.generateText)({
                model: this.model,
                messages: messages,
                tools: this.tools,
            });
            let finalText = [];
            let toolResults = [];
            for (const message of response.response.messages) {
                for (const content of message.content) {
                    if (typeof content === "object") {
                        if (content.type === "text" || content.type === "reasoning") {
                            finalText.push(content.text);
                        }
                        else if (content.type === "tool-call") {
                            console.log("CALLING TOOL: ", content);
                            const toolName = content.toolName;
                            const toolArgs = content.args;
                            const result = await this.client.callTool({
                                name: toolName,
                                arguments: toolArgs
                            });
                            toolResults.push(result);
                            finalText.push(`[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`);
                            messages.push({
                                role: "user",
                                content: result.content
                            });
                            const response = await (0, ai_1.generateText)({
                                model: this.model,
                                messages: messages,
                            });
                            finalText.push(response.text);
                        }
                    }
                }
            }
            return finalText.join("\n");
        }
        catch (err) {
            console.error("Error generating text or calling tool:", err);
            return `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
    }
    async cleanup() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.transport = null;
            console.log("MCPClient connection closed");
        }
    }
}
exports.MCPClient = MCPClient;
