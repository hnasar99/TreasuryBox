import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ScheduledPaymentRow } from "./scheduled.js";

export function maxOpAmount(): number {
  return Number(process.env.MAX_OP_AMOUNT ?? "100000");
}

export function maxDailyAmount(): number {
  return Number(process.env.MAX_DAILY_AMOUNT ?? "500000");
}

export function liquidityBufferDays(): number {
  return Number(process.env.LIQUIDITY_BUFFER_DAYS ?? "7");
}

export function homeCurrency(): string {
  return (process.env.HOME_CURRENCY ?? "ARS").toUpperCase();
}

export function assertWithinOpLimit(amount: number): void {
  const max = maxOpAmount();
  if (amount > max) {
    throw new Error(`Monto ${amount} supera MAX_OP_AMOUNT=${max}`);
  }
}

/** In-memory daily tally (process lifetime). Persisted to audit log. */
const dailySpent = new Map<string, number>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function assertWithinDailyLimit(amount: number): void {
  const key = todayKey();
  const used = dailySpent.get(key) ?? 0;
  const max = maxDailyAmount();
  if (used + amount > max) {
    throw new Error(`Tope diario: ya van ${used}, +${amount} supera MAX_DAILY_AMOUNT=${max}`);
  }
}

export function recordDailySpend(amount: number): void {
  const key = todayKey();
  dailySpent.set(key, (dailySpent.get(key) ?? 0) + amount);
}

/** Calendar day in America/Argentina/Buenos_Aires as fixed UTC-3. */
export function artDayKey(now = new Date()): string {
  const art = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const y = art.getUTCFullYear();
  const m = String(art.getUTCMonth() + 1).padStart(2, "0");
  const d = String(art.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function scheduledBufferAmount(
  payments: Pick<ScheduledPaymentRow, "dueDate" | "amount" | "currency" | "status">[],
  opts?: { now?: Date; bufferDays?: number; homeCurrency?: string },
): number {
  const home = (opts?.homeCurrency ?? homeCurrency()).toUpperCase();
  const days = opts?.bufferDays ?? liquidityBufferDays();
  const today = artDayKey(opts?.now);
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const horizon = new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  let sum = 0;
  for (const payment of payments) {
    if ((payment.currency ?? "").toUpperCase() !== home) continue;
    if (payment.status && payment.status !== "scheduled") continue;
    if (payment.dueDate <= horizon) sum += Number(payment.amount);
  }
  return sum;
}

export function assertWithinLiquidityFloor(
  amount: number,
  homeBalance: number,
  buffer: number,
  home: string,
): void {
  const rotable = Math.max(0, homeBalance - buffer);
  if (amount > rotable) {
    throw new Error(
      `Piso de liquidez: reserva ${buffer} ${home} para ${liquidityBufferDays()} días; saldo ${homeBalance}; rotable ${rotable}; pedido ${amount}`,
    );
  }
}

export type DecisionRecord = {
  at: string;
  action: string;
  amount?: string;
  from?: string;
  to?: string;
  dryRun: boolean;
  reason: string;
  details?: unknown;
};

const LOG_PATH = join(process.cwd(), "data", "decisions.jsonl");

export async function auditLog(record: DecisionRecord): Promise<DecisionRecord> {
  const line = JSON.stringify(record) + "\n";
  await mkdir(dirname(LOG_PATH), { recursive: true });
  await appendFile(LOG_PATH, line, "utf8");
  console.info("[audit]", record.action, record.reason);
  return record;
}

export function isDryRun(): boolean {
  return (process.env.TREASURY_MODE ?? "dry-run").toLowerCase() !== "live";
}
