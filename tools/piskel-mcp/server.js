#!/usr/bin/env node

const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const PIPELINE = path.join(__dirname, "character_piskel_pipeline.py");
const PYTHON = process.env.PYTHON || "python";

const tools = [
  {
    name: "list_character_animations",
    description: "List runtime-active player animations known to the Piskel bridge.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "import_character_to_piskel",
    description: "Convert current runtime character sheets/images into editable .piskel files.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "export_character_from_piskel",
    description: "Regenerate Phaser runtime assets from editable .piskel files.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "audit_character_centering",
    description: "Validate dimensions, frame counts, transparent corners, clipping, bottom alignment, and drift.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "build_character_previews",
    description: "Build metadata, GIF previews, and contact sheets from .piskel sources.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "validate_character_piskel_sources",
    description: "Validate editable .piskel sources against the manifest frame size, frame count, fps, and drift policy.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "auto_align_character_sources",
    description: "Shift selected v5 animation frames inside their canvases to reduce center drift and rebuild runtime assets.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
];

const commandByTool = {
  list_character_animations: "list",
  import_character_to_piskel: "import",
  export_character_from_piskel: "export",
  audit_character_centering: "audit",
  build_character_previews: "preview",
  validate_character_piskel_sources: "validate",
  auto_align_character_sources: "align",
};

let input = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  input = Buffer.concat([input, chunk]);
  readMessages();
});

function readMessages() {
  while (true) {
    const headerEnd = input.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;

    const header = input.slice(0, headerEnd).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      input = input.slice(headerEnd + 4);
      continue;
    }

    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + length;
    if (input.length < bodyEnd) return;

    const body = input.slice(bodyStart, bodyEnd).toString("utf8");
    input = input.slice(bodyEnd);
    handleMessage(JSON.parse(body)).catch((error) => {
      if (error.requestId !== undefined) {
        sendError(error.requestId, -32603, error.message);
      }
    });
  }
}

function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMessage(request) {
  if (request.id === undefined) return;

  if (request.method === "initialize") {
    sendResult(request.id, {
      protocolVersion: request.params?.protocolVersion || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "jkd-piskel-bridge", version: "1.0.0" },
    });
    return;
  }

  if (request.method === "tools/list") {
    sendResult(request.id, { tools });
    return;
  }

  if (request.method === "tools/call") {
    const name = request.params?.name;
    const toolCommand = commandByTool[name];
    if (!toolCommand) {
      sendError(request.id, -32602, `Unknown tool: ${name}`);
      return;
    }
    const result = await runPipeline(toolCommand, request.params?.arguments || {});
    sendResult(request.id, result);
    return;
  }

  sendError(request.id, -32601, `Unknown method: ${request.method}`);
}

function runPipeline(command, args) {
  return new Promise((resolve) => {
    const childArgs = [PIPELINE, command, "--json"];
    if (Array.isArray(args.ids) && args.ids.length) {
      childArgs.push("--ids", args.ids.join(","));
    }

    const child = spawn(PYTHON, childArgs, { cwd: ROOT, windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      const text = stdout || stderr || `Pipeline exited with code ${code}`;
      resolve({
        isError: code !== 0,
        content: [{ type: "text", text }],
      });
    });
  });
}
