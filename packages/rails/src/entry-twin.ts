/**
 * Twin-only entry — RipioRail / Textile must NOT appear in the compiled bundle.
 */
import { CURRENCY_TO_TOKEN, currencyForToken, tokenForCurrency } from "./currency-map.js";
import { isDryRun } from "./format.js";
import { getRailsForProvider, pickBestQuote } from "./select.js";
import { TwinRail } from "./twin/index.js";
import type { LocalStableRail, RailProvider } from "./types.js";
import {
  attributionCodes,
  createAttributedCeloWallet,
  createArbitrumPublicClient,
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
  TwinRail,
  pickBestQuote,
  attributionCodes,
  createAttributedCeloWallet,
  createArbitrumPublicClient,
  createOptionalAccount,
  fromDataSuffix,
  toDataSuffix,
  codeFromRepo,
  LOOPS_ATTRIBUTION_TAG,
  issuedAttributionCode,
  requireLoopsAttributionForLive,
};

export const RAIL_PROVIDER: RailProvider = "twin";
export const BUILT_RAILS = ["twin"] as const;
/** Keep marker in bundle for verify-tree-shake. */
export const RAIL_BUILD_MARKER = "TreasuryBoxTwinRail" as const;

export function createRails(): LocalStableRail[] {
  return getRailsForProvider("twin", {
    twin: () => new TwinRail(),
  });
}

export function createDefaultRail(): LocalStableRail {
  return new TwinRail();
}
