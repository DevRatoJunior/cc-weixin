import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Set state dir before importing modules
const testDir = mkdtempSync(join(tmpdir(), "weixin-test-accounts-"));
process.env.WEIXIN_STATE_DIR = testDir;

import { loadAccount, saveAccount, clearAccount } from "./accounts.js";

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("account storage", () => {
  test("loadAccount returns null when no account exists", () => {
    expect(loadAccount()).toBeNull();
  });

  test("saveAccount and loadAccount round-trip", () => {
    const data = {
      token: "test-token",
      baseUrl: "https://example.com",
      userId: "user1",
      savedAt: "2025-01-01T00:00:00.000Z",
    };
    saveAccount(data);
    const loaded = loadAccount();
    expect(loaded).toEqual(data);
  });

  test("saveAccount sets file permissions to 0600", () => {
    saveAccount({
      token: "test",
      baseUrl: "https://example.com",
      savedAt: new Date().toISOString(),
    });
    const accountPath = join(testDir, "account.json");
    const stats = statSync(accountPath);
    // 0o600 = owner read/write only
    expect(stats.mode & 0o777).toBe(0o600);
  });

  test("clearAccount removes the file", () => {
    saveAccount({
      token: "test",
      baseUrl: "https://example.com",
      savedAt: new Date().toISOString(),
    });
    clearAccount();
    expect(loadAccount()).toBeNull();
  });
});
