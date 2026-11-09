import { encodePacked, type Address, type Hex, type PublicClient, type WalletClient } from "viem";
import { ensureAllowance } from "./textile.js";

/** Uniswap v3 SwapRouter02 on Celo — fallback when Textile has no quote. */
export const UNISWAP_SWAP_ROUTER_02 =
  (process.env.UNISWAP_ROUTER_ADDRESS as Address | undefined) ??
  ("0x5615CD1030E92506039eb63bEABedc041f4Bf80D" as Address);

const POOL_FEE = 3000;

const routerAbi = [
  {
    type: "function",
    name: "exactInput",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "path", type: "bytes" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

export async function uniswapExactInput(args: {
  publicClient: PublicClient;
  wallet: WalletClient;
  owner: Address;
  sell: Address;
  buy: Address;
  amountIn: bigint;
  minOut: bigint;
}): Promise<Hex> {
  await ensureAllowance({
    publicClient: args.publicClient,
    wallet: args.wallet,
    token: args.sell,
    owner: args.owner,
    spender: UNISWAP_SWAP_ROUTER_02,
    amount: args.amountIn,
  });

  const path = encodePacked(
    ["address", "uint24", "address"],
    [args.sell, POOL_FEE, args.buy],
  );

  const tx = await args.wallet.writeContract({
    chain: args.wallet.chain,
    account: args.wallet.account!,
    address: UNISWAP_SWAP_ROUTER_02,
    abi: routerAbi,
    functionName: "exactInput",
    args: [
      {
        path,
        recipient: args.owner,
        amountIn: args.amountIn,
        amountOutMinimum: args.minOut,
      },
    ],
  });
  const rc = await args.publicClient.waitForTransactionReceipt({ hash: tx });
  if (rc.status !== "success") throw new Error("uniswap swap reverted");
  return tx;
}
