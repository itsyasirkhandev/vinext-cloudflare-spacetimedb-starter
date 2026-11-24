import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "vinext-cloudflare-spacetimedb-starter",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-24",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      // R2 bucket for user uploads. Local dev uses a simulated bucket;
      // `pnpm run deploy` provisions the bucket if it does not exist.
      UPLOADS: bindings.r2({ name: "vinext-spacetimedb-starter-uploads" }),
    },
  }),
});
