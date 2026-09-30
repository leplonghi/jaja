import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Roda contra um Postgres real: TEST_DATABASE_URL=postgres://postgres@localhost:5433/postgres npm test
const ADMIN_URL = process.env.TEST_DATABASE_URL;
const DB = "jaja_test";
const read = (p: string) => readFileSync(path.join(__dirname, "../..", p), "utf8");

/* eslint-disable @typescript-eslint/no-explicit-any */
describe.skipIf(!ADMIN_URL)("banco de dados (RLS + funções)", () => {
  let admin: pg.Client;
  let db: pg.Client;
  const u: Record<string, string> = {};

  /** Executa `fn` como um usuário logado (role authenticated + auth.uid()) ou anônimo. */
  async function as<T>(uid: string | null, fn: (q: pg.Client["query"]) => Promise<T>): Promise<T> {
    await db.query("begin");
    try {
      await db.query(`set local role ${uid ? "authenticated" : "anon"}`);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
      const out = await fn(db.query.bind(db) as pg.Client["query"]);
      await db.query("commit");
      return out;
    } catch (e) {
      await db.query("rollback");
      throw e;
    }
  }
  const rpc = async (uid: string | null, sql: string, params: unknown[] = []) =>
    (await as(uid, (q) => q(`select ${sql} as r`, params as any))).rows[0].r;
  const fails = (p: Promise<unknown>, msg: RegExp | string) => expect(p).rejects.toThrow(msg);

  async function mkUser(name: string, opts: { staff?: boolean; onboarded?: boolean } = {}) {
    const r = await db.query("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [
      `${name}@ex.com`,
      JSON.stringify({ full_name: name }),
    ]);
    u[name] = r.rows[0].id;
    await db.query("update public.profiles set is_staff = $2, onboarded_at = $3 where id = $1", [
      u[name],
      !!opts.staff,
      opts.onboarded === false ? null : new Date(),
    ]);
    return u[name] as string;
  }

  const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

  /** Evento criado pela equipe (abre direto). */
  async function mkEvent(creator = u.staff, opts: string[] = ["Sim", "Não"], electoral = false) {
    const id = await rpc(creator, "public.create_event($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
      "O resultado oficial será divulgado?", null, "politica", hours(1), hours(48),
      "Resultado divulgado no site oficial", null, opts, electoral,
    ]);
    const o = await db.query("select id, label from public.topic_options where topic_id=$1 order by position", [id]);
    return { id: id as string, options: o.rows as { id: string; label: string }[] };
  }
  const predict = (uid: string, topic: string, option: string | null, body = "", conf: number | null = null) =>
    as(uid, (q) => q("select * from public.seal_prediction($1,$2,$3,$4)", [topic, option, body, conf]));
  const lock = (id: string) => db.query("update public.topics set locks_at = now() - interval '1 second' where id=$1", [id]);
  const preds = async (uid: string | null, topic: string) => (await rpc(uid, "public.get_predictions($1)", [topic])) as any[];
  const free = (uid: string, o: Partial<{ title: string; body: string; vis: string; join: boolean; locks: string | null; reveal: string | null; electoral: boolean }> = {}) =>
    rpc(uid, "public.create_free_topic($1,$2,$3,$4,$5,$6,$7,$8)", [
      o.title ?? "Minha previsão", o.body ?? "Tenho certeza de que isso vai acontecer, e o motivo é este.",
      o.vis ?? "public", o.join ?? false, o.locks ?? null, o.reveal ?? hours(24), o.electoral ?? false, "outros",
    ]);

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${DB} with (force)`);
    await admin.query(`create database ${DB}`);
    const url = new URL(ADMIN_URL!);
    url.pathname = `/${DB}`;
    db = new pg.Client({ connectionString: url.toString() });
    await db.connect();
    await db.query(read("tests/db/stubs.sql"));
    await db.query(read("supabase/migrations/0001_jaja.sql"));
    await mkUser("staff", { staff: true });
    await mkUser("ana");
    await mkUser("bia");
    await mkUser("caio");
    await mkUser("novato", { onboarded: false });
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${DB} with (force)`);
    await admin?.end();
  });

  describe("perfis e onboarding", () => {
    it("cria o perfil automaticamente", async () => {
      const r = await db.query("select handle, display_name, is_staff from public.profiles where id=$1", [u.ana]);
      expect(r.rows[0]).toEqual({ handle: "ana", display_name: "ana", is_staff: false });
    });
    it("ninguém vira equipe sozinho", async () => {
      await fails(as(u.ana, (q) => q("update public.profiles set is_staff = true where id=$1", [u.ana])), /permission denied/);
      await as(u.ana, (q) => q("update public.profiles set display_name='Ana' where id=$1", [u.ana]));
    });
    it("só cria ou prevê depois do onboarding completo", async () => {
      await fails(rpc(u.novato, "public.create_free_topic($1,$2,$3,$4,$5,$6,$7,$8)",
        ["Teste", "Uma previsão qualquer de teste", "public", false, null, hours(2), false, "outros"]), "not_onboarded");
      await fails(rpc(u.novato, "public.complete_onboarding($1,$2)", [true, false]), "onboarding_incomplete");
      await rpc(u.novato, "public.complete_onboarding($1,$2)", [true, true]);
      const r = await db.query("select onboarded_at from public.profiles where id=$1", [u.novato]);
      expect(r.rows[0].onboarded_at).not.toBeNull();
    });
  });

  describe("eventos: criação e revisão", () => {
    const create = (uid: string | null, locks: string, resolve: string, opts: string[], src = "Fonte oficial do resultado") =>
      rpc(uid, "public.create_event($1,$2,$3,$4,$5,$6,$7,$8,$9)", ["Pergunta objetiva de teste?", null, "outros", locks, resolve, src, null, opts, false]);

    it("usuário comum cria evento pendente: só ele e a equipe veem", async () => {
      const id = await create(u.ana, hours(2), hours(50), ["Sim", "Não"]);
      expect(await rpc(u.bia, "public.get_topic($1)", [id])).toBeNull();
      expect(await rpc(null, "public.get_topic($1)", [id])).toBeNull();
      expect((await rpc(u.ana, "public.get_topic($1)", [id])).status).toBe("pending_review");
      expect((await rpc(u.staff, "public.get_topic($1)", [id])).status).toBe("pending_review");
      const listed = (await rpc(u.bia, "public.list_topics($1)", ["open"])) as any[];
      expect(listed.find((t) => t.id === id)).toBeUndefined();
      await fails(predict(u.bia, id, null), "topic_not_found");

      await rpc(u.staff, "public.review_topic($1,$2)", [id, true]);
      expect((await rpc(u.bia, "public.get_topic($1)", [id])).status).toBe("open");
    });
    it("só a equipe revisa; bloqueado nunca aparece", async () => {
      const id = await create(u.ana, hours(2), hours(50), ["Sim", "Não"]);
      await fails(rpc(u.ana, "public.review_topic($1,$2)", [id, true]), "staff_only");
      await rpc(u.staff, "public.review_topic($1,$2)", [id, false]);
      expect(await rpc(u.bia, "public.get_topic($1)", [id])).toBeNull();
    });
    it("valida prazos, fonte e opções", async () => {
      await fails(create(u.ana, hours(-1), hours(50), ["a", "b"]), "locks_at_in_past");
      await fails(create(u.ana, hours(2), hours(1), ["a", "b"]), "resolve_by_invalid");
      await fails(create(u.ana, hours(2), hours(50), ["a"]), "invalid_options_count");
      await fails(create(u.ana, hours(2), hours(50), ["Sim", "sim"]), "duplicate_options");
      await fails(create(u.ana, hours(2), hours(50), ["a", "b"], "curta"), /check constraint/);
    });
    it("não insere direto nas tabelas", async () => {
      await fails(as(u.ana, (q) => q("insert into public.topics (kind,host_id,title,locks_at) values ('free',$1,'abc',now())", [u.ana])), /permission denied/);
      await fails(as(u.ana, (q) => q("update public.topics set status='open'")), /permission denied/);
    });
  });

  describe("previsões em evento: sigilo e imutabilidade", () => {
    it("nem o criador espia; o autor vê a própria; o hash é público", async () => {
      const ev = await mkEvent();
      const s = await predict(u.bia, ev.id, ev.options[0].id, "Minha tese secreta para o evento", 80);
      const direct = await as(u.caio, (q) => q("select * from public.predictions where topic_id=$1", [ev.id]));
      expect(direct.rows).toHaveLength(0);
      await fails(as(null, (q) => q("select * from public.predictions")), /permission denied/);

      const other = (await preds(u.caio, ev.id))[0];
      expect(other.commitment).toBe(s.rows[0].commitment);
      expect(other.body).toBeUndefined();
      expect(other.option_id).toBeUndefined();
      const anon = (await preds(null, ev.id))[0];
      expect(anon.body).toBeUndefined();
      const mine = (await preds(u.bia, ev.id))[0];
      expect(mine).toMatchObject({ body: "Minha tese secreta para o evento", confidence: 80, mine: true });
    });
    it("texto é opcional em evento, opção é obrigatória", async () => {
      const ev = await mkEvent();
      await fails(predict(u.ana, ev.id, null), "option_required");
      await predict(u.ana, ev.id, ev.options[1].id);
    });
    it("imutável: sem INSERT, UPDATE ou DELETE direto", async () => {
      const ev = await mkEvent();
      await predict(u.bia, ev.id, ev.options[0].id);
      await fails(as(u.bia, (q) => q("update public.predictions set option_id=$1", [ev.options[1].id])), /permission denied/);
      await fails(as(u.bia, (q) => q("delete from public.predictions")), /permission denied/);
      await fails(as(u.caio, (q) => q("insert into public.predictions (topic_id,user_id,salt,commitment) values ($1,$2,'x','y')", [ev.id, u.caio])), /permission denied/);
    });
    it("um por pessoa; não prevê após o prazo nem com opção de outro evento", async () => {
      const ev = await mkEvent();
      const other = await mkEvent();
      await predict(u.bia, ev.id, ev.options[0].id);
      await fails(predict(u.bia, ev.id, ev.options[1].id), "already_sealed");
      await fails(predict(u.caio, ev.id, other.options[0].id), /violates foreign key/);
      await lock(ev.id);
      await fails(predict(u.caio, ev.id, ev.options[0].id), "topic_locked");
    });
    it("limita tamanho do texto e faixa de confiança", async () => {
      const ev = await mkEvent();
      await fails(predict(u.ana, ev.id, ev.options[0].id, "x".repeat(1201)), "body_length");
      await fails(predict(u.ana, ev.id, ev.options[0].id, "", 100), /check constraint/);
    });
  });

  describe("resolução e revelação", () => {
    it("só a equipe resolve, só depois do prazo, e revela tudo com hash conferível", async () => {
      const ev = await mkEvent();
      const s = await predict(u.bia, ev.id, ev.options[0].id, "Vai acontecer, pelos motivos já conhecidos", 65);
      await fails(rpc(u.staff, "public.resolve_event($1,$2)", [ev.id, ev.options[0].id]), "topic_not_locked_yet");
      await lock(ev.id);
      await fails(rpc(u.ana, "public.resolve_event($1,$2)", [ev.id, ev.options[0].id]), "staff_only");
      await fails(rpc(u.staff, "public.resolve_event($1,$2)", [ev.id, "00000000-0000-0000-0000-000000000000"]), "invalid_option");
      await rpc(u.staff, "public.resolve_event($1,$2)", [ev.id, ev.options[0].id]);
      await fails(rpc(u.staff, "public.resolve_event($1,$2)", [ev.id, ev.options[1].id]), "topic_not_open");

      const seen = (await preds(u.caio, ev.id))[0];
      expect(seen.body).toBe("Vai acontecer, pelos motivos já conhecidos");
      const hash = createHash("sha256")
        .update(`${seen.topic_id}|${seen.user_id}|${seen.option_id}|${seen.confidence}|${seen.salt}|${seen.body}`, "utf8")
        .digest("hex");
      expect(hash).toBe(s.rows[0].commitment);
    });
    it("cancelado nunca revela", async () => {
      const ev = await mkEvent();
      await predict(u.bia, ev.id, ev.options[0].id, "Texto que nunca deve aparecer para outros");
      await rpc(u.staff, "public.cancel_topic($1)", [ev.id]);
      expect((await preds(u.caio, ev.id))[0].body).toBeUndefined();
      await fails(predict(u.caio, ev.id, ev.options[0].id), "topic_locked");
    });
  });

  describe("previsão livre e desafio por link", () => {
    it("solo: rótulo e hash públicos, conteúdo fechado até a data", async () => {
      const r = await free(u.ana, { title: "Sobre a eleição", reveal: hours(5) });
      const t = await rpc(u.caio, "public.get_topic($1)", [r.topic_id]);
      expect(t).toMatchObject({ kind: "free", revealed: false, seals: 1 });
      const p = (await preds(u.caio, r.topic_id))[0];
      expect(p.commitment).toBe(r.commitment);
      expect(p.body).toBeUndefined();

      await db.query("update public.topics set reveal_at = now() - interval '1 second' where id=$1", [r.topic_id]);
      const after = (await preds(u.caio, r.topic_id))[0];
      expect(after.body).toContain("Tenho certeza");
      const hash = createHash("sha256")
        .update(`${after.topic_id}|${after.user_id}||${after.confidence ?? ""}|${after.salt}|${after.body}`, "utf8")
        .digest("hex");
      expect(hash).toBe(r.commitment);
    });
    it("por link não aparece em listas, mas abre com o link", async () => {
      const pub = await free(u.ana, { title: "Previsão pública visível" });
      const priv = await free(u.ana, { title: "Previsão só por link", vis: "link" });
      const listed = (await rpc(u.bia, "public.list_topics($1,$2)", ["waiting", "free"])) as any[];
      expect(listed.some((t) => t.id === pub.topic_id)).toBe(true);
      expect(listed.some((t) => t.id === priv.topic_id)).toBe(false);
      expect((await rpc(u.bia, "public.get_topic($1)", [priv.topic_id])).title).toBe("Previsão só por link");
      const direct = await as(u.bia, (q) => q("select id from public.topics where id=$1", [priv.topic_id]));
      expect(direct.rows).toHaveLength(0);
    });
    it("revelação manual só pelo autor; revelar adiantado tem margem mínima", async () => {
      const r = await free(u.ana, { reveal: null });
      await fails(rpc(u.bia, "public.reveal_now($1)", [r.topic_id]), "not_host");
      expect((await preds(u.bia, r.topic_id))[0].body).toBeUndefined();
      await rpc(u.ana, "public.reveal_now($1)", [r.topic_id]);
      expect((await preds(u.bia, r.topic_id))[0].body).toContain("Tenho certeza");
      await fails(free(u.ana, { reveal: hours(0.0001) }), "reveal_too_soon");
    });
    it("desafio: amigos entram pelo link, todos abrem juntos, depois ninguém entra", async () => {
      const c = await free(u.ana, { join: true, locks: hours(3), reveal: hours(6), vis: "link" });
      await predict(u.bia, c.topic_id, null, "Eu acho que vai dar o resultado contrário ao dela");
      await predict(u.caio, c.topic_id, null, "Concordo com a Ana, e o motivo é outro");
      await fails(predict(u.bia, c.topic_id, null, "Tentando entrar de novo no desafio"), "already_sealed");
      const hidden = await preds(u.bia, c.topic_id);
      expect(hidden.find((p) => p.user_id === u.ana).body).toBeUndefined();
      expect(hidden.find((p) => p.user_id === u.bia).body).toContain("contrário");
      await rpc(u.ana, "public.reveal_now($1)", [c.topic_id]);
      const open = await preds(u.caio, c.topic_id);
      expect(open.every((p) => typeof p.body === "string")).toBe(true);
      await fails(predict(u.staff, c.topic_id, null, "Chegando tarde demais no desafio"), "topic_locked");
    });
    it("solo não aceita convidados; texto curto é recusado", async () => {
      const r = await free(u.ana, {});
      await fails(predict(u.bia, r.topic_id, null, "Querendo entrar numa previsão solo"), "topic_locked");
      await fails(free(u.ana, { body: "curto" }), "body_length");
    });
  });

  describe("tema eleitoral", () => {
    it("só revela depois da liberação da equipe, mesmo com a data vencida", async () => {
      const r = await free(u.ana, { electoral: true, reveal: hours(3) });
      await db.query("update public.topics set reveal_at = now() - interval '1 second' where id=$1", [r.topic_id]);
      expect((await preds(u.bia, r.topic_id))[0].body).toBeUndefined();
      expect((await rpc(u.bia, "public.get_topic($1)", [r.topic_id])).revealed).toBe(false);
      await fails(rpc(u.ana, "public.release_electoral($1)", [r.topic_id]), "staff_only");
      await rpc(u.staff, "public.release_electoral($1)", [r.topic_id]);
      expect((await preds(u.bia, r.topic_id))[0].body).toContain("Tenho certeza");
    });
    it("revelação manual também fica retida", async () => {
      const r = await free(u.ana, { electoral: true, reveal: null });
      await fails(rpc(u.ana, "public.reveal_now($1)", [r.topic_id]), "electoral_hold");
    });
  });

  describe("moderação", () => {
    it("termo sinalizado retém o conteúdo até a equipe revisar", async () => {
      await db.query("insert into public.moderation_terms (term) values ('palavra_proibida_x')");
      const ev = await mkEvent();
      await predict(u.bia, ev.id, ev.options[0].id, "Texto com palavra_proibida_x no meio dele");
      await predict(u.caio, ev.id, ev.options[0].id, "Texto perfeitamente normal e educado");
      await lock(ev.id);
      await rpc(u.staff, "public.resolve_event($1,$2)", [ev.id, ev.options[0].id]);

      const seenByAna = await preds(u.ana, ev.id);
      const flagged = seenByAna.find((p) => p.user_id === u.bia);
      expect(flagged).toMatchObject({ held: true });
      expect(flagged.body).toBeUndefined();
      expect(seenByAna.find((p) => p.user_id === u.caio).body).toContain("normal");
      expect((await preds(u.bia, ev.id)).find((p) => p.mine).body).toContain("palavra_proibida_x");

      const q = await rpc(u.staff, "public.admin_queue()");
      expect(q.flagged_predictions.some((p: any) => p.id === flagged.id)).toBe(true);
      await fails(rpc(u.ana, "public.admin_queue()"), "staff_only");
      await rpc(u.staff, "public.review_prediction($1,$2)", [flagged.id, false]);
      expect((await preds(u.ana, ev.id)).find((p) => p.user_id === u.bia).body).toBeUndefined();
    });
    it("rótulo sinalizado manda o tópico para revisão", async () => {
      await db.query("insert into public.moderation_terms (term) values ('rotulo_ruim_y') on conflict do nothing");
      const r = await free(u.ana, { title: "Com rotulo_ruim_y aqui" });
      expect(await rpc(u.bia, "public.get_topic($1)", [r.topic_id])).toBeNull();
      expect((await rpc(u.ana, "public.get_topic($1)", [r.topic_id])).status).toBe("pending_review");
      await rpc(u.staff, "public.review_topic($1,$2)", [r.topic_id, true]);
      expect((await rpc(u.bia, "public.get_topic($1)", [r.topic_id])).status).toBe("open");
    });
    it("3 denúncias de pessoas diferentes sinalizam; repetidas não contam", async () => {
      const ev = await mkEvent();
      const p = await predict(u.ana, ev.id, ev.options[0].id, "Uma tese qualquer para ser denunciada");
      const pid = p.rows[0].id;
      await rpc(u.bia, "public.report_content($1,$2,$3)", [ev.id, pid, "ofensivo"]);
      await rpc(u.bia, "public.report_content($1,$2,$3)", [ev.id, pid, "ofensivo de novo"]);
      await rpc(u.caio, "public.report_content($1,$2,$3)", [ev.id, pid, "ofensivo"]);
      expect((await db.query("select moderation_status from public.predictions where id=$1", [pid])).rows[0].moderation_status).toBe("ok");
      await rpc(u.staff, "public.report_content($1,$2,$3)", [ev.id, pid, "ofensivo"]);
      expect((await db.query("select moderation_status from public.predictions where id=$1", [pid])).rows[0].moderation_status).toBe("flagged");
    });
    it("limite de criação por hora", async () => {
      const spam = await mkUser("spam");
      await db.query(
        "insert into public.topics (kind, host_id, title, locks_at) select 'free', $1, 'spam ' || g, now() from generate_series(1, 60) g",
        [spam],
      );
      await fails(free(spam, {}), "rate_limited");
    });
  });

  describe("ranking, cofre e perfil", () => {
    it("ranking: mínimo 3, acerto e Brier; brier nulo sem confiança", async () => {
      const carla = await mkUser("carla");
      const evs = [];
      for (let i = 0; i < 3; i++) {
        const ev = await mkEvent();
        await predict(carla, ev.id, i < 2 ? ev.options[0].id : ev.options[1].id, "", 80);
        evs.push(ev);
      }
      expect((await as(null, (q) => q("select * from public.leaderboard where user_id=$1", [carla]))).rows).toHaveLength(0);
      for (const ev of evs) {
        await lock(ev.id);
        await rpc(u.staff, "public.resolve_event($1,$2)", [ev.id, ev.options[0].id]);
      }
      const r = (await as(null, (q) => q("select * from public.leaderboard where user_id=$1", [carla]))).rows[0];
      expect(r).toMatchObject({ total: 3, hits: 2 });
      expect(Number(r.accuracy)).toBeCloseTo(66.7, 1);
      expect(Number(r.brier)).toBeCloseTo(0.24, 4);

      const dora = await mkUser("dora");
      for (let i = 0; i < 3; i++) {
        const ev = await mkEvent();
        await predict(dora, ev.id, ev.options[0].id);
        await lock(ev.id);
        await rpc(u.staff, "public.resolve_event($1,$2)", [ev.id, ev.options[0].id]);
      }
      const d = (await as(null, (q) => q("select * from public.leaderboard where user_id=$1", [dora]))).rows[0];
      expect(d.brier).toBeNull();
    });
    it("cofre lista as minhas previsões; perfil público só mostra o revelado e aprovado", async () => {
      const eva = await mkUser("eva");
      const ev = await mkEvent();
      await predict(eva, ev.id, ev.options[0].id, "Tese que só eu devo ver por enquanto");
      const secret = await free(eva, { vis: "link", reveal: hours(9) });
      const vault = (await rpc(eva, "public.my_vault()")) as any[];
      expect(vault.map((v) => v.topic.id).sort()).toEqual([ev.id, secret.topic_id].sort());
      expect(vault[0].prediction.body).toBeTruthy();

      const hist = await rpc(u.bia, "public.profile_history($1)", [eva]);
      expect(hist.items).toHaveLength(0);
      expect(hist.pending).toBe(1);

      await lock(ev.id);
      await rpc(u.staff, "public.resolve_event($1,$2)", [ev.id, ev.options[0].id]);
      const after = await rpc(u.bia, "public.profile_history($1)", [eva]);
      expect(after.items).toHaveLength(1);
      expect(after.items[0].prediction.body).toContain("Tese que só eu");
    });
    it("contador ao vivo respeita a visibilidade", async () => {
      const ev = await mkEvent();
      await predict(u.ana, ev.id, ev.options[0].id);
      await predict(u.bia, ev.id, ev.options[0].id);
      expect(await rpc(null, "public.seal_count($1)", [ev.id])).toBe(2);
      const pending = await rpc(u.ana, "public.create_event($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
        "Pergunta pendente de revisão?", null, "outros", hours(2), hours(9), "Fonte oficial do resultado", null, ["Sim", "Não"], false,
      ]);
      expect(await rpc(u.bia, "public.seal_count($1)", [pending])).toBeNull();
    });
  });
});
