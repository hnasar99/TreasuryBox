import type { Address } from "viem";
import type { FiatCurrency, PaymentRequest, TokenSymbol } from "../types.js";

/**
 * Builds a checkout URL. This does not call the x402 facilitator or settle a payment.
 */
export function buildX402PaymentRequest(args: {
  amount: string;
  currency: FiatCurrency;
  token: TokenSymbol;
  payTo: Address;
}): PaymentRequest {
  const base = (process.env.X402_FACILITATOR_URL ?? "https://api.x402.celo.org").replace(
    /\/$/,
    "",
  );
  const publicBase = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const expiresAt = Date.now() + 30 * 60 * 1000;

  // Panel-hosted checkout that the merchant shares; facilitator settles on-chain.
  const url = `${publicBase}/pay?token=${args.token}&amount=${encodeURIComponent(args.amount)}&to=${args.payTo}&facilitator=${encodeURIComponent(base)}&exp=${expiresAt}`;

  return {
    amount: args.amount,
    currency: args.currency,
    token: args.token,
    url,
    qrPayload: url,
    expiresAt,
  };
}

export function ripioRampUrl(args: {
  direction: "on" | "off";
  amount: string;
  address: Address;
  token: TokenSymbol;
  country?: string;
}): string {
  const base = (process.env.RIPIO_RAMP_BASE ?? "https://ramp.ripio.com").replace(/\/$/, "");
  const country = args.country ?? process.env.RIPIO_RAMP_COUNTRY ?? "AR";
  const path = args.direction === "off" ? "/offramp" : "/";
  const q = new URLSearchParams({
    country,
    chain: "42220",
    token: args.token.toUpperCase(),
    amount: args.amount,
    address: args.address,
  });
  return `${base}${path}?${q.toString()}`;
}
