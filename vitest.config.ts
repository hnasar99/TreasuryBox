import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@treasurybox/rails": resolve(__dirname, "packages/rails/src/index.ts"),
    },
  },
});
