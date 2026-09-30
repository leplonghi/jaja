import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DICTS, LOCALES, interpolate, makeT, matchLocale } from "@/i18n";
import { pickDaily } from "@/lib/daily";
import { errorKey } from "@/lib/errors";
import { safeNext, topicPhase } from "@/lib/format";
import { computeCommitment } from "@/lib/hash";
import { computeStats } from "@/lib/stats";
import type { Prediction, Topic, VaultItem } from "@/lib/types";

describe("safeNext (open redirect)", () => {
  it("aceita só caminhos internos", () => {
    expect(safeNext("/t/1")).toBe("/t/1");
    expect(safeNext("https://evil.com")).toBe("/vault");
    expect(safeNext("//evil.com")).toBe("/vault");
    expect(safeNext("/\\evil.com")).toBe("/vault");
    expect(safeNext(null)).toBe("/vault");
  });
});

describe("topicPhase", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  it("deriva a fase", () => {
    expect(topicPhase({ status: "open", locks_at: future, revealed: false })).toBe("open");
    expect(topicPhase({ status: "open", locks_at: past, revealed: false })).toBe("waiting");
    expect(topicPhase({ status: "open", locks_at: past, revealed: true })).toBe("revealed");
    expect(topicPhase({ status: "resolved", locks_at: past, revealed: true })).toBe("revealed");
    expect(topicPhase({ status: "pending_review", locks_at: future, revealed: false })).toBe("pending");
    expect(topicPhase({ status: "canceled", locks_at: future, revealed: false })).toBe("canceled");
    expect(topicPhase({ status: "blocked", locks_at: future, revealed: false })).toBe("blocked");
  });
});

describe("i18n", () => {
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  it("pt, en e es têm as mesmas chaves e os mesmos marcadores", () => {
    const keys = Object.keys(DICTS.pt);
    for (const l of LOCALES) {
      expect(Object.keys(DICTS[l]).sort(), `chaves de ${l}`).toEqual([...keys].sort());
      for (const k of keys) {
        const key = k as keyof typeof DICTS.pt;
        expect(placeholders(DICTS[l][key]), `${l}:${k}`).toBe(placeholders(DICTS.pt[key]));
        expect(DICTS[l][key].trim(), `${l}:${k} vazio`).not.toBe("");
      }
    }
  });
  it("interpola e faz plural", () => {
    expect(interpolate("oi {n}", { n: 3 })).toBe("oi 3");
    const { tp } = makeT("pt");
    expect(tp("count.seals", 1)).toBe("1 previsão guardada");
    expect(tp("count.seals", 2)).toBe("2 previsões guardadas");
  });
  it("escolhe o idioma pelo Accept-Language", () => {
    expect(matchLocale("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(matchLocale("fr-FR,fr;q=0.9")).toBe("pt");
    expect(matchLocale(null)).toBe("pt");
  });
});

describe("errorKey", () => {
  it("traduz os códigos das funções SQL", () => {
    expect(errorKey("topic_locked")).toBe("e.topic_locked");
    expect(errorKey('new row violates check constraint "x"')).toBe("e.check");
    expect(errorKey("algo estranho")).toBe("common.error");
  });
});

describe("hash no navegador = hash do banco", () => {
  it("usa a mesma fórmula da função SQL compute_commitment", async () => {
    const p = { topic_id: "t1", user_id: "u1", option_id: "o1", confidence: 70, salt: "abc", body: "texto é assim" } as unknown as Prediction;
    const expected = createHash("sha256").update("t1|u1|o1|70|abc|texto é assim", "utf8").digest("hex");
    expect(await computeCommitment(p)).toBe(expected);
    const free = { topic_id: "t1", user_id: "u1", salt: "abc", body: "x" } as unknown as Prediction;
    expect(await computeCommitment(free)).toBe(createHash("sha256").update("t1|u1|||abc|x", "utf8").digest("hex"));
  });
});

describe("computeStats", () => {
  const item = (hit: boolean, conf: number | null, day: number, status: "resolved" | "open" = "resolved"): VaultItem =>
    ({
      prediction: { option_id: hit ? "w" : "x", confidence: conf },
      topic: { kind: "event", status, revealed: status === "resolved", winning_option_id: status === "resolved" ? "w" : null, resolved_at: new Date(2026, 0, day).toISOString() },
    }) as unknown as VaultItem;

  it("calcula acerto, sequência atual e Brier (só com confiança informada)", () => {
    const s = computeStats([item(false, 80, 1), item(true, 80, 2), item(true, 80, 3), item(true, null, 4), item(true, 90, 5, "open")]);
    expect(s).toMatchObject({ total: 4, hits: 3, accuracy: 75, streak: 3, pending: 1 });
    expect(s.brier).toBeCloseTo((0.04 + 0.04 + 0.64) / 3, 3);
  });
  it("sem previsões resolvidas", () => {
    expect(computeStats([])).toMatchObject({ total: 0, accuracy: null, brier: null, streak: 0 });
  });
});

describe("pickDaily", () => {
  const mk = (id: string, hours: number, kind: "event" | "free" = "event"): Topic =>
    ({ id, kind, locks_at: new Date(Date.now() + hours * 3600_000).toISOString(), options: kind === "event" ? [{}, {}] : [] }) as unknown as Topic;
  it("prefere o evento que fecha em menos de 24h; ignora previsões livres", () => {
    expect(pickDaily([mk("a", 100), mk("b", 5), mk("c", 2, "free")])?.id).toBe("b");
    expect(pickDaily([mk("a", 100), mk("b", 200)])?.id).toBe("a");
    expect(pickDaily([mk("c", 2, "free")])).toBeUndefined();
  });
});
