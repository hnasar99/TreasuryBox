import { createOptionalAccount, tokenForCurrency } from "@treasurybox/rails";
import type { LocalStableRail } from "@treasurybox/rails";
import {
  assertWithinLiquidityFloor,
  homeCurrency,
  isDryRun,
  scheduledBufferAmount,
} from "./guards.js";
import { resolveToken } from "./rails.js";
import { listScheduledPayments } from "./scheduled.js";

export async function assertRebalanceRespectsFloor(
  rail: LocalStableRail,
  from: string,
  amount: number,
): Promise<{ buffer: number; homeBalance: number; rotable: number; skipped: boolean }> {
  const home = homeCurrency();
  const fromToken = resolveToken(from, rail);
  const homeTok = tokenForCurrency(home as "ARS", rail.id);
  if (!homeTok || fromToken !== homeTok) {
    return { buffer: 0, homeBalance: 0, rotable: amount, skipped: true };
  }

  const account = createOptionalAccount();
  const addr = (process.env.TREASURY_ADDRESS ||
    account?.address ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;
  const balances = await rail.getBalances(addr);
  const row = balances.find((b) => b.symbol === homeTok);
  const homeBalance = Number(row?.formatted ?? "0");
  const payments = await listScheduledPayments();
  const buffer = scheduledBufferAmount(payments);
  const rotable = Math.max(0, homeBalance - buffer);

  if (isDryRun() && homeBalance === 0 && buffer === 0) {
    return { buffer, homeBalance, rotable, skipped: true };
  }

  assertWithinLiquidityFloor(amount, homeBalance, buffer, home);
  return { buffer, homeBalance, rotable, skipped: false };
}
