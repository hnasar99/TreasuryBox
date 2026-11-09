import { randomBytes } from "node:crypto";
import type { Account, Address, Hex, WalletClient, PublicClient } from "viem";
import { erc20Abi } from "../abi/erc20.js";
import { TEXTILE_REACTOR } from "./tokens.js";

const DEFAULT_API = "https://api.textilecredit.com/v2";

export function textileBaseUrl(): string {
  return (process.env.TEXTILE_API_URL ?? DEFAULT_API).replace(/\/$/, "");
}

export type TextileQuoteData = {
  rfqId: string;
  claimToken: string;
  status: string;
  quote: {
    takerPays: string;
    buyAmount: string;
    reactor: Address;
    expiresAt: number | string;
  };
  transactions: {
    swap: { to: Address; data: Hex; value: string };
  };
};

/** Indicative quote from POST /rfq/preview (no settlement, no balance check). */
export type TextilePreviewData = {
  status: string;
  sellAmount: string;
  buyAmount: string;
  feeAmount?: string;
  takerPays: string;
  rateRay?: string;
  availableSellAmount?: string;
};

type TakerProof = {
  nonce: Hex;
  issuedAt: number;
  signature: Hex;
};

async function takerProof(account: Account): Promise<TakerProof> {
  const nonce = `0x${randomBytes(32).toString("hex")}` as Hex;
  const issuedAt = Date.now();
  if (!account.signTypedData) {
    throw new Error("Account must support signTypedData for Textile takerProof");
  }
  const signature = await account.signTypedData({
    domain: { name: "Textile Taker Control", version: "1", chainId: 42220 },
    types: {
      TakerControl: [
        { name: "taker", type: "address" },
        { name: "chainId", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "issuedAt", type: "uint256" },
      ],
    },
    primaryType: "TakerControl",
    message: {
      taker: account.address,
      chainId: 42220n,
      nonce,
      issuedAt: BigInt(issuedAt),
    },
  });
  return { nonce, issuedAt, signature };
}

export async function textilePreview(args: {
  account: Account;
  sellToken: Address;
  buyToken: Address;
  sellAmount: bigint;
}): Promise<TextilePreviewData> {
  const proof = await takerProof(args.account);
  const url = `${textileBaseUrl()}/rfq/preview`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chainId: 42220,
      sellToken: args.sellToken,
      buyToken: args.buyToken,
      sellAmount: args.sellAmount.toString(),
      taker: args.account.address,
      takerProof: proof,
    }),
    signal: AbortSignal.timeout(75_000),
  });
  const j = (await r.json()) as TextilePreviewData & {
    data?: TextilePreviewData;
    error?: unknown;
  };
  if (!r.ok) {
    throw new Error(`textile preview ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  }
  // API may return flat body or { data }
  const data = (j.data ?? j) as TextilePreviewData;
  if (!data.buyAmount) throw new Error(`textile preview: missing buyAmount`);
  return data;
}

export async function textileRequest(args: {
  account: Account;
  sellToken: Address;
  buyToken: Address;
  sellAmount: bigint;
}): Promise<TextileQuoteData> {
  const proof = await takerProof(args.account);
  const url = `${textileBaseUrl()}/rfq/request`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chainId: 42220,
      sellToken: args.sellToken,
      buyToken: args.buyToken,
      sellAmount: args.sellAmount.toString(),
      taker: args.account.address,
      takerProof: proof,
    }),
    signal: AbortSignal.timeout(75_000),
  });
  const j = (await r.json()) as { data?: TextileQuoteData; error?: unknown };
  if (!r.ok) {
    throw new Error(`textile request ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  }
  const data = j.data;
  if (!data) throw new Error(`textile request: empty data`);
  if (data.status && data.status !== "quoted") {
    throw new Error(`textile ${data.status}`);
  }
  return data;
}

export async function ensureAllowance(args: {
  publicClient: PublicClient;
  wallet: WalletClient;
  token: Address;
  owner: Address;
  spender: Address;
  amount: bigint;
}): Promise<Hex[]> {
  const hashes: Hex[] = [];
  const current = await args.publicClient.readContract({
    address: args.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [args.owner, args.spender],
  });
  if (current >= args.amount) return hashes;

  if (current > 0n) {
    const z = await args.wallet.writeContract({
      chain: args.wallet.chain,
      account: args.wallet.account!,
      address: args.token,
      abi: erc20Abi,
      functionName: "approve",
      args: [args.spender, 0n],
    });
    hashes.push(z);
    await args.publicClient.waitForTransactionReceipt({ hash: z });
  }

  const h = await args.wallet.writeContract({
    chain: args.wallet.chain,
    account: args.wallet.account!,
    address: args.token,
    abi: erc20Abi,
    functionName: "approve",
    args: [args.spender, args.amount],
  });
  hashes.push(h);
  await args.publicClient.waitForTransactionReceipt({ hash: h });
  return hashes;
}

export async function textileSubmit(rfqId: string, claimToken: string, txHash: Hex): Promise<void> {
  await fetch(`${textileBaseUrl()}/rfq/${rfqId}/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Rfq-Claim": claimToken,
    },
    body: JSON.stringify({ txHash }),
  }).catch(() => {});
}

export async function textileExecuteSwap(args: {
  publicClient: PublicClient;
  wallet: WalletClient;
  account: Account;
  sellToken: Address;
  quote: TextileQuoteData;
}): Promise<Hex> {
  const reactor = args.quote.quote.reactor ?? TEXTILE_REACTOR;
  await ensureAllowance({
    publicClient: args.publicClient,
    wallet: args.wallet,
    token: args.sellToken,
    owner: args.account.address,
    spender: reactor,
    amount: BigInt(args.quote.quote.takerPays),
  });

  const exp = Number(args.quote.quote.expiresAt);
  if (Date.now() >= (exp < 1e12 ? exp * 1000 : exp)) {
    throw new Error("textile quote expired");
  }

  const tx = await args.wallet.sendTransaction({
    chain: args.wallet.chain,
    account: args.wallet.account!,
    to: args.quote.transactions.swap.to,
    data: args.quote.transactions.swap.data,
    value: 0n,
  });
  const rc = await args.publicClient.waitForTransactionReceipt({ hash: tx });
  if (rc.status !== "success") throw new Error("textile swap reverted");
  await textileSubmit(args.quote.rfqId, args.quote.claimToken, tx);
  return tx;
}
