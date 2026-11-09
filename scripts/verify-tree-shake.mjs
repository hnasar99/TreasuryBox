#!/usr/bin/env node
/**
 * Ensures conditional builds do not embed the other rail.
 * Usage: node scripts/verify-tree-shake.mjs ripio|twin
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const provider = (process.argv[2] ?? process.env.RAIL_PROVIDER ?? "").toLowerCase();
if (!["ripio", "twin"].includes(provider)) {
  console.log("[verify:shake] skip (provider not ripio|twin)");
  process.exit(0);
}

const bundle = resolve("packages/rails/dist/index.js");
if (!existsSync(bundle)) {
  console.error(`[verify:shake] missing ${bundle} — build rails first`);
  process.exit(1);
}

const src = readFileSync(bundle, "utf8");

const ripioMarkers = [
  "TreasuryBoxRipioRail",
  "textilecredit.com",
  "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d", // wARS
];
const twinMarkers = [
  "TreasuryBoxTwinRail",
  "0x59863989d080B22476DB95656d0C3CC18be92214", // ARGt
  "0x9Dd3F844747AB78d616BF76DB92756E17A064aDD", // ARGt Prime
];

function present(markers) {
  return markers.filter((m) => src.includes(m));
}

if (provider === "ripio") {
  const bad = present(twinMarkers);
  const good = present(ripioMarkers);
  if (bad.length) {
    console.error("[verify:shake] ripio build still contains twin markers:", bad);
    process.exit(1);
  }
  if (!good.length) {
    console.error("[verify:shake] ripio build missing expected ripio markers");
    process.exit(1);
  }
  console.log("[verify:shake] ripio OK — twin excluded, ripio present:", good);
}

if (provider === "twin") {
  const bad = present(ripioMarkers);
  const good = present(twinMarkers);
  if (bad.length) {
    console.error("[verify:shake] twin build still contains ripio markers:", bad);
    process.exit(1);
  }
  if (!good.length) {
    console.error("[verify:shake] twin build missing expected twin markers");
    process.exit(1);
  }
  console.log("[verify:shake] twin OK — ripio excluded, twin present:", good);
}
