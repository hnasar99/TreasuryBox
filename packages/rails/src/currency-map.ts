import type { FiatCurrency, RailId, TokenSymbol } from "./types.js";

/** Central fiat → token mapping per rail. */
export const CURRENCY_TO_TOKEN: Record<
  RailId,
  Partial<Record<FiatCurrency, TokenSymbol>>
> = {
  ripio: {
    ARS: "wARS",
    BRL: "wBRL",
    MXN: "wMXN",
    COP: "wCOP",
    PEN: "wPEN",
    CLP: "wCLP",
  },
  twin: {
    ARS: "ARGt",
    BRL: "BRAt",
    BOB: "BOLt",
    CLH: "CHLt",
    COL: "COLt",
    MEX: "MEXt",
    PER: "PERt",
    // aliases used by merchants
    CLP: "CHLt",
    COP: "COLt",
    MXN: "MEXt",
    PEN: "PERt",
  },
};

export function tokenForCurrency(
  currency: FiatCurrency,
  rail: RailId,
): TokenSymbol | undefined {
  return CURRENCY_TO_TOKEN[rail][currency];
}

export function currencyForToken(symbol: TokenSymbol): FiatCurrency | undefined {
  for (const rail of Object.keys(CURRENCY_TO_TOKEN) as RailId[]) {
    const map = CURRENCY_TO_TOKEN[rail];
    for (const [fiat, tok] of Object.entries(map) as [FiatCurrency, TokenSymbol][]) {
      if (tok === symbol) return fiat;
    }
  }
  return undefined;
}

/** Resolve RAIL_{SYMBOL}_ADDRESS env override. */
export function envAddress(symbol: string, fallback: `0x${string}`): `0x${string}` {
  const key = `RAIL_${symbol.toUpperCase()}_ADDRESS`;
  const v = process.env[key];
  if (v && /^0x[a-fA-F0-9]{40}$/.test(v)) return v as `0x${string}`;
  return fallback;
}
