import { describe, expect, it } from "vitest";
import { quoteExecutionBlock, RipioRail } from "@treasurybox/rails";
import type { FxQuote } from "@treasurybox/rails";

const uniswapQuote = {
  id: "uni-fallback-1",
  rail: "ripio",
  venue: "uniswap",
  from: "wARS",
  to: "USDT",
  amountIn: "1000",
  amountOut: "0",
  rate: "0",
  dryRun: false,
  payload: {
    kind: "uniswap",
    sell: "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d",
    buy: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    amountIn: "1000000000000000000000",
    minOut: "0",
  },
} as FxQuote;

describe("quoteExecutionBlock", () => {
  it("blocks Uniswap minOut=0", () => {
    expect(quoteExecutionBlock(uniswapQuote)).toMatch(/minOut is 0/);
  });

  it("blocks a Textile preview", () => {
    const preview = {
      ...uniswapQuote,
      venue: "textile",
      payload: { kind: "textile-preview" },
    } as FxQuote;
    expect(quoteExecutionBlock(preview)).toMatch(/preview/);
  });

  it("blocks a route if any leg is Uniswap", () => {
    const route = {
      ...uniswapQuote,
      venue: "route",
      payload: { kind: "route", legs: [uniswapQuote] },
    } as FxQuote;
    expect(quoteExecutionBlock(route)).toMatch(/minOut is 0/);
  });

  it("allows a Textile RFQ payload", () => {
    const live = {
      ...uniswapQuote,
      venue: "textile",
      amountOut: "1",
      payload: { kind: "textile", sellToken: "0x1", buyToken: "0x2", data: {} },
    } as FxQuote;
    expect(quoteExecutionBlock(live)).toBeNull();
  });
});

describe("RipioRail.execute", () => {
  it("refuses Uniswap without broadcasting", async () => {
    const rail = new RipioRail();
    const result = await rail.execute(uniswapQuote);
    expect(result.ok).toBe(false);
    expect(result.txHashes).toEqual([]);
    expect(result.message).toMatch(/minOut is 0/);
  });
});
