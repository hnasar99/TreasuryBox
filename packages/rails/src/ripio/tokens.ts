import { envAddress } from "../currency-map.js";
import type { RailToken } from "../types.js";

/** Ripio wFiat on Celo mainnet (18 decimals). Overridable via RAIL_{SYMBOL}_ADDRESS. */
export const RIPIO_TOKENS: readonly RailToken[] = [
  {
    symbol: "wARS",
    address: envAddress("WARS", "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d"),
    decimals: 18,
    fiat: "ARS",
  },
  {
    symbol: "wBRL",
    address: envAddress("WBRL", "0xd76f5faf6888e24d9f04bf92a0c8b921fe4390e0"),
    decimals: 18,
    fiat: "BRL",
  },
  {
    symbol: "wMXN",
    address: envAddress("WMXN", "0x337e7456b420bd3481e7fa61fa9850343d610d34"),
    decimals: 18,
    fiat: "MXN",
  },
  {
    symbol: "wCOP",
    address: envAddress("WCOP", "0x8a1d45e102e886510e891d2ec656a708991e2d76"),
    decimals: 18,
    fiat: "COP",
  },
  {
    symbol: "wPEN",
    address: envAddress("WPEN", "0x4F34c8b3b5FB6D98Da888F0feA543d4d9C9F2eBE"),
    decimals: 18,
    fiat: "PEN",
  },
  {
    symbol: "wCLP",
    address: envAddress("WCLP", "0x61D450a098b6a7f69fC4b98CE68198fe59768651"),
    decimals: 18,
    fiat: "CLP",
  },
  {
    symbol: "USDT",
    address: envAddress("USDT", "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"),
    decimals: 6,
  },
] as const;

export const TEXTILE_REACTOR = envAddress(
  "TEXTILE_LIMIT_ORDER_REACTOR",
  "0xa9AA0a64769cBed4d3B1Ceb4Df01CdE915C235b3",
) as `0x${string}`;

/** Marker string kept in ripio builds for tree-shake verification. */
export const RIPIO_RAIL_MARKER = "TreasuryBoxRipioRail";
