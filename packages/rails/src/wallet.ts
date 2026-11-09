import { codeFromRepo, withAttribution } from "@celo/attribution-tags";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arbitrum, celo, celoSepolia } from "viem/chains";

/** Tag Loops issued for this entry. Distinct from codeFromRepo("hnasar99/TreasuryBox"). */
export const LOOPS_ATTRIBUTION_TAG = "celo_202a37e338a2";

export function issuedAttributionCode(): string {
  return process.env.CELO_ATTRIBUTION_CODE?.trim() ?? "";
}

export function attributionCodes(): string[] {
  const codes: string[] = [codeFromRepo("hnasar99/TreasuryBox")];
  const issued = issuedAttributionCode();
  if (issued) codes.unshift(issued);
  return codes;
}

/** Live Celo sends are only credited with the Loops-issued tag. */
export function requireLoopsAttributionForLive(): void {
  if ((process.env.TREASURY_MODE ?? "dry-run").toLowerCase() !== "live") return;
  const issued = issuedAttributionCode();
  if (issued !== LOOPS_ATTRIBUTION_TAG) {
    throw new Error(
      `CELO_ATTRIBUTION_CODE must be ${LOOPS_ATTRIBUTION_TAG} before live Celo sends (got ${issued || "unset"}). codeFromRepo is not the Loops tag.`,
    );
  }
}

export function createAgentAccount(): Account {
  const key = process.env.AGENT_PRIVATE_KEY as Hex | undefined;
  if (!key) {
    throw new Error("AGENT_PRIVATE_KEY is required for wallet operations");
  }
  return privateKeyToAccount(key);
}

/** Optional account: real AGENT_PRIVATE_KEY, or ephemeral key for dry-run Textile proofs. */
export function createOptionalAccount(): Account | null {
  try {
    return createAgentAccount();
  } catch {
    if ((process.env.TREASURY_MODE ?? "dry-run").toLowerCase() !== "live") {
      return privateKeyToAccount(generatePrivateKey());
    }
    return null;
  }
}

/** Account that can sign Textile takerProof (real or ephemeral in dry-run). */
export function createQuoteAccount(): Account {
  const optional = createOptionalAccount();
  if (optional) return optional;
  return privateKeyToAccount(generatePrivateKey());
}

export function resolveCeloChain(): Chain {
  return process.env.NETWORK === "testnet" ? celoSepolia : celo;
}

export function resolveArbitrumChain(): Chain {
  // Twin hackathon targets Arbitrum One; testnet override left for later.
  return arbitrum;
}

export function createCeloPublicClient(): PublicClient {
  const url = process.env.CELO_RPC_URL ?? "https://forno.celo.org";
  return createPublicClient({
    chain: resolveCeloChain(),
    transport: http(url),
  });
}

export function createArbitrumPublicClient(): PublicClient {
  const url = process.env.ARBITRUM_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
  return createPublicClient({
    chain: resolveArbitrumChain(),
    transport: http(url),
  });
}

/**
 * Wallet client with ERC-8021 attribution on every sendTransaction / writeContract.
 * Applies CELO_ATTRIBUTION_CODE + codeFromRepo('hnasar99/TreasuryBox').
 */
export function createAttributedCeloWallet(account?: Account): WalletClient {
  requireLoopsAttributionForLive();
  const acc = account ?? createAgentAccount();
  const chain = resolveCeloChain();
  const url = process.env.CELO_RPC_URL ?? "https://forno.celo.org";
  return createWalletClient({
    account: acc,
    chain,
    transport: http(url),
  }).extend(withAttribution(attributionCodes()));
}

export function createArbitrumWallet(account?: Account): WalletClient {
  const acc = account ?? createAgentAccount();
  const chain = resolveArbitrumChain();
  const url = process.env.ARBITRUM_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
  return createWalletClient({
    account: acc,
    chain,
    transport: http(url),
  });
}

/** Build calldata that already includes the attribution suffix (for offline tests). */
export { toDataSuffix, fromDataSuffix, codeFromRepo } from "@celo/attribution-tags";
