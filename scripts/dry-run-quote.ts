/**
 * Dry-run demo: quote wARS → USDT on Textile and print the decision.
 * Never broadcasts.
 */
import { RipioRail } from "../packages/rails/src/ripio/rail.js";

async function main() {
  process.env.TREASURY_MODE = "dry-run";
  const amount = process.argv[2] ?? "1000";
  const rail = new RipioRail();

  console.log(`DRY-RUN quote: ${amount} wARS → USDT (Textile / Uniswap fallback)`);
  const quote = await rail.quote("wARS", "USDT", amount);
  const decision = await rail.execute(quote);

  console.log(
    JSON.stringify(
      {
        decision: decision.message,
        quote: {
          id: quote.id,
          venue: quote.venue,
          from: quote.from,
          to: quote.to,
          amountIn: quote.amountIn,
          amountOut: quote.amountOut,
          rate: quote.rate,
          route: quote.route,
          dryRun: quote.dryRun,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
