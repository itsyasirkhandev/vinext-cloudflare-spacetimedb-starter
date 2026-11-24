import { SenderError } from "spacetimedb/server";
import { SPACETIMEAUTH_CLIENT_IDS, SPACETIMEAUTH_ISSUER } from "./auth-config";

type JsonClaims = Readonly<Record<string, unknown>>;

/** Subset of the JWT claims SpacetimeDB exposes on `ctx.senderAuth.jwt`. */
export interface VerifiedJwt {
  readonly issuer: string;
  readonly subject: string;
  readonly audience: readonly string[];
  readonly fullPayload: JsonClaims;
}

export interface Profile {
  readonly name: string;
  readonly avatarUrl: string | undefined;
}

/**
 * Throws unless the caller presented a SpacetimeAuth token issued for one of
 * this app's clients. SpacetimeDB has already verified the signature and expiry.
 */
export function requireSpacetimeAuth(
  jwt: VerifiedJwt | null | undefined,
  allowedClientIds: readonly string[] = SPACETIMEAUTH_CLIENT_IDS,
): VerifiedJwt {
  if (jwt == null) {
    throw new SenderError("Unauthorized: sign in with SpacetimeAuth to connect");
  }
  if (allowedClientIds.length === 0) {
    throw new SenderError(
      "Server misconfigured: set SPACETIMEAUTH_CLIENT_IDS in spacetimedb/src/auth-config.ts",
    );
  }
  if (jwt.issuer !== SPACETIMEAUTH_ISSUER) {
    throw new SenderError("Unauthorized: unexpected token issuer");
  }
  if (!jwt.audience.some((aud) => allowedClientIds.includes(aud))) {
    throw new SenderError("Unauthorized: token was issued for a different client");
  }
  return jwt;
}

function stringClaim(claims: JsonClaims, key: string): string | undefined {
  const value = claims[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** Public profile derived from OIDC claims. The email address is never stored publicly. */
export function profileFromClaims(jwt: VerifiedJwt): Profile {
  const claims = jwt.fullPayload;
  const name =
    stringClaim(claims, "name") ??
    stringClaim(claims, "preferred_username") ??
    stringClaim(claims, "given_name") ??
    `user-${jwt.subject.slice(-6)}`;
  const picture = stringClaim(claims, "picture");
  return {
    name: name.slice(0, 64),
    avatarUrl: picture?.startsWith("https://") ? picture : undefined,
  };
}
