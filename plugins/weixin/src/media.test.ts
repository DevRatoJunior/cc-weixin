import { describe, test, expect } from "bun:test";
import { randomBytes } from "node:crypto";
import {
  encryptAesEcb,
  decryptAesEcb,
  aesEcbPaddedSize,
  parseAesKey,
  buildCdnDownloadUrl,
  buildCdnUploadUrl,
  guessMediaType,
} from "./media.js";
import { UploadMediaType } from "./types.js";

describe("AES-128-ECB", () => {
  test("encrypt then decrypt returns original data", () => {
    const key = randomBytes(16);
    const plaintext = Buffer.from("hello world test data!!");
    const ciphertext = encryptAesEcb(plaintext, key);
    const decrypted = decryptAesEcb(ciphertext, key);
    expect(decrypted).toEqual(plaintext);
  });

  test("different keys produce different ciphertext", () => {
    const key1 = randomBytes(16);
    const key2 = randomBytes(16);
    const plaintext = Buffer.from("test data");
    const c1 = encryptAesEcb(plaintext, key1);
    const c2 = encryptAesEcb(plaintext, key2);
    expect(c1).not.toEqual(c2);
  });
});

describe("aesEcbPaddedSize", () => {
  test("pads to next 16-byte boundary", () => {
    expect(aesEcbPaddedSize(1)).toBe(16);
    expect(aesEcbPaddedSize(16)).toBe(32);
    expect(aesEcbPaddedSize(17)).toBe(32);
    expect(aesEcbPaddedSize(32)).toBe(48);
  });
});

describe("parseAesKey", () => {
  test("parses 16 raw bytes from base64", () => {
    const raw = randomBytes(16);
    const b64 = raw.toString("base64");
    const parsed = parseAesKey(b64);
    expect(parsed).toEqual(raw);
  });

  test("parses hex-encoded key from base64", () => {
    const raw = randomBytes(16);
    const hexStr = raw.toString("hex"); // 32 hex chars
    const b64 = Buffer.from(hexStr, "ascii").toString("base64");
    const parsed = parseAesKey(b64);
    expect(parsed).toEqual(raw);
  });

  test("throws on invalid key length", () => {
    const invalid = Buffer.from("short").toString("base64");
    expect(() => parseAesKey(invalid)).toThrow("Invalid aes_key");
  });
});

describe("CDN URL builders", () => {
  test("buildCdnDownloadUrl encodes param", () => {
    const url = buildCdnDownloadUrl("abc=123", "https://cdn.example.com");
    expect(url).toBe("https://cdn.example.com/download?encrypted_query_param=abc%3D123");
  });

  test("buildCdnUploadUrl encodes params", () => {
    const url = buildCdnUploadUrl("https://cdn.example.com", "param1", "key1");
    expect(url).toBe("https://cdn.example.com/upload?encrypted_query_param=param1&filekey=key1");
  });
});

describe("guessMediaType", () => {
  test("detects image extensions", () => {
    expect(guessMediaType("photo.jpg")).toBe(UploadMediaType.IMAGE);
    expect(guessMediaType("photo.png")).toBe(UploadMediaType.IMAGE);
    expect(guessMediaType("photo.webp")).toBe(UploadMediaType.IMAGE);
  });

  test("detects video extensions", () => {
    expect(guessMediaType("video.mp4")).toBe(UploadMediaType.VIDEO);
    expect(guessMediaType("video.mov")).toBe(UploadMediaType.VIDEO);
  });

  test("defaults to FILE for unknown extensions", () => {
    expect(guessMediaType("doc.pdf")).toBe(UploadMediaType.FILE);
    expect(guessMediaType("archive.zip")).toBe(UploadMediaType.FILE);
  });
});
