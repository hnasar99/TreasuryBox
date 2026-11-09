import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Agent writes to repo-root data/; panel may run from apps/panel
    const candidates = [
      join(process.cwd(), "data", "decisions.jsonl"),
      join(process.cwd(), "..", "..", "data", "decisions.jsonl"),
    ];
    let text = "";
    for (const p of candidates) {
      try {
        text = await readFile(p, "utf8");
        break;
      } catch {
        /* try next */
      }
    }
    const decisions = text
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .reverse()
      .slice(0, 50);
    return NextResponse.json({ decisions });
  } catch {
    return NextResponse.json({ decisions: [] });
  }
}
