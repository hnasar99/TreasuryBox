import { defineTool } from "eve/tools";
import { z } from "zod";
import { pickBestQuote } from "@treasurybox/rails";
import { rails, resolveToken, primaryRail } from "../lib/rails.js";
import { auditLog, isDryRun } from "../lib/guards.js";

export default defineTool({
  description:
    "Cotiza un swap entre stablecoins (ej. wARS→USDT en Textile). En full, compara rieles.",
  inputSchema: z.object({
    from: z.string().describe("Token o moneda origen, ej. wARS o ARS"),
    to: z.string().describe("Token o moneda destino, ej. USDT o BRL"),
    amount: z.string().describe("Monto humano, ej. '1000'"),
  }),
  async execute({ from, to, amount }) {
    const active = rails();
    let quote;
    let railId;

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
      if (!best) throw new Error("No hay cotización disponible en ningún riel");
      quote = best.quote;
      railId = best.rail.id;
    } else {
      const rail = primaryRail();
      quote = await rail.quote(resolveToken(from, rail), resolveToken(to, rail), amount);
      railId = rail.id;
    }

    await auditLog({
      at: new Date().toISOString(),
      action: "get_quote",
      amount,
      from: quote.from,
      to: quote.to,
      dryRun: isDryRun(),
      reason: `Cotización ${quote.from}→${quote.to} vía ${quote.venue} en riel ${railId}: ${quote.amountOut} (rate ${quote.rate})`,
      details: {
        id: quote.id,
        route: quote.route,
        expiresAt: quote.expiresAt,
      },
    });

    return {
      rail: railId,
      dryRun: isDryRun(),
      quote: {
        id: quote.id,
        venue: quote.venue,
        from: quote.from,
        to: quote.to,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        rate: quote.rate,
        route: quote.route,
        expiresAt: quote.expiresAt,
      },
    };
  },
});
