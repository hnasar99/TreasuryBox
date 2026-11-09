import { formatUnits, parseUnits } from "viem";

export function toRaw(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

export function toHuman(raw: bigint, decimals: number): string {
  return formatUnits(raw, decimals);
}

export function isDryRun(): boolean {
  const mode = (process.env.TREASURY_MODE ?? "dry-run").toLowerCase();
  return mode !== "live";
}
