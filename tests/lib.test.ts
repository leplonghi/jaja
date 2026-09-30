import { describe, expect, it } from "vitest";
import { phaseOf, safeNext, shortHash } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import type { VaultItem } from "@/lib/types";

describe("safeNext (open redirect)", () => {
  it("aceita só caminhos internos", () => {
    expect(safeNext("/eventos/1")).toBe("/eventos/1");
    expect(safeNext("https://evil.com")).toBe("/cofre");
    expect(safeNext("//evil.com")).toBe("/cofre");
    expect(safeNext("/\\evil.com")).toBe("/cofre");
    expect(safeNext(null)).toBe("/cofre");
  });
});

describe("phaseOf", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  it("deriva a fase", () => {
    expect(phaseOf({ status: "open", locks_at: future })).toBe("open");
    expect(phaseOf({ status: "open", locks_at: past })).toBe("locked");
    expect(phaseOf({ status: "resolved", locks_at: past })).toBe("resolved");
    expect(phaseOf({ status: "canceled", locks_at: future })).toBe("canceled");
  });
  it("encurta hashes", () => expect(shortHash("a".repeat(64))).toBe("aaaaaa…aaaa"));
});

describe("computeStats", () => {
  const item = (hit: boolean, conf: number, day: number, status: "resolved" | "open" = "resolved"): VaultItem =>
    ({
      prediction: { option_id: hit ? "w" : "x", confidence: conf },
      event: { status, winning_option_id: status === "resolved" ? "w" : null, resolved_at: new Date(2026, 0, day).toISOString() },
    }) as unknown as VaultItem;

  it("calcula acerto, sequência atual e Brier", () => {
    const s = computeStats([item(false, 80, 1), item(true, 80, 2), item(true, 80, 3), item(true, 60, 4), item(true, 90, 5, "open")]);
    expect(s).toMatchObject({ total: 4, hits: 3, accuracy: 75, streak: 3, pending: 1 });
    // ((.2² *3) + (.8²)) / 4 = 0.19 (erro a 80% pesa 0.64)
    expect(s.brier).toBeCloseTo((0.04 + 0.04 + 0.16 + 0.64) / 4, 3);
  });
  it("sem palpites resolvidos", () => {
    expect(computeStats([])).toMatchObject({ total: 0, accuracy: null, brier: null, streak: 0 });
  });
});
