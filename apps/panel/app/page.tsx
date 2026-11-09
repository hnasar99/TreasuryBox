"use client";

import { useCallback, useEffect, useState } from "react";

type BalanceRail = {
  rail: string;
  chainId: number;
  balances: { symbol: string; formatted: string }[];
};

type Decision = {
  at: string;
  action: string;
  reason: string;
  dryRun: boolean;
  amount?: string;
  from?: string;
  to?: string;
};

type Payment = {
  url: string;
  qrDataUrl: string;
  amount: string;
  token: string;
};

type PnL = {
  available?: boolean;
  narrative: string;
  vsHoldLocal?: number;
  realVsInflation?: number;
  homeCurrency: string;
};

export default function PanelPage() {
  const [rails, setRails] = useState<BalanceRail[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [amount, setAmount] = useState("10000");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [pnl, setPnl] = useState<PnL | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [b, d, p] = await Promise.all([
        fetch("/api/balances").then((r) => r.json()),
        fetch("/api/decisions").then((r) => r.json()),
        fetch("/api/pnl").then((r) => r.json()),
      ]);
      setRails(b.rails ?? []);
      setDecisions(d.decisions ?? []);
      setPnl(p);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function cobrar() {
    const r = await fetch("/api/payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? "No se pudo generar el cobro");
      return;
    }
    setPayment(j);
  }

  return (
    <main className="shell">
      <p className="tag">RAIL_PROVIDER={process.env.NEXT_PUBLIC_RAIL_PROVIDER ?? "runtime"}</p>
      <h1 className="brand rise">TreasuryBox</h1>
      <p className="rise">
        Panel del comercio — saldos, decisiones del agente y cobro en stablecoin local.
      </p>

      {error && (
        <p style={{ color: "var(--danger)" }} className="rise">
          {error}
        </p>
      )}

      <div className="grid">
        <section className="rise">
          <h2>Saldos</h2>
          {rails.length === 0 && <p className="muted">Sin datos aún (¿RPC / address?).</p>}
          {rails.map((r) => (
            <div key={r.rail} style={{ marginBottom: "1rem" }}>
              <p className="muted">
                {r.rail} · chain {r.chainId}
              </p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {r.balances.map((b) => (
                    <tr key={b.symbol + b.formatted}>
                      <td>{b.symbol}</td>
                      <td>{b.formatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <button className="btn" type="button" onClick={() => void refresh()}>
            Actualizar
          </button>
        </section>

        <section className="rise">
          <h2>Cobrar</h2>
          <p>Generá un link / QR de cobro. Eso no liquida un pago x402 ni prueba un ramp de Ripio.</p>
          <div className="field">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Monto"
            />
            <button className="btn" type="button" onClick={() => void cobrar()}>
              Cobrar
            </button>
          </div>
          {payment && (
            <div>
              <p className="muted">
                {payment.amount} {payment.token}
              </p>
              <a href={payment.url} target="_blank" rel="noreferrer">
                {payment.url}
              </a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="qr">
                <img src={payment.qrDataUrl} alt="QR de cobro" width={180} height={180} />
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="rise" style={{ marginTop: "1.5rem" }}>
        <h2>P&amp;L del mes</h2>
        {pnl ? (
          <p className="reason">{pnl.narrative}</p>
        ) : (
          <p className="muted">Sin reporte todavía.</p>
        )}
      </section>

      <section className="rise" style={{ marginTop: "1.5rem" }}>
        <h2>Historial de decisiones</h2>
        {decisions.length === 0 && <p className="muted">Todavía no hay decisiones auditadas.</p>}
        <table className="table">
          <thead>
            <tr>
              <th>Cuándo</th>
              <th>Acción</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d, i) => (
              <tr key={d.at + i}>
                <td>{new Date(d.at).toLocaleString("es-AR")}</td>
                <td>
                  {d.action}
                  {d.dryRun ? " · dry-run" : ""}
                </td>
                <td className="reason">{d.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
