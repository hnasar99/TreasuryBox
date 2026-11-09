/**
 * Registers the agent on Celo Identity Registry (ERC-8004) and writes public/agent.json.
 *
 * Usage:
 *   AGENT_PRIVATE_KEY=0x... PUBLIC_BASE_URL=https://... npm run register:8004
 *
 * Does NOT broadcast unless TREASURY_MODE=live and CONFIRM_REGISTER_8004=yes.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createPublicClient,
  decodeEventLog,
  http,
  type Hex,
} from "viem";
import { celo } from "viem/chains";
import {
  createAttributedCeloWallet,
  createAgentAccount,
} from "../packages/rails/src/wallet.js";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

const abi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string" },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;

const DEFAULT_AGENT_URI =
  "https://raw.githubusercontent.com/hnasar99/TreasuryBox/main/public/agent.json";
const DEFAULT_WEB = "https://github.com/hnasar99/TreasuryBox";

function buildAgentJson(agentId?: string) {
  const web = (process.env.PUBLIC_BASE_URL ?? DEFAULT_WEB).replace(/\/$/, "");
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Fluuix Treasury Box",
    description:
      "Treasury agent for a LatAm merchant on Celo: keep enough Ripio wFIAT for scheduled supplier payments and rotate only the surplus. Live sends require a wallet signature and the Loops ERC-8021 tag.",
    services: [
      { name: "web", endpoint: web },
      { name: "repository", endpoint: DEFAULT_WEB },
    ],
    x402Support: false,
    active: true,
    supportedTrust: ["reputation"],
    registrations: agentId
      ? [
          {
            agentId: Number(agentId),
            agentRegistry: `eip155:42220:${IDENTITY_REGISTRY}`,
          },
        ]
      : [],
  };
}

async function main() {
  const outDir = resolve("public");
  await mkdir(outDir, { recursive: true });

  const draft = buildAgentJson();
  const agentUri = process.env.AGENT_URI ?? DEFAULT_AGENT_URI;

  await writeFile(resolve(outDir, "agent.json"), JSON.stringify(draft, null, 2));
  console.log("Wrote public/agent.json (draft)");
  console.log("agentURI:", agentUri);

  const live =
    process.env.TREASURY_MODE === "live" && process.env.CONFIRM_REGISTER_8004 === "yes";

  if (!live) {
    console.log(
      "Skipping on-chain register (set TREASURY_MODE=live CONFIRM_REGISTER_8004=yes to broadcast).",
    );
    return;
  }

  const account = createAgentAccount();
  const wallet = createAttributedCeloWallet(account);
  const publicClient = createPublicClient({
    chain: celo,
    transport: http(process.env.CELO_RPC_URL ?? "https://forno.celo.org"),
  });

  console.log("Registering from", account.address);
  const hash = await wallet.writeContract({
    chain: celo,
    account,
    address: IDENTITY_REGISTRY,
    abi,
    functionName: "register",
    args: [agentUri],
  });
  console.log("tx", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as Hex });
  let agentId: string | undefined;
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      });
      if (ev.eventName === "Registered") {
        agentId = (ev.args as { agentId: bigint }).agentId.toString();
        break;
      }
    } catch {
      /* other logs */
    }
  }

  if (!agentId) throw new Error("Registered event not found in receipt");
  console.log("agentId", agentId);

  const finalJson = buildAgentJson(agentId);
  await writeFile(resolve(outDir, "agent.json"), JSON.stringify(finalJson, null, 2));
  console.log("Updated public/agent.json with registrations");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
