import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

dotenv.config();

const ACLOUD_KEY = process.env.ACLOUD_KEY;

const server = new Server(
  {
    name: "acloud-whatsapp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send_whatsapp_template",
        description: "Send a WhatsApp template to a test number",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "The recipient phone number" },
            template_name: { type: "string", description: "The name of the WhatsApp template" },
            variables: { 
              type: "array", 
              items: { type: "string" },
              description: "Array of template variables" 
            },
          },
          required: ["to", "template_name", "variables"],
        },
      },
      {
        name: "check_template_status",
        description: "Check approval status of template",
        inputSchema: {
          type: "object",
          properties: {
            template_name: { type: "string", description: "The name of the WhatsApp template" },
          },
          required: ["template_name"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "send_whatsapp_template") {
    const { to, template_name, variables } = args;

    try {
      const res = await fetch("https://your-acloud.com/api/send", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${ACLOUD_KEY}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ to, template_name, variables })
      });
      const data = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error sending template: ${error.message}` }]
      };
    }
  }

  if (name === "check_template_status") {
    const { template_name } = args;
    
    // TODO: Implement actual DB or API logic here
    return {
      content: [{ type: "text", text: `Checked status for ${template_name} (Mocked Response)` }]
    };
  }

  throw new Error(`Tool not found: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("aCloud WhatsApp MCP Server is running and waiting for requests on stdio.");
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
