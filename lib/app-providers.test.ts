import type { User } from "oidc-client-ts";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { onSigninCallback } from "@/components/app-providers";

describe("sign-in callback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("navigates home after a redirect but leaves silent iframe callbacks alone", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { replace } });
    onSigninCallback(undefined);
    expect(replace).not.toHaveBeenCalled();
    onSigninCallback({} as User);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/");
  });
});
