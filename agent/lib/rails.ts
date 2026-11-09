import {
  createRails,
  createDefaultRail,
  tokenForCurrency,
  pickBestQuote,
  type FiatCurrency,
  type LocalStableRail,
  type TokenSymbol,
} from "@treasurybox/rails";
import { homeCurrency } from "./guards.js";

let cached: LocalStableRail[] | null = null;

export function rails(): LocalStableRail[] {
  if (!cached) cached = createRails();
  return cached;
}

export function primaryRail(): LocalStableRail {
  return createDefaultRail();
}

export function resolveToken(symbolOrFiat: string, rail: LocalStableRail): TokenSymbol {
  const upper = symbolOrFiat.toUpperCase();
  const asFiat = tokenForCurrency(upper as FiatCurrency, rail.id);
  if (asFiat) return asFiat;
  const hit = rail.tokens.find((t) => t.symbol.toUpperCase() === upper);
  if (hit) return hit.symbol;
  throw new Error(`Token/moneda desconocida: ${symbolOrFiat} en riel ${rail.id}`);
}

export function homeTokenOn(rail: LocalStableRail): TokenSymbol {
  return resolveToken(homeCurrency(), rail);
}

export { pickBestQuote, tokenForCurrency };
