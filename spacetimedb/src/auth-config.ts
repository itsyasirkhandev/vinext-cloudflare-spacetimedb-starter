/**
 * SpacetimeAuth settings for the module.
 *
 * SpacetimeDB accepts any correctly signed OIDC token, so the module must check
 * the issuer and audience itself. Modules cannot read environment variables;
 * edit this file and republish when you change SpacetimeAuth clients.
 *
 * Client IDs are public values (they are also shipped to the browser).
 * Never put a client secret here.
 */
export const SPACETIMEAUTH_ISSUER = "https://auth.spacetimedb.com/oidc";

/**
 * Paste the client ID(s) from SpacetimeAuth -> Clients, for example
 * `["client_XXXXXXXXXXXXXXXXXXXXXX"]`.
 *
 * Left empty, every connection is rejected (fail closed).
 */
export const SPACETIMEAUTH_CLIENT_IDS: readonly string[] = [];
