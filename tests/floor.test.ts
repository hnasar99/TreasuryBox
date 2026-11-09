import { describe, expect, it } from "vitest";
import {
  artDayKey,
  assertWithinLiquidityFloor,
  scheduledBufferAmount,
} from "../agent/lib/guards.js";

describe("liquidity floor", () => {
  it("sums scheduled home-currency payments inside the ART buffer window", () => {
    const now = new Date("2026-11-09T03:00:00Z"); // 00:00 ART
    const today = artDayKey(now);
    expect(today).toBe("2026-11-09");
    const buffer = scheduledBufferAmount(
      [
        { dueDate: "2026-11-10", amount: "40000", currency: "ARS", status: "scheduled" },
        { dueDate: "2026-11-20", amount: "90000", currency: "ARS", status: "scheduled" },
        { dueDate: "2026-11-12", amount: "5000", currency: "BRL", status: "scheduled" },
        { dueDate: "2026-11-11", amount: "10000", currency: "ARS", status: "paid" },
      ],
      { now, bufferDays: 7, homeCurrency: "ARS" },
    );
    expect(buffer).toBe(40000);
  });

  it("blocks a rotation that would spend the reserve", () => {
    expect(() => assertWithinLiquidityFloor(60000, 100000, 50000, "ARS")).toThrow(
      /Piso de liquidez/,
    );
  });

  it("allows a rotation of the surplus only", () => {
    expect(() => assertWithinLiquidityFloor(50000, 100000, 50000, "ARS")).not.toThrow();
  });
});
