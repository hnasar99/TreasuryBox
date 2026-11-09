import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createDefaultRail } from "@treasurybox/rails";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { amount?: string; currency?: string };
    const amount = body.amount ?? "1000";
    const currency = (body.currency ?? process.env.HOME_CURRENCY ?? "ARS") as "ARS";
    const rail = createDefaultRail();
    const payment = await rail.paymentRequest(amount, currency);
    const qrDataUrl = await QRCode.toDataURL(payment.qrPayload, { margin: 1, width: 240 });
    return NextResponse.json({
      ...payment,
      qrDataUrl,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
