import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const SUPPLIER_PAYMENTS_PATH = join(process.cwd(), "data", "supplier-payments.jsonl");

export type ScheduledPaymentRow = {
  id: string;
  dueDate: string;
  amount: string;
  currency: string;
  supplier: string;
  note?: string;
  createdAt?: string;
  status: string;
};

export async function appendScheduledPayment(row: ScheduledPaymentRow): Promise<void> {
  await mkdir(dirname(SUPPLIER_PAYMENTS_PATH), { recursive: true });
  await appendFile(SUPPLIER_PAYMENTS_PATH, JSON.stringify(row) + "\n", "utf8");
}

export async function listScheduledPayments(): Promise<ScheduledPaymentRow[]> {
  try {
    const text = await readFile(SUPPLIER_PAYMENTS_PATH, "utf8");
    return text
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as ScheduledPaymentRow);
  } catch {
    return [];
  }
}
