#!/usr/bin/env bun
/**
 * Standalone login script: bun src/cli-login.ts [clear]
 */

import { startLogin, waitForLogin } from "./login.js";
import { loadAccount, saveAccount, clearAccount, DEFAULT_BASE_URL } from "./accounts.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { readdirSync } from "node:fs";

const arg = process.argv[2];

if (arg === "clear") {
  clearAccount();
  console.log("Account cleared.");
  process.exit(0);
}

/**
 * Register weixin MCP server in ~/.claude/.mcp.json
 * so `server:weixin` works from any directory.
 */
function registerMcpServer(): void {
  // Find plugin cache dir
  const cacheBase = join(homedir(), ".claude", "plugins", "cache", "cc-weixin", "weixin");
  let pluginDir = resolve(dirname(import.meta.dir), ".");

  if (existsSync(cacheBase)) {
    try {
      const versions = readdirSync(cacheBase).sort();
      if (versions.length > 0) {
        pluginDir = join(cacheBase, versions[versions.length - 1]);
      }
    } catch {}
  }

  const mcpFile = join(homedir(), ".claude", ".mcp.json");
  let config: { mcpServers: Record<string, unknown> } = { mcpServers: {} };

  if (existsSync(mcpFile)) {
    try {
      config = JSON.parse(readFileSync(mcpFile, "utf-8"));
      config.mcpServers = config.mcpServers || {};
    } catch {}
  }

  config.mcpServers.weixin = {
    command: "bash",
    args: ["-c", `cd "${pluginDir}" && exec bun server.ts`],
  };

  writeFileSync(mcpFile, JSON.stringify(config, null, 2), "utf-8");
  console.log(`\nMCP server registered: ${mcpFile}`);
}

// Check existing account
const existing = loadAccount();
if (existing) {
  console.log("Already connected:");
  console.log(`  User ID: ${existing.userId || "unknown"}`);
  console.log(`  Connected since: ${existing.savedAt}`);
  console.log('\nRun "bun src/cli-login.ts clear" to disconnect.');
  registerMcpServer();
  console.log("\nRestart Claude Code with:");
  console.log("  claude --dangerously-load-development-channels server:weixin");
  process.exit(0);
}

// Start login
console.log("Starting WeChat QR login...\n");
const qr = await startLogin(DEFAULT_BASE_URL);
console.log(`\nScan the QR code above with WeChat, or open this URL:\n${qr.qrcodeUrl}\n`);

const result = await waitForLogin({
  qrcodeId: qr.qrcodeId,
  apiBaseUrl: DEFAULT_BASE_URL,
});

if (result.connected && result.token) {
  saveAccount({
    token: result.token,
    baseUrl: result.baseUrl || DEFAULT_BASE_URL,
    userId: result.userId,
    savedAt: new Date().toISOString(),
  });
  console.log("\nConnected successfully!");
  console.log(`  User ID: ${result.userId}`);
  console.log(`  Base URL: ${result.baseUrl || DEFAULT_BASE_URL}`);
  registerMcpServer();
  console.log("\nRestart Claude Code with:");
  console.log("  claude --dangerously-load-development-channels server:weixin");
} else {
  console.log(`\nLogin failed: ${result.message}`);
  process.exit(1);
}
