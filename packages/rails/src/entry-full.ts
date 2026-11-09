/**
 * Full entry — both rails available; agent picks per operation.
 */
import { CURRENCY_TO_TOKEN, currencyForToken, tokenForCurrency } from "./currency-map.js";
import { isDryRun } from "./format.js";
import { RipioRail, quoteExecutionBlock } from "./ripio/index.js";
import { getRailsForProvider, pickBestQuote } from "./select.js";
import { TwinRail } from "./twin/index.js";
import type { LocalStableRail, RailProvider } from "./types.js";
import {
  attributionCodes,
  createAttributedCeloWallet,
  createArbitrumPublicClient,
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
  TwinRail,
  pickBestQuote,
  attributionCodes,
  createAttributedCeloWallet,
  createArbitrumPublicClient,
  createCeloPublicClient,
  createOptionalAccount,
  fromDataSuffix,
  toDataSuffix,
  codeFromRepo,
  LOOPS_ATTRIBUTION_TAG,
  issuedAttributionCode,
  requireLoopsAttributionForLive,
};

export const RAIL_PROVIDER: RailProvider = "full";
export const BUILT_RAILS = ["ripio", "twin"] as const;
export const RAIL_BUILD_MARKER = "TreasuryBoxFullRails" as const;

export function createRails(): LocalStableRail[] {
  return getRailsForProvider("full", {
    ripio: () => new RipioRail(),
    twin: () => new TwinRail(),
  });
}

export function createDefaultRail(): LocalStableRail {
  const pref = (process.env.RAIL_PROVIDER ?? "ripio").toLowerCase();
  if (pref === "twin") return new TwinRail();
  return new RipioRail();
}
