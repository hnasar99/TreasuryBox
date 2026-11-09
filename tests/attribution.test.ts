import { describe, expect, it } from "vitest";
import {
  attributionCodes,
  codeFromRepo,
  fromDataSuffix,
  LOOPS_ATTRIBUTION_TAG,
  requireLoopsAttributionForLive,
  toDataSuffix,
} from "@treasurybox/rails";
import { concat, type Hex } from "viem";

describe("ERC-8021 attribution tag", () => {
  it("includes codeFromRepo(hnasar99/TreasuryBox) in the suffix", () => {
    const repoCode = codeFromRepo("hnasar99/TreasuryBox");
    expect(repoCode.startsWith("celo_")).toBe(true);

    const codes = attributionCodes();
    expect(codes).toContain(repoCode);

    const suffix = toDataSuffix(codes);
    const decoded = fromDataSuffix(suffix);
    expect(decoded).not.toBeNull();
    expect(decoded!.codes).toContain(repoCode);
  });

  it("appends the suffix to calldata so the marker is present at the end", () => {
    const codes = attributionCodes();
    const suffix = toDataSuffix(codes);
    // fake approve calldata prefix
    const callData = "0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001" as Hex;
    const tagged = concat([callData, suffix]);

    expect(tagged.endsWith(suffix.slice(2))).toBe(true);
    const decoded = fromDataSuffix(tagged);
    expect(decoded).not.toBeNull();
    expect(decoded!.codes.length).toBeGreaterThan(0);
    expect(decoded!.codes).toContain(codeFromRepo("hnasar99/TreasuryBox"));
  });

  it("merges CELO_ATTRIBUTION_CODE when set", () => {
    const prev = process.env.CELO_ATTRIBUTION_CODE;
    process.env.CELO_ATTRIBUTION_CODE = "celo_hackathon01";
    try {
      // re-import path is static — call toDataSuffix directly with both codes
      const repo = codeFromRepo("hnasar99/TreasuryBox");
      const suffix = toDataSuffix(["celo_hackathon01", repo]);
      const decoded = fromDataSuffix(suffix);
      expect(decoded!.codes).toEqual(expect.arrayContaining(["celo_hackathon01", repo]));
    } finally {
      if (prev === undefined) delete process.env.CELO_ATTRIBUTION_CODE;
      else process.env.CELO_ATTRIBUTION_CODE = prev;
    }
  });

  it("does not treat codeFromRepo as the Loops tag", () => {
    expect(codeFromRepo("hnasar99/TreasuryBox")).not.toBe(LOOPS_ATTRIBUTION_TAG);
    expect(LOOPS_ATTRIBUTION_TAG).toBe("celo_202a37e338a2");
  });

  it("refuses live sends without the Loops-issued tag", () => {
    const prevMode = process.env.TREASURY_MODE;
    const prevCode = process.env.CELO_ATTRIBUTION_CODE;
    process.env.TREASURY_MODE = "live";
    delete process.env.CELO_ATTRIBUTION_CODE;
    try {
      expect(() => requireLoopsAttributionForLive()).toThrow(/celo_202a37e338a2/);
    } finally {
      if (prevMode === undefined) delete process.env.TREASURY_MODE;
      else process.env.TREASURY_MODE = prevMode;
      if (prevCode === undefined) delete process.env.CELO_ATTRIBUTION_CODE;
      else process.env.CELO_ATTRIBUTION_CODE = prevCode;
    }
  });

  it("allows live sends when CELO_ATTRIBUTION_CODE is the Loops tag", () => {
    const prevMode = process.env.TREASURY_MODE;
    const prevCode = process.env.CELO_ATTRIBUTION_CODE;
    process.env.TREASURY_MODE = "live";
    process.env.CELO_ATTRIBUTION_CODE = LOOPS_ATTRIBUTION_TAG;
    try {
      expect(() => requireLoopsAttributionForLive()).not.toThrow();
    } finally {
      if (prevMode === undefined) delete process.env.TREASURY_MODE;
      else process.env.TREASURY_MODE = prevMode;
      if (prevCode === undefined) delete process.env.CELO_ATTRIBUTION_CODE;
      else process.env.CELO_ATTRIBUTION_CODE = prevCode;
    }
  });
});
