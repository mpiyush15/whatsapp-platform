import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Ensure the Groq API key is present
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  console.error("Error: GROQ_API_KEY environment variable is missing.");
  process.exit(1);
}

const groq = new Groq({ apiKey: groqApiKey });

// Create the MCP Server
const server = new Server(
  {
    name: "meta-ai-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_text",
        description: "Generate text using the Meta LLaMA 3 model via Groq.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The user prompt or question.",
            },
            system_prompt: {
              type: "string",
              description: "Optional system instructions for the model.",
            },
            model: {
              type: "string",
              description: "The specific model to use (default: llama3-70b-8192)",
              enum: ["llama3-8b-8192", "llama3-70b-8192"],
            },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_text") {
    const prompt = args.prompt;
    const systemPrompt = args.system_prompt;
    const model = args.model || "llama3-70b-8192";

    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const completion = await groq.chat.completions.create({
        messages,
        model,
      });

      const resultText = completion.choices[0]?.message?.content || "";

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error calling Meta AI model: ${error.message}`,
          },
        ],
      };
    }
  }

  throw new Error(`Tool not found: ${name}`);
});

// Start the server using stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Meta AI MCP Server is running and waiting for requests on stdio.");
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
