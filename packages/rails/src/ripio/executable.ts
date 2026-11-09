import type { FxQuote } from "../types.js";

type UniswapPayload = { kind: "uniswap"; minOut?: string };
type PreviewPayload = { kind: "textile-preview" };
type TextilePayload = { kind: "textile" };
type RoutePayload = { kind: "route"; legs: FxQuote[] };

type QuotePayload = UniswapPayload | PreviewPayload | TextilePayload | RoutePayload;

/**
 * Live execute must never broadcast Uniswap minOut=0 or a Textile preview.
 * Returns a human-readable block reason, or null when the quote can be sent.
 */
export function quoteExecutionBlock(quote: FxQuote): string | null {
  if (quote.venue === "uniswap") {
    return "Uniswap fallback is not executable (minOut is 0)";
  }
  const payload = quote.payload as QuotePayload | null | undefined;
  if (!payload) return "Quote has no executable payload";
  if (payload.kind === "uniswap") {
    return "Uniswap fallback is not executable (minOut is 0)";
  }
  if ("minOut" in payload && payload.minOut === "0") {
    return "Quote minOut is 0; refusing to send";
  }
  if (payload.kind === "textile-preview") {
    return "Textile preview is not an executable order";
  }
  if (payload.kind === "route") {
    for (const leg of payload.legs) {
      const block = quoteExecutionBlock(leg);
      if (block) return block;
    }
    return null;
  }
  if (payload.kind === "textile") return null;
  return "Quote payload is not executable";
}
