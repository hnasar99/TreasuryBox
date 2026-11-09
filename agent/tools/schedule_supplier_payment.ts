import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditLog, isDryRun } from "../lib/guards.js";
import { appendScheduledPayment, listScheduledPayments } from "../lib/scheduled.js";

export default defineTool({
  description:
    "Agenda un pago a proveedor (fecha ISO, monto, moneda, nota). No envía fondos todavía.",
  inputSchema: z.object({
    dueDate: z.string().describe("Fecha de vencimiento YYYY-MM-DD"),
    amount: z.string(),
    currency: z.string().default("ARS"),
    supplier: z.string(),
    note: z.string().optional(),
  }),
  async execute(input) {
    const row = {
      id: `pay-${Date.now()}`,
      ...input,
      createdAt: new Date().toISOString(),
      status: "scheduled" as const,
    };
    await appendScheduledPayment(row);
    await auditLog({
      at: row.createdAt,
      action: "schedule_supplier_payment",
      amount: input.amount,
      dryRun: isDryRun(),
      reason: `Agendé pago a ${input.supplier} por ${input.amount} ${input.currency} el ${input.dueDate}`,
      details: row,
    });
    return row;
  },
});

export { listScheduledPayments };
