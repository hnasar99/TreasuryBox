import type { Address, Chain, Hex } from "viem";

/** Fiat currencies the merchant thinks in. */
export type FiatCurrency = "ARS" | "BRL" | "MXN" | "COP" | "PEN" | "CLP" | "BOB" | "CLH" | "COL" | "MEX" | "PER";

export type RailId = "ripio" | "twin";

export type TokenSymbol =
  | "wARS"
  | "wBRL"
  | "wMXN"
  | "wCOP"
  | "wPEN"
  | "wCLP"
  | "USDT"
  | "ARGt"
  | "BRAt"
  | "BOLt"
  | "CHLt"
  | "COLt"
  | "MEXt"
  | "PERt";

export interface RailToken {
  symbol: TokenSymbol;
  address: Address;
  decimals: number;
  /** Fiat this token tracks, if any. */
  fiat?: FiatCurrency;
}

export interface BalanceRow {
  symbol: TokenSymbol;
  address: Address;
  decimals: number;
  raw: bigint;
  /** Human amount as string to keep JSON-safe. */
  formatted: string;
}

export interface FxQuote {
  id: string;
  rail: RailId;
  venue: "textile" | "uniswap" | "twin-stub" | "route";
  from: TokenSymbol;
  to: TokenSymbol;
  amountIn: string;
  amountOut: string;
  /** Effective rate to/from (human). */
  rate: string;
  expiresAt?: number;
  /** Opaque payload needed by execute(). */
  payload: unknown;
  /** Intermediate hops when routing (e.g. wARS→USDT→wBRL). */
  route?: TokenSymbol[];
  dryRun: boolean;
}

export interface ExecuteResult {
  ok: boolean;
  dryRun: boolean;
  txHashes: Hex[];
  amountOut?: string;
  message: string;
}

export type RampDirection = "on" | "off";

export interface PaymentRequest {
  amount: string;
  currency: FiatCurrency;
  token: TokenSymbol;
  /** x402 / deep-link URL the payer opens. */
  url: string;
  /** Payload suitable for QR encoding (usually the same URL). */
  qrPayload: string;
  expiresAt?: number;
}

export interface LocalStableRail {
  readonly id: RailId;
  readonly chain: Chain;
  readonly tokens: readonly RailToken[];

  getBalances(address: Address): Promise<BalanceRow[]>;

  quote(from: TokenSymbol, to: TokenSymbol, amount: string): Promise<FxQuote>;

  execute(quote: FxQuote): Promise<ExecuteResult>;

  paymentRequest(amount: string, currency?: FiatCurrency): Promise<PaymentRequest>;

  rampUrl(direction: RampDirection, amount: string, address: Address, token?: TokenSymbol): string;
}

export type RailProvider = "ripio" | "twin" | "full";
