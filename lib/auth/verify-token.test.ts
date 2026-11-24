import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  config: {
    spacetimeAuthAuthority: "https://auth.example/oidc",
    spacetimeAuthClientId: "client-id",
  },
}));
vi.mock("jose", () => ({ createRemoteJWKSet: () => "mock-jwks", jwtVerify: mocks.verify }));
vi.mock("@/lib/config", () => ({ publicConfig: mocks.config }));

import { verifyRequest } from "./verify-token";

const check = (header?: string) =>
  Effect.runPromise(
    verifyRequest(
      new Request("https://example.test", { headers: header ? { authorization: header } : {} }),
    ).pipe(Effect.match({ onFailure: (error) => error._tag, onSuccess: (payload) => payload.sub })),
  );

describe("verifyRequest", () => {
  beforeEach(() => {
    mocks.config.spacetimeAuthClientId = "client-id";
    mocks.verify.mockReset();
  });
  it("fails closed when the client is not configured or the bearer token is missing", async () => {
    mocks.config.spacetimeAuthClientId = "";
    expect(await check("Bearer token")).toBe("AuthNotConfigured");
    mocks.config.spacetimeAuthClientId = "client-id";
    expect(await check()).toBe("MissingToken");
    expect(await check("Basic token")).toBe("MissingToken");
    expect(await check("Bearer   ")).toBe("MissingToken");
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("verifies issuer, audience, and algorithm, returning verified claims", async () => {
    mocks.verify.mockResolvedValue({ payload: { sub: "user-1" } });
    expect(await check("Bearer  signed-token  ")).toBe("user-1");
    expect(mocks.verify).toHaveBeenCalledWith("signed-token", "mock-jwks", {
      issuer: "https://auth.example/oidc",
      audience: "client-id",
      algorithms: ["RS256"],
    });
  });
  it("rejects a token when verification fails", async () => {
    mocks.verify.mockRejectedValue(new Error("invalid signature"));
    expect(await check("Bearer bad-token")).toBe("InvalidToken");
  });
});
