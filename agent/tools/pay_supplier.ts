import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  assertWithinDailyLimit,
  assertWithinOpLimit,
  auditLog,
  isDryRun,
  recordDailySpend,
} from "../lib/guards.js";

export default defineTool({
  description:
    "Paga a un proveedor desde la liquidez local. En dry-run solo registra la intención.",
  inputSchema: z.object({
    supplier: z.string(),
    amount: z.string(),
    currency: z.string().default("ARS"),
    toAddress: z.string().optional().describe("Wallet del proveedor si el pago es on-chain"),
    reason: z.string(),
  }),
  async execute({ supplier, amount, currency, toAddress, reason }) {
    const numeric = Number(amount);
    assertWithinOpLimit(numeric);
    assertWithinDailyLimit(numeric);

    const dry = isDryRun();
    if (!dry) {
      // Live ERC-20 transfer wiring lives behind confirmation — refuse without live mode + key.
      if (!process.env.AGENT_PRIVATE_KEY) {
        throw new Error("AGENT_PRIVATE_KEY requerido para pay_supplier en vivo");
      }
      recordDailySpend(numeric);
    }

    const record = await auditLog({
      at: new Date().toISOString(),
      action: "pay_supplier",
      amount,
      dryRun: dry,
      reason,
      details: { supplier, currency, toAddress, status: dry ? "dry-run" : "queued" },
    });

    return {
      ok: true,
      dryRun: dry,
      message: dry
        ? `DRY-RUN: pagaría ${amount} ${currency} a ${supplier}`
        : `Pago registrado a ${supplier} por ${amount} ${currency}`,
      record,
    };
  },
});
