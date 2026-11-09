/**
 * Ripio-only entry — TwinRail must NOT appear in the compiled bundle.
 */
import { CURRENCY_TO_TOKEN, currencyForToken, tokenForCurrency } from "./currency-map.js";
import { isDryRun } from "./format.js";
import { RipioRail, quoteExecutionBlock } from "./ripio/index.js";
import { getRailsForProvider, pickBestQuote } from "./select.js";
import type { LocalStableRail, RailProvider } from "./types.js";
import {
  attributionCodes,
  createAttributedCeloWallet,
  createCeloPublicClient,
  createOptionalAccount,
  fromDataSuffix,
  toDataSuffix,
  codeFromRepo,
  LOOPS_ATTRIBUTION_TAG,
  issuedAttributionCode,
  requireLoopsAttributionForLive,
} from "./wallet.js";

export type * from "./types.js";
export {
  CURRENCY_TO_TOKEN,
  currencyForToken,
  tokenForCurrency,
  isDryRun,
  RipioRail,
  quoteExecutionBlock,
  pickBestQuote,
  attributionCodes,
  createAttributedCeloWallet,
  createCeloPublicClient,
  createOptionalAccount,
  fromDataSuffix,
  toDataSuffix,
  codeFromRepo,
  LOOPS_ATTRIBUTION_TAG,
  issuedAttributionCode,
  requireLoopsAttributionForLive,
};

export const RAIL_PROVIDER: RailProvider = "ripio";
export const BUILT_RAILS = ["ripio"] as const;
/** Keep marker in bundle for verify-tree-shake. */
export const RAIL_BUILD_MARKER = "TreasuryBoxRipioRail" as const;

export function createRails(): LocalStableRail[] {
  return getRailsForProvider("ripio", {
    ripio: () => new RipioRail(),
  });
}

export function createDefaultRail(): LocalStableRail {
  return new RipioRail();
}
