import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/lib/config", () => ({ isAuthConfigured: true }));
vi.mock("@/components/app-providers", () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ isLoading: false, error: new Error("Cancelled") }),
}));

import { StarterApp } from "@/components/starter-app";

describe("authentication errors", () => {
  it("offers a way to retry after a sign-in error", () => {
    const html = renderToStaticMarkup(createElement(StarterApp));
    expect(html).toContain("Cancelled");
    expect(html).toContain("Try again");
  });
});
