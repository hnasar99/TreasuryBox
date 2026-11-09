import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const homeCurrency = (process.env.HOME_CURRENCY ?? "ARS").toUpperCase();
  return NextResponse.json({
    available: false,
    homeCurrency,
    narrative:
      "No on-chain P&L is recorded. This panel does not invent starting or ending balances.",
  });
}
