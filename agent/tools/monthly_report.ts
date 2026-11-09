import { defineTool } from "eve/tools";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { auditLog, homeCurrency, isDryRun } from "../lib/guards.js";

function inflationMonthly(): number {
  return Number(process.env.INFLATION_MONTHLY_PCT ?? "2.5");
}

export default defineTool({
  description:
    "Arma el P&L del mes vs dejar todo en moneda local y vs inflación configurable.",
  inputSchema: z.object({
    startingBalance: z
      .string()
      .describe("Saldo al inicio del mes en moneda local (humano)"),
    endingBalanceLocal: z
      .string()
      .describe("Valor actual de la tesorería convertido a moneda local"),
    month: z.string().optional().describe("YYYY-MM; default mes corriente"),
  }),
  async execute({ startingBalance, endingBalanceLocal, month }) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    const start = Number(startingBalance);
    const end = Number(endingBalanceLocal);
    const infl = inflationMonthly() / 100;
    const holdLocal = start; // sin rotar, el nominal en local se mantiene
    const vsHold = end - holdLocal;
    const realVsInflation = end - start * (1 + infl);
    const home = homeCurrency();

    let decisions = 0;
    try {
      const text = await readFile(join(process.cwd(), "data", "decisions.jsonl"), "utf8");
      decisions = text
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as { at: string })
        .filter((d) => d.at.startsWith(m)).length;
    } catch {
      /* empty */
    }

    const report = {
      month: m,
      homeCurrency: home,
      startingBalance: start,
      endingBalanceLocal: end,
      vsHoldLocal: vsHold,
      inflationMonthlyPct: inflationMonthly(),
      realVsInflation,
      decisions,
      narrative:
        vsHold >= 0
          ? `Este mes la tesorería quedó ${vsHold.toFixed(2)} ${home} mejor que haber dejado todo en ${home}. Contra inflación (~${inflationMonthly()}%/mes) el resultado real es ${realVsInflation.toFixed(2)} ${home}.`
          : `Este mes quedó ${Math.abs(vsHold).toFixed(2)} ${home} por debajo de haber dejado todo en ${home}. Contra inflación el resultado real es ${realVsInflation.toFixed(2)} ${home}.`,
    };

    await auditLog({
      at: new Date().toISOString(),
      action: "monthly_report",
      dryRun: isDryRun(),
      reason: report.narrative,
      details: report,
    });

    return report;
  },
});
