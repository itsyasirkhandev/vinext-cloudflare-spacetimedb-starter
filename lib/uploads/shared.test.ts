import { readFileSync } from "node:fs";
import { Effect, Exit, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { uploadAttachment } from "./client";
import { UPLOAD_KEY_PATTERN, UploadResponse } from "./shared";

const validKey = "uploads/123e4567-e89b-42d3-a456-426614174000.webp";

describe("upload contract", () => {
  it("accepts generated keys and rejects path tricks", () => {
    expect(UPLOAD_KEY_PATTERN.test(validKey)).toBe(true);
    expect(UPLOAD_KEY_PATTERN.test("uploads/../secret.png")).toBe(false);
    expect(UPLOAD_KEY_PATTERN.test("uploads/123e4567-e89b-42d3-a456-426614174000.svg")).toBe(false);
  });

  it("keeps the Worker and SpacetimeDB module key patterns identical", () => {
    const moduleSource = readFileSync(
      new URL("../../spacetimedb/src/index.ts", import.meta.url),
      "utf8",
    );
    expect(moduleSource.replace(/\s+/g, "")).toContain(UPLOAD_KEY_PATTERN.toString());
  });

  it("decodes upload responses with Effect Schema", () => {
    const decode = Schema.decodeUnknownExit(UploadResponse);
    expect(
      Exit.isSuccess(
        decode({ key: validKey, url: `/api/${validKey}`, size: 1, contentType: "image/webp" }),
      ),
    ).toBe(true);
    expect(
      Exit.isFailure(decode({ key: "nope", url: "/", size: 1, contentType: "text/html" })),
    ).toBe(true);
  });

  it("rejects disallowed files before any network request", async () => {
    const file = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" });
    const exit = await Effect.runPromiseExit(uploadAttachment(file, "token"));
    expect(Exit.isFailure(exit)).toBe(true);
  });
});
