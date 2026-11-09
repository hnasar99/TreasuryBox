import type { Address, Chain, Hex } from "viem";
import { celo } from "viem/chains";
import { erc20Abi } from "../abi/erc20.js";
import { currencyForToken, tokenForCurrency } from "../currency-map.js";
import { isDryRun, toHuman, toRaw } from "../format.js";
import type {
  BalanceRow,
  ExecuteResult,
  FiatCurrency,
  FxQuote,
  LocalStableRail,
  PaymentRequest,
  RampDirection,
  RailToken,
  TokenSymbol,
} from "../types.js";
import {
  createAttributedCeloWallet,
  createCeloPublicClient,
  createOptionalAccount,
  createQuoteAccount,
} from "../wallet.js";
import {
  textileExecuteSwap,
  textilePreview,
  textileRequest,
  type TextileQuoteData,
} from "./textile.js";
import { quoteExecutionBlock } from "./executable.js";
import { buildX402PaymentRequest, ripioRampUrl } from "./x402.js";
import { RIPIO_RAIL_MARKER, RIPIO_TOKENS } from "./tokens.js";

void RIPIO_RAIL_MARKER;

type TextilePayload = {
  kind: "textile";
  sellToken: Address;
  buyToken: Address;
  data: TextileQuoteData;
};

type RoutePayload = {
  kind: "route";
  legs: FxQuote[];
};

type UniswapPayload = {
  kind: "uniswap";
  sell: Address;
  buy: Address;
  amountIn: string;
  minOut: string;
};

function tokenBySymbol(symbol: TokenSymbol): RailToken {
  const t = RIPIO_TOKENS.find((x) => x.symbol === symbol);
  if (!t) throw new Error(`RipioRail: unknown token ${symbol}`);
  return t;
}

function needsUsdtBridge(from: TokenSymbol, to: TokenSymbol): boolean {
  if (from === to) return false;
  if (from === "USDT" || to === "USDT") return false;
  // No direct local↔local corridor on Textile — route via USDT.
  return true;
}

export class RipioRail implements LocalStableRail {
  readonly id = "ripio" as const;
  readonly chain: Chain = celo;
  readonly tokens = RIPIO_TOKENS;

  private publicClient = createCeloPublicClient();

  async getBalances(address: Address): Promise<BalanceRow[]> {
    const rows: BalanceRow[] = [];
    for (const t of this.tokens) {
      try {
        const raw = await this.publicClient.readContract({
          address: t.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        });
        rows.push({
          symbol: t.symbol,
          address: t.address,
          decimals: t.decimals,
          raw,
          formatted: toHuman(raw, t.decimals),
        });
      } catch {
        rows.push({
          symbol: t.symbol,
          address: t.address,
          decimals: t.decimals,
          raw: 0n,
          formatted: "0",
        });
      }
    }
    return rows;
  }

  async quote(from: TokenSymbol, to: TokenSymbol, amount: string): Promise<FxQuote> {
    if (from === to) {
      return {
        id: `noop-${Date.now()}`,
        rail: "ripio",
        venue: "textile",
        from,
        to,
        amountIn: amount,
        amountOut: amount,
        rate: "1",
        payload: null,
        dryRun: isDryRun(),
      };
    }

    if (needsUsdtBridge(from, to)) {
      const leg1 = await this.quoteDirect(from, "USDT", amount);
      const leg2 = await this.quoteDirect("USDT", to, leg1.amountOut);
      const rate =
        Number(amount) > 0 ? (Number(leg2.amountOut) / Number(amount)).toFixed(8) : "0";
      return {
        id: `route-${leg1.id}-${leg2.id}`,
        rail: "ripio",
        venue: "route",
        from,
        to,
        amountIn: amount,
        amountOut: leg2.amountOut,
        rate,
        route: [from, "USDT", to],
        payload: { kind: "route", legs: [leg1, leg2] } satisfies RoutePayload,
        dryRun: isDryRun(),
      };
    }

    return this.quoteDirect(from, to, amount);
  }

