import { ConnectionId, type Identity } from "spacetimedb";
import { createModuleTestHarness, TestAuth } from "spacetimedb/server/test-utils";
import { describe, expect, it, vi } from "vite-plus/test";

import spacetime, * as moduleExports from "./index";

const CLIENT_ID = "client_test";
const ISSUER = "https://auth.spacetimedb.com/oidc";

vi.mock("./auth-config", () => ({
  SPACETIMEAUTH_ISSUER: "https://auth.spacetimedb.com/oidc",
  SPACETIMEAUTH_CLIENT_IDS: ["client_test"],
}));

let nextConnection = 1n;
function signedIn(subject: string, claims: Record<string, unknown> = {}) {
  return TestAuth.fromJwtPayload(
    JSON.stringify({ iss: ISSUER, sub: subject, aud: CLIENT_ID, ...claims }),
    new ConnectionId(nextConnection++),
  );
}

const newHarness = () => createModuleTestHarness(spacetime, moduleExports);
type Harness = ReturnType<typeof newHarness>;

function connect(test: Harness, auth: TestAuth): Identity {
  let identity: Identity | undefined;
  test.withReducerTx(auth, (ctx) => {
    identity = ctx.sender;
    moduleExports.onConnect(ctx, {});
  });
  if (!identity) throw new Error("expected identity");
  return identity;
}

const KEY = "uploads/123e4567-e89b-42d3-a456-426614174000.png";

describe("auth gate", () => {
  it("accepts SpacetimeAuth tokens for the configured client and stores a public profile", () => {
    const test = newHarness();
    const alice = connect(
      test,
      signedIn("alice", {
        name: "Alice",
        email: "alice@example.com",
        picture: "https://x.test/a.png",
      }),
    );
    const row = test.db.user.identity.find(alice);
    expect(row).toMatchObject({ name: "Alice", avatarUrl: "https://x.test/a.png", online: true });
    expect(
      JSON.stringify(row, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    ).not.toContain("alice@example.com");
  });

  it("rejects tokens from another issuer", () => {
    const test = newHarness();
    const auth = TestAuth.fromJwtPayload(
      JSON.stringify({ iss: "https://evil.example", sub: "mallory", aud: CLIENT_ID }),
      new ConnectionId(nextConnection++),
    );
    expect(() => test.withReducerTx(auth, (ctx) => moduleExports.onConnect(ctx, {}))).toThrow(
      "unexpected token issuer",
    );
  });

  it("rejects tokens issued for a different client", () => {
    const test = newHarness();
    const auth = signedIn("mallory", { aud: "client_other" });
    expect(() => test.withReducerTx(auth, (ctx) => moduleExports.onConnect(ctx, {}))).toThrow(
      "different client",
    );
  });
});

describe("messages", () => {
  it("stores trimmed messages with an attachment", () => {
    const test = newHarness();
    const auth = signedIn("alice");
    const alice = connect(test, auth);
    test.withReducerTx(auth, (ctx) =>
      moduleExports.send_message(ctx, {
        text: "  hello  ",
        attachmentKey: KEY,
        attachmentName: "a.png",
      }),
    );
    const rows = [...test.db.message.iter()];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ text: "hello", attachmentKey: KEY, attachmentName: "a.png" });
    expect(rows[0]?.sender.isEqual(alice)).toBe(true);
  });

  it("rejects empty text and malformed attachment keys", () => {
    const test = newHarness();
    const auth = signedIn("alice");
    connect(test, auth);
    expect(() =>
      test.withReducerTx(auth, (ctx) =>
        moduleExports.send_message(ctx, {
          text: "   ",
          attachmentKey: undefined,
          attachmentName: undefined,
        }),
      ),
    ).toThrow("must not be empty");
    expect(() =>
      test.withReducerTx(auth, (ctx) =>
        moduleExports.send_message(ctx, {
          text: "x",
          attachmentKey: "../secret",
          attachmentName: undefined,
        }),
      ),
    ).toThrow("Invalid attachment key");
    expect([...test.db.message.iter()]).toHaveLength(0);
  });

  it("only lets the author delete a message", () => {
    const test = newHarness();
    const aliceAuth = signedIn("alice");
    const bobAuth = signedIn("bob");
    connect(test, aliceAuth);
    connect(test, bobAuth);
    test.withReducerTx(aliceAuth, (ctx) =>
      moduleExports.send_message(ctx, {
        text: "mine",
        attachmentKey: undefined,
        attachmentName: undefined,
      }),
    );
    const id = [...test.db.message.iter()][0]?.id;
    if (id === undefined) throw new Error("expected message");
    expect(() =>
      test.withReducerTx(bobAuth, (ctx) => moduleExports.delete_message(ctx, { id })),
    ).toThrow("only delete your own");
    test.withReducerTx(aliceAuth, (ctx) => moduleExports.delete_message(ctx, { id }));
    expect([...test.db.message.iter()]).toHaveLength(0);
  });
});
