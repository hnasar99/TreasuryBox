import type { FxQuote, LocalStableRail, TokenSymbol } from "./types.js";

/**
 * In `full` builds the agent picks the cheapest / most convenient rail per op.
 * Compares amountOut (higher wins) then prefers non-stub venues.
 */
export async function pickBestQuote(
  rails: LocalStableRail[],
  fromByRail: Partial<Record<LocalStableRail["id"], TokenSymbol>>,
  toByRail: Partial<Record<LocalStableRail["id"], TokenSymbol>>,
  amount: string,
): Promise<{ rail: LocalStableRail; quote: FxQuote } | null> {
  const results: { rail: LocalStableRail; quote: FxQuote }[] = [];

  for (const rail of rails) {
    const from = fromByRail[rail.id];
    const to = toByRail[rail.id];
    if (!from || !to) continue;
    try {
      const quote = await rail.quote(from, to, amount);
      results.push({ rail, quote });
    } catch {
      /* skip unavailable */
    }
  }

  if (!results.length) return null;

  results.sort((a, b) => {
    const ao = Number(a.quote.amountOut);
    const bo = Number(b.quote.amountOut);
    if (bo !== ao) return bo - ao;
    const score = (q: FxQuote) =>
      q.venue === "twin-stub" ? 0 : q.venue === "uniswap" ? 1 : 2;
    return score(b.quote) - score(a.quote);
  });

  return results[0]!;
}

export function getRailsForProvider(
  provider: string,
  factories: {
    ripio?: () => LocalStableRail;
    twin?: () => LocalStableRail;
  },
): LocalStableRail[] {
  const p = provider.toLowerCase();
  if (p === "ripio" && factories.ripio) return [factories.ripio()];
  if (p === "twin" && factories.twin) return [factories.twin()];
  const out: LocalStableRail[] = [];
  if (factories.ripio) out.push(factories.ripio());
  if (factories.twin) out.push(factories.twin());
  return out;
}