  private async quoteDirect(
    from: TokenSymbol,
    to: TokenSymbol,
    amount: string,
  ): Promise<FxQuote> {
    const sell = tokenBySymbol(from);
    const buy = tokenBySymbol(to);
    const sellAmount = toRaw(amount, sell.decimals);
    const account = createQuoteAccount();
    const dryRun = isDryRun();

    try {
      if (dryRun) {
        // Preview is indicative and does not require sell-token balance.
        const preview = await textilePreview({
          account,
          sellToken: sell.address,
          buyToken: buy.address,
          sellAmount,
        });
        const amountOut = toHuman(BigInt(preview.buyAmount), buy.decimals);
        const rate =
          Number(amount) > 0 ? (Number(amountOut) / Number(amount)).toFixed(8) : "0";
        return {
          id: `textile-preview-${Date.now()}`,
          rail: "ripio",
          venue: "textile",
          from,
          to,
          amountIn: amount,
          amountOut,
          rate,
          expiresAt: Date.now() + 60_000,
          payload: {
            kind: "textile-preview",
            sellToken: sell.address,
            buyToken: buy.address,
            preview,
          },
          dryRun: true,
        };
      }

      const data = await textileRequest({
        account,
        sellToken: sell.address,
        buyToken: buy.address,
        sellAmount,
      });

      const amountOut = toHuman(BigInt(data.quote.buyAmount), buy.decimals);
      const rate =
        Number(amount) > 0 ? (Number(amountOut) / Number(amount)).toFixed(8) : "0";
      const exp = Number(data.quote.expiresAt);
      return {
        id: data.rfqId,
        rail: "ripio",
        venue: "textile",
        from,
        to,
        amountIn: amount,
        amountOut,
        rate,
        expiresAt: exp < 1e12 ? exp * 1000 : exp,
        payload: {
          kind: "textile",
          sellToken: sell.address,
          buyToken: buy.address,
          data,
        } satisfies TextilePayload,
        dryRun,
      };
    } catch {
      // Uniswap fallback quote (indicative — minOut=0 until live)
      return {
        id: `uni-fallback-${Date.now()}`,
        rail: "ripio",
        venue: "uniswap",
        from,
        to,
        amountIn: amount,
        amountOut: "0",
        rate: "0",
        payload: {
          kind: "uniswap",
          sell: sell.address,
          buy: buy.address,
          amountIn: sellAmount.toString(),
          minOut: "0",
        } satisfies UniswapPayload,
        dryRun,
        route: undefined,
      };
    }
  }

  async execute(quote: FxQuote): Promise<ExecuteResult> {
    const blocked = quoteExecutionBlock(quote);
    if (blocked) {
      return {
        ok: false,
        dryRun: quote.dryRun || isDryRun(),
        txHashes: [],
        message: blocked,
      };
    }

    if (quote.dryRun || isDryRun()) {
      return {
        ok: true,
        dryRun: true,
        txHashes: [],
        amountOut: quote.amountOut,
        message: `DRY-RUN: no tx broadcast. Would swap ${quote.amountIn} ${quote.from} → ~${quote.amountOut} ${quote.to} via ${quote.venue}${quote.route ? ` (${quote.route.join("→")})` : ""}.`,
      };
    }

    const account = createOptionalAccount();
    if (!account) throw new Error("AGENT_PRIVATE_KEY required for live execute");
    const wallet = createAttributedCeloWallet(account);
    const hashes: Hex[] = [];

    const payload = quote.payload as TextilePayload | RoutePayload | UniswapPayload | null;
    if (!payload) {
      return { ok: false, dryRun: false, txHashes: [], message: "Quote has no executable payload" };
    }

    if (payload.kind === "route") {
      for (const leg of payload.legs) {
        const r = await this.execute({ ...leg, dryRun: false });
        hashes.push(...r.txHashes);
        if (!r.ok) return { ...r, txHashes: hashes };
      }
      return {
        ok: true,
        dryRun: false,
        txHashes: hashes,
        amountOut: quote.amountOut,
        message: `Routed ${quote.from}→${quote.to} in ${payload.legs.length} legs`,
      };
    }

    if (payload.kind === "textile") {
      const tx = await textileExecuteSwap({
        publicClient: this.publicClient,
        wallet,
        account,
        sellToken: payload.sellToken,
        quote: payload.data,
      });
      hashes.push(tx);
      return {
        ok: true,
        dryRun: false,
        txHashes: hashes,
        amountOut: quote.amountOut,
        message: `Textile swap ${quote.from}→${quote.to} tx=${tx}`,
      };
    }

    return { ok: false, dryRun: false, txHashes: [], message: "Unknown payload kind" };
  }

  async paymentRequest(amount: string, currency: FiatCurrency = "ARS"): Promise<PaymentRequest> {
    const token = tokenForCurrency(currency, "ripio");
    if (!token) throw new Error(`No Ripio token for ${currency}`);
    const account = createOptionalAccount();
    const payTo =
      (process.env.TREASURY_ADDRESS as Address | undefined) ??
      account?.address ??
      ("0x0000000000000000000000000000000000000000" as Address);
    return buildX402PaymentRequest({ amount, currency, token, payTo });
  }

  rampUrl(
    direction: RampDirection,
    amount: string,
    address: Address,
    token: TokenSymbol = "wARS",
  ): string {
    return ripioRampUrl({ direction, amount, address, token });
  }
}

export function homeToken(currency: FiatCurrency = "ARS"): TokenSymbol {
  return tokenForCurrency(currency, "ripio") ?? "wARS";
}

export { currencyForToken };
