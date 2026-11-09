import type { Address, Chain } from "viem";
import { arbitrum } from "viem/chains";
import { erc20Abi, erc4626Abi } from "../abi/erc20.js";
import { tokenForCurrency } from "../currency-map.js";
import { isDryRun, toHuman } from "../format.js";
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
import { createArbitrumPublicClient, createOptionalAccount } from "../wallet.js";
import { ARGT_PRIME_VAULT, TWIN_RAIL_MARKER, TWIN_TOKENS } from "./tokens.js";

void TWIN_RAIL_MARKER;

function configuredTokens(): RailToken[] {
  return TWIN_TOKENS.filter(
    (t) => t.address !== "0x0000000000000000000000000000000000000000",
  );
}

/**
 * Twin rail on Arbitrum One.
 * FX is a stub — concrete venue lands the day of HackaTwin.
 */
export class TwinRail implements LocalStableRail {
  readonly id = "twin" as const;
  readonly chain: Chain = arbitrum;
  readonly tokens = TWIN_TOKENS;

  private publicClient = createArbitrumPublicClient();

  async getBalances(address: Address): Promise<BalanceRow[]> {
    const rows: BalanceRow[] = [];
    for (const t of configuredTokens()) {
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

    // Surface ARGt Prime vault shares as savings position
    try {
      const shares = await this.publicClient.readContract({
        address: ARGT_PRIME_VAULT,
        abi: erc4626Abi,
        functionName: "balanceOf",
        args: [address],
      });
      if (shares > 0n) {
        const assets = await this.publicClient.readContract({
          address: ARGT_PRIME_VAULT,
          abi: erc4626Abi,
          functionName: "convertToAssets",
          args: [shares],
        });
        rows.push({
          symbol: "ARGt",
          address: ARGT_PRIME_VAULT,
          decimals: 18,
          raw: assets,
          formatted: `${toHuman(assets, 18)} (Prime vault)`,
        });
      }
    } catch {
      /* vault optional */
    }

    return rows;
  }

  /**
   * FX stub — returns a non-executable placeholder quote.
   * Replace with Twin venue the day of the event.
   */
  async quote(from: TokenSymbol, to: TokenSymbol, amount: string): Promise<FxQuote> {
    return {
      id: `twin-stub-${Date.now()}`,
      rail: "twin",
      venue: "twin-stub",
      from,
      to,
      amountIn: amount,
      amountOut: "0",
      rate: "0",
      payload: {
        kind: "twin-stub",
        note: "Twin FX venue TBD at HackaTwin — interface ready",
      },
      dryRun: true,
    };
  }

  async execute(quote: FxQuote): Promise<ExecuteResult> {
    return {
      ok: true,
      dryRun: true,
      txHashes: [],
      message: `Twin FX stub: would execute ${quote.amountIn} ${quote.from}→${quote.to} (venue not wired yet). Mode=${isDryRun() ? "dry-run" : "live"}.`,
    };
  }

  async paymentRequest(amount: string, currency: FiatCurrency = "ARS"): Promise<PaymentRequest> {
    const token = tokenForCurrency(currency, "twin") ?? "ARGt";
    const account = createOptionalAccount();
    const payTo =
      (process.env.TREASURY_ADDRESS as Address | undefined) ??
      account?.address ??
      ("0x0000000000000000000000000000000000000000" as Address);
    const publicBase = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    const url = `${publicBase}/pay?rail=twin&token=${token}&amount=${encodeURIComponent(amount)}&to=${payTo}`;
    return {
      amount,
      currency,
      token,
      url,
      qrPayload: url,
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
  }

  rampUrl(
    _direction: RampDirection,
    amount: string,
    address: Address,
    token: TokenSymbol = "ARGt",
  ): string {
    // Twin ramp URL TBD — keep a discoverable placeholder.
    const publicBase = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    return `${publicBase}/ramp/twin?token=${token}&amount=${encodeURIComponent(amount)}&address=${address}`;
  }
}
