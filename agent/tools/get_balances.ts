import { defineTool } from "eve/tools";
import { z } from "zod";
import { createOptionalAccount } from "@treasurybox/rails";
import { rails } from "../lib/rails.js";

export default defineTool({
  description:
    "Lee saldos de stablecoins locales en cada riel activo. En el build Ripio es Celo (wFIAT).",
  inputSchema: z.object({
    address: z
      .string()
      .optional()
      .describe("Dirección a consultar; por defecto TREASURY_ADDRESS o la wallet del agente"),
  }),
  async execute({ address }) {
    const account = createOptionalAccount();
    const addr = (address ||
      process.env.TREASURY_ADDRESS ||
      account?.address ||
      "0x0000000000000000000000000000000000000000") as `0x${string}`;

    const out = [];
    for (const rail of rails()) {
      const balances = await rail.getBalances(addr);
      out.push({
        rail: rail.id,
        chainId: rail.chain.id,
        address: addr,
        balances: balances.map((b) => ({
          symbol: b.symbol,
          formatted: b.formatted,
          address: b.address,
        })),
      });
    }
    return { address: addr, rails: out };
  },
});
