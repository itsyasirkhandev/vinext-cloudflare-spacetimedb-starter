import { defineConfig, type Plugin } from "vite-plus";
import { spacetimedbModuleTestPlugin } from "spacetimedb/server/test-utils/vitest";

// Unit tests run reducers against SpacetimeDB's in-memory datastore.
export default defineConfig({
  cacheDir: "node_modules/.vite-module-tests",
  plugins: [spacetimedbModuleTestPlugin() as unknown as Plugin],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
