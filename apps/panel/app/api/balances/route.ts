import { NextResponse } from "next/server";
import { createOptionalAccount, createRails } from "@treasurybox/rails";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = createOptionalAccount();
    const address = (process.env.TREASURY_ADDRESS ||
      account?.address ||
      "0x0000000000000000000000000000000000000000") as `0x${string}`;

    const rails = createRails();
    const out = [];
    for (const rail of rails) {
      const balances = await rail.getBalances(address);
      out.push({
        rail: rail.id,
        chainId: rail.chain.id,
        balances: balances.map((b) => ({
          symbol: b.symbol,
          formatted: b.formatted,
          address: b.address,
        })),
      });
    }
    return NextResponse.json({ address, rails: out });
  } catch (e) {
    return NextResponse.json({ error: String(e), rails: [] }, { status: 200 });
  }
}
