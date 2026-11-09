import { defineTool } from "eve/tools";
import { z } from "zod";
import { primaryRail, rails, resolveToken, pickBestQuote } from "../lib/rails.js";
import { assertRebalanceRespectsFloor } from "../lib/floor.js";
import {
  assertWithinDailyLimit,
  assertWithinOpLimit,
  auditLog,
  isDryRun,
  recordDailySpend,
} from "../lib/guards.js";

export default defineTool({
  description:
    "Ejecuta una rotación de tesorería (cotiza + execute). En dry-run solo registra la decisión.",
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    amount: z.string(),
    reason: z.string().describe("Motivo en lenguaje simple para el comercio"),
  }),
  async execute({ from, to, amount, reason }) {
    const numeric = Number(amount);
    assertWithinOpLimit(numeric);
    assertWithinDailyLimit(numeric);

    const active = rails();
    let quote;
    let rail = primaryRail();

    if (active.length > 1) {
      const fromByRail: Record<string, string> = {};
      const toByRail: Record<string, string> = {};
      for (const r of active) {
        try {
          fromByRail[r.id] = resolveToken(from, r);
          toByRail[r.id] = resolveToken(to, r);
        } catch {
          /* skip */
        }
      }
      const best = await pickBestQuote(
        active,
        fromByRail as never,
        toByRail as never,
        amount,
      );
      if (!best) throw new Error("Sin cotización para rebalance");
      quote = best.quote;
      rail = best.rail;
    } else {
      quote = await rail.quote(resolveToken(from, rail), resolveToken(to, rail), amount);
    }

    const floor = await assertRebalanceRespectsFloor(rail, from, numeric);
    const result = await rail.execute(quote);
    if (result.ok && !result.dryRun) recordDailySpend(numeric);

    const record = await auditLog({
      at: new Date().toISOString(),
      action: "rebalance",
      amount,
      from: quote.from,
      to: quote.to,
      dryRun: result.dryRun || isDryRun(),
      reason,
      details: { venue: quote.venue, result, floor },
    });

    return { record, quote: { id: quote.id, amountOut: quote.amountOut, venue: quote.venue }, result };
  },
});
