import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { MAX_UPLOAD_BYTES } from "./shared";

const mocks = vi.hoisted(() => ({
  authorized: true,
  put: vi.fn(),
  get: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: { UPLOADS: { put: mocks.put, get: mocks.get } } }));
vi.mock("@/lib/auth/verify-token", () => ({
  verifyRequest: () =>
    mocks.authorized
      ? Effect.succeed({ sub: "verified-user" })
      : Effect.fail({ _tag: "MissingToken" as const }),
}));

import { handleDownload, handleUpload } from "./server";

function uploadRequest(file?: File, extraHeaders?: Record<string, string>): Request {
  const form = new FormData();
  if (file) form.set("file", file);
  return new Request("https://example.test/api/uploads", {
    method: "POST",
    body: form,
    headers: extraHeaders,
  });
}

const png = () => new File(["png content"], "photo.png", { type: "image/png" });

describe("Worker upload and download routes", () => {
  beforeEach(() => {
    mocks.authorized = true;
    mocks.put.mockReset();
    mocks.get.mockReset();
    mocks.put.mockResolvedValue({});
  });
  it("rejects unauthenticated requests before touching storage", async () => {
    mocks.authorized = false;
    const response = await Effect.runPromise(handleUpload(uploadRequest(png())));
    expect(response.status).toBe(401);
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it("rejects oversized, missing, empty, and unsupported files", async () => {
    const oversized = uploadRequest(png(), {
      "content-length": String(MAX_UPLOAD_BYTES + 64 * 1024 + 1),
    });
    expect((await Effect.runPromise(handleUpload(oversized))).status).toBe(413);
    expect((await Effect.runPromise(handleUpload(uploadRequest()))).status).toBe(400);
    expect(
      (
        await Effect.runPromise(
          handleUpload(uploadRequest(new File([], "x.png", { type: "image/png" }))),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await Effect.runPromise(
          handleUpload(uploadRequest(new File(["bad"], "x.svg", { type: "image/svg+xml" }))),
        )
      ).status,
    ).toBe(400);
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it("uploads accepted files with verified ownership and safe content metadata", async () => {
    const response = await Effect.runPromise(handleUpload(uploadRequest(png())));
    expect(response.status).toBe(201);
    const body = (await response.json()) as { key: string; contentType: string; size: number };
    expect(body.key).toMatch(/^uploads\/[a-f0-9-]+\.png$/);
    expect(body.contentType).toBe("image/png");
    expect(mocks.put).toHaveBeenCalledWith(body.key, expect.any(ArrayBuffer), {
      httpMetadata: { contentType: "image/png" },
      customMetadata: { uploadedBy: "verified-user", originalName: "photo.png" },
    });
  });
  it("returns errors for missing objects and storage failures", async () => {
    mocks.get.mockResolvedValue(null);
    expect((await Effect.runPromise(handleDownload("absent.png"))).status).toBe(404);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.put.mockRejectedValue(new Error("unavailable"));
      expect((await Effect.runPromise(handleUpload(uploadRequest(png())))).status).toBe(502);
    } finally {
      log.mockRestore();
    }
  });
});
