import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  active: true,
  loading: false,
  connectionError: null as Error | null,
}));
vi.mock("@/lib/module_bindings", () => ({
  tables: { message: "message", user: "user" },
  reducers: { sendMessage: "send", deleteMessage: "delete" },
}));
vi.mock("spacetimedb/react", () => ({
  useSpacetimeDB: () => ({
    isActive: mocks.active,
    identity: undefined,
    connectionError: mocks.connectionError,
  }),
  useTable: (table: string) => [[], table === "message" && mocks.loading],
  useReducer: () => async () => {},
}));

import { Guestbook } from "@/components/guestbook";

const render = () => renderToStaticMarkup(createElement(Guestbook, { idToken: "test-token" }));

describe("guestbook connection states", () => {
  beforeEach(() => {
    mocks.active = true;
    mocks.loading = false;
    mocks.connectionError = null;
  });
  it("renders a live empty guestbook and the message form", () => {
    const html = render();
    expect(html).toContain("Live");
    expect(html).toContain("No messages yet. Be the first!");
    expect(html).toContain('id="guestbook-text"');
  });
  it("shows loading and disables inputs while connecting", () => {
    mocks.active = false;
    mocks.loading = true;
    const html = render();
    expect(html).toContain("Connecting");
    expect(html).toContain("Loading messages");
    expect(html).toContain("disabled");
    expect(html).not.toContain("No messages yet");
  });
  it("shows the connection error instead of the form", () => {
    mocks.connectionError = new Error("connection refused");
    const html = render();
    expect(html).toContain("Could not connect to SpacetimeDB");
    expect(html).toContain("connection refused");
    expect(html).not.toContain('id="guestbook-text"');
  });
});
