import { envAddress } from "../currency-map.js";
import type { RailToken } from "../types.js";

/**
 * Twin stablecoins on Arbitrum One (18 decimals).
 * ARGt / BRAt confirmed; BOLt, CHLt, COLt, MEXt, PERt via env until confirmed at the event.
 */
export const TWIN_TOKENS: readonly RailToken[] = [
  {
    symbol: "ARGt",
    address: envAddress("ARGT", "0x59863989d080B22476DB95656d0C3CC18be92214"),
    decimals: 18,
    fiat: "ARS",
  },
  {
    symbol: "BRAt",
    address: envAddress("BRAT", "0xC4ed6Aba5373D78E160F4df39e011F078Be54df8"),
    decimals: 18,
    fiat: "BRL",
  },
  {
    symbol: "BOLt",
    address: envAddress("BOLT", "0x0000000000000000000000000000000000000000"),
    decimals: 18,
    fiat: "BOB",
  },
  {
    symbol: "CHLt",
    address: envAddress("CHLT", "0x0000000000000000000000000000000000000000"),
    decimals: 18,
    fiat: "CLP",
  },
  {
    symbol: "COLt",
    address: envAddress("COLT", "0x0000000000000000000000000000000000000000"),
    decimals: 18,
    fiat: "COP",
  },
  {
    symbol: "MEXt",
    address: envAddress("MEXT", "0x0000000000000000000000000000000000000000"),
    decimals: 18,
    fiat: "MXN",
  },
  {
    symbol: "PERt",
    address: envAddress("PERT", "0x0000000000000000000000000000000000000000"),
    decimals: 18,
    fiat: "PEN",
  },
] as const;

/** ARGt Prime ERC-4626 vault — savings option. */
export const ARGT_PRIME_VAULT = envAddress(
  "ARGT_PRIME_VAULT",
  "0x9Dd3F844747AB78d616BF76DB92756E17A064aDD",
);

/** Marker string kept in twin builds for tree-shake verification. */
export const TWIN_RAIL_MARKER = "TreasuryBoxTwinRail";
