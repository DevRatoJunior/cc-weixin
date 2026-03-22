import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Set state dir before importing modules
const testDir = mkdtempSync(join(tmpdir(), "weixin-test-"));
process.env.WEIXIN_STATE_DIR = testDir;

import {
  loadAccessConfig,
  saveAccessConfig,
  isAllowed,
  addPendingPairing,
  confirmPairing,
} from "./pairing.js";

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("loadAccessConfig", () => {
  test("returns default config when no file exists", () => {
    const config = loadAccessConfig();
    expect(config.policy).toBe("pairing");
    expect(config.allowFrom).toEqual([]);
  });

  test("round-trips saved config", () => {
    saveAccessConfig({ policy: "allowlist", allowFrom: ["user1"] });
    const config = loadAccessConfig();
    expect(config.policy).toBe("allowlist");
    expect(config.allowFrom).toEqual(["user1"]);
  });
});

describe("isAllowed", () => {
  test("returns false for unknown user under pairing policy", () => {
    expect(isAllowed("unknown")).toBe(false);
  });

  test("returns true for allowed user", () => {
    saveAccessConfig({ policy: "pairing", allowFrom: ["user1"] });
    expect(isAllowed("user1")).toBe(true);
  });

  test("returns true for any user under disabled policy", () => {
    saveAccessConfig({ policy: "disabled", allowFrom: [] });
    expect(isAllowed("anyone")).toBe(true);
  });
});

describe("pairing flow", () => {
  test("generates 6-digit code", () => {
    const code = addPendingPairing("user1");
    expect(code).toMatch(/^\d{6}$/);
  });

  test("returns same code for same user", () => {
    const code1 = addPendingPairing("user1");
    const code2 = addPendingPairing("user1");
    expect(code1).toBe(code2);
  });

  test("confirm adds user to allowlist", () => {
    const code = addPendingPairing("user1");
    const userId = confirmPairing(code);
    expect(userId).toBe("user1");
    expect(isAllowed("user1")).toBe(true);
  });

  test("confirm returns null for invalid code", () => {
    expect(confirmPairing("000000")).toBeNull();
  });

  test("code cannot be reused after confirmation", () => {
    const code = addPendingPairing("user1");
    confirmPairing(code);
    expect(confirmPairing(code)).toBeNull();
  });
});
