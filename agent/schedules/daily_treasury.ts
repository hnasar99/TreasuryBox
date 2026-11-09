import { defineSchedule } from "eve/schedules";

/**
 * Cron diario (09:00 ART ≈ 12:00 UTC). En eve start / producción dispara solo.
 * En dev: POST /eve/v1/dev/schedules/daily_treasury
 */
export default defineSchedule({
  cron: "0 12 * * *",
  content: `Es el repaso diario de tesorería de TreasuryBox.

1. Llamá get_balances.
2. Revisá pagos de proveedores agendados (si hay tool/contexto de schedule_supplier_payment).
3. Calculá cuánta liquidez en HOME_CURRENCY hay que reservar para LIQUIDITY_BUFFER_DAYS. rebalance también lo corta en código.
4. Si hay excedente, cotizá con get_quote una rotación prudente (ej. wARS → USDT en Textile). Un preview no es un fill.
5. Si conviene, llamá rebalance con un motivo en español simple. Respetá el piso, MAX_OP_AMOUNT y MAX_DAILY_AMOUNT. Si el quote no es Textile ejecutable, no hay swap.
6. Estamos en dry-run por defecto: no inventes txs; mostrá la decisión y el motivo.
7. Respondé un resumen corto para el dueño del comercio.`,
});
