import { Data, Effect } from "effect";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { publicConfig } from "@/lib/config";

export class MissingToken extends Data.TaggedError("MissingToken")<{}> {}
export class AuthNotConfigured extends Data.TaggedError("AuthNotConfigured")<{}> {}
export class InvalidToken extends Data.TaggedError("InvalidToken")<{ readonly cause: unknown }> {}

// Cached per Worker isolate; jose refreshes keys when it sees an unknown `kid`.
const jwks = createRemoteJWKSet(new URL(`${publicConfig.spacetimeAuthAuthority}/jwks`));

/**
 * Verifies a SpacetimeAuth ID token from `Authorization: Bearer <token>`:
 * signature (via JWKS), expiry, issuer, and audience (this app's client ID).
 */
export const verifyRequest = (request: Request) =>
  Effect.gen(function* () {
    const clientId = publicConfig.spacetimeAuthClientId;
    if (!clientId) return yield* new AuthNotConfigured();

    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token) return yield* new MissingToken();

    const { payload } = yield* Effect.tryPromise({
      try: () =>
        jwtVerify(token, jwks, {
          issuer: publicConfig.spacetimeAuthAuthority,
          audience: clientId,
          algorithms: ["RS256"],
        }),
      catch: (cause) => new InvalidToken({ cause }),
    });
    return payload satisfies JWTPayload;
  });
