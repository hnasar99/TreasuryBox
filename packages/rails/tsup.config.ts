import { defineConfig } from "tsup";

const provider = (process.env.RAIL_PROVIDER ?? "full").toLowerCase();
const entryMap: Record<string, string> = {
  ripio: "src/entry-ripio.ts",
  twin: "src/entry-twin.ts",
  full: "src/entry-full.ts",
};

const entry = entryMap[provider];
if (!entry) {
  throw new Error(`RAIL_PROVIDER must be ripio|twin|full (got: ${provider})`);
}

console.log(`[rails] building provider=${provider} entry=${entry}`);

export default defineConfig({
  entry: { index: entry },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  outDir: "dist",
  target: "node24",
  esbuildOptions(options) {
    options.define = {
      ...options.define,
      "process.env.RAIL_PROVIDER": JSON.stringify(provider),
    };
  },
});
