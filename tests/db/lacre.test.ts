import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Roda contra um Postgres real: TEST_DATABASE_URL=postgres://postgres@localhost:5433/postgres npm test
const ADMIN_URL = process.env.TEST_DATABASE_URL;
const DB = "lacre_test";

const read = (p: string) => readFileSync(path.join(__dirname, "../..", p), "utf8");

describe.skipIf(!ADMIN_URL)("banco de dados (RLS + funções)", () => {
  let admin: pg.Client;
  let db: pg.Client;

  const users: Record<string, string> = {};

  /** Executa `fn` como um usuário logado (role authenticated + auth.uid()). */
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

  const expectFail = async (p: Promise<unknown>, msg: RegExp | string) =>
    expect(p).rejects.toThrow(msg);

  async function newUser(name: string, email = `${name}@ex.com`, meta: object = {}) {
    const r = await db.query("insert into auth.users (email, raw_user_meta_data) values ($1,$2) returning id", [
      email,
      JSON.stringify(meta),
    ]);
    users[name] = r.rows[0].id;
    return r.rows[0].id as string;
  }

  async function newEvent(creator: string, opts = ["Sim", "Não"]) {
    const r = await as(creator, (q) =>
      q("select public.create_event($1,$2,$3,$4,$5) as id", [
        "Quem vence a final do campeonato?",
        "Descrição",
        "esportes",
        new Date(Date.now() + 3600_000).toISOString(),
        opts,
      ]),
    );
    const id = r.rows[0].id as string;
    const o = await db.query("select id, label from public.event_options where event_id=$1 order by position", [id]);
    return { id, options: o.rows as { id: string; label: string }[] };
  }

  const seal = (uid: string, eventId: string, optionId: string, thesis = "Minha tese bem fundamentada", conf = 70) =>
    as(uid, (q) => q("select * from public.seal_prediction($1,$2,$3,$4)", [eventId, optionId, thesis, conf]));

  const lock = (eventId: string) =>
    db.query("update public.events set locks_at = now() - interval '1 second' where id=$1", [eventId]);

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${DB} with (force)`);
    await admin.query(`create database ${DB}`);
    const u = new URL(ADMIN_URL!);
    u.pathname = `/${DB}`;
    db = new pg.Client({ connectionString: u.toString() });
    await db.connect();
    await db.query(read("tests/db/stubs.sql"));
    await db.query(read("supabase/migrations/0001_init.sql"));
    await newUser("ana", "ana@ex.com", { full_name: "Ana Silva", avatar_url: "https://x/a.png" });
    await newUser("bia", "bia@ex.com");
    await newUser("caio", "caio@ex.com");
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${DB} with (force)`);
    await admin?.end();
  });

  describe("perfis", () => {
    it("cria perfil automático com nome e avatar do provedor", async () => {
      const r = await db.query("select * from public.profiles where id=$1", [users.ana]);
      expect(r.rows[0]).toMatchObject({ handle: "ana", display_name: "Ana Silva", avatar_url: "https://x/a.png" });
    });

    it("gera handles únicos para e-mails parecidos", async () => {
      const a = await newUser("dup1", "joao@a.com");
      const b = await newUser("dup2", "joao@b.com");
      const r = await db.query("select handle from public.profiles where id in ($1,$2)", [a, b]);
      expect(new Set(r.rows.map((x) => x.handle)).size).toBe(2);
    });

    it("usuário só edita o próprio perfil", async () => {
      await as(users.ana, (q) => q("update public.profiles set display_name='Ana S.' where id=$1", [users.ana]));
      const r = await as(users.ana, (q) => q("update public.profiles set display_name='hack' where id=$1", [users.bia]));
      expect(r.rowCount).toBe(0);
    });
  });

  describe("create_event", () => {
    const call = (uid: string | null, locks: Date, opts: string[]) =>
      as(uid, (q) => q("select public.create_event($1,$2,$3,$4,$5)", ["Um título válido aqui", null, "outros", locks.toISOString(), opts]));
    const future = () => new Date(Date.now() + 86400_000);

    it("exige login", async () => {
      await expectFail(call(null, future(), ["a", "b"]), /permission denied|not_authenticated/);
    });
    it("recusa data no passado", async () => {
      await expectFail(call(users.ana, new Date(Date.now() - 1000), ["a", "b"]), "locks_at_in_past");
    });
    it("recusa menos de 2 ou mais de 6 opções e duplicadas", async () => {
      await expectFail(call(users.ana, future(), ["a"]), "invalid_options_count");
      await expectFail(call(users.ana, future(), ["a", "b", "c", "d", "e", "f", "g"]), "invalid_options_count");
      await expectFail(call(users.ana, future(), ["Sim", "sim"]), "duplicate_options");
    });
    it("não permite inserir evento direto na tabela", async () => {
      await expectFail(
        as(users.ana, (q) => q("insert into public.events (creator_id,title,locks_at) values ($1,'titulo direto','2030-01-01')", [users.ana])),
        /permission denied/,
      );
    });
  });

  describe("lacre e sigilo", () => {
    it("autor vê o próprio palpite; outros e anônimos não veem nada", async () => {
      const ev = await newEvent(users.ana);
      await seal(users.bia, ev.id, ev.options[0].id, "Tese secreta da Bia", 80);

      const mine = await as(users.bia, (q) => q("select thesis, confidence from public.predictions where event_id=$1", [ev.id]));
      expect(mine.rows).toEqual([{ thesis: "Tese secreta da Bia", confidence: 80 }]);

      const others = await as(users.caio, (q) => q("select * from public.predictions where event_id=$1", [ev.id]));
      expect(others.rows).toHaveLength(0);
      // nem o criador do evento consegue espiar
      const creator = await as(users.ana, (q) => q("select * from public.predictions where event_id=$1", [ev.id]));
      expect(creator.rows).toHaveLength(0);
      await expectFail(as(null, (q) => q("select * from public.predictions")), /permission denied/);
    });

    it("todos veem que o lacre existe e o hash, mas sem conteúdo", async () => {
      const ev = await newEvent(users.ana);
      const s = await seal(users.bia, ev.id, ev.options[1].id);
      const view = await as(users.caio, (q) => q("select * from public.public_seals where event_id=$1", [ev.id]));
      expect(view.rows).toHaveLength(1);
      expect(view.rows[0].commitment).toBe(s.rows[0].commitment);
      expect(view.rows[0].revealed).toBe(false);
      expect(Object.keys(view.rows[0]).sort()).toEqual(["commitment", "created_at", "event_id", "id", "revealed", "user_id"]);
      const anon = await as(null, (q) => q("select count(*)::int as n from public.public_seals where event_id=$1", [ev.id]));
      expect(anon.rows[0].n).toBe(1);
    });

    it("palpite é imutável: sem INSERT, UPDATE ou DELETE direto", async () => {
      const ev = await newEvent(users.ana);
      await seal(users.bia, ev.id, ev.options[0].id);
      await expectFail(
        as(users.bia, (q) => q("update public.predictions set option_id=$1 where user_id=$2", [ev.options[1].id, users.bia])),
        /permission denied/,
      );
      await expectFail(as(users.bia, (q) => q("delete from public.predictions where user_id=$1", [users.bia])), /permission denied/);
      await expectFail(
        as(users.caio, (q) =>
          q("insert into public.predictions (event_id,user_id,option_id,thesis,confidence,salt,commitment) values ($1,$2,$3,'tese forjada aqui',60,'x','y')", [ev.id, users.caio, ev.options[0].id]),
        ),
        /permission denied/,
      );
    });

    it("um lacre por pessoa por evento", async () => {
      const ev = await newEvent(users.ana);
      await seal(users.bia, ev.id, ev.options[0].id);
      await expectFail(seal(users.bia, ev.id, ev.options[1].id), "already_sealed");
    });

    it("não lacra depois do prazo nem com opção de outro evento", async () => {
      const ev = await newEvent(users.ana);
      const other = await newEvent(users.ana);
      await expectFail(seal(users.bia, ev.id, other.options[0].id), /violates foreign key/);
      await lock(ev.id);
      await expectFail(seal(users.bia, ev.id, ev.options[0].id), "event_locked");
    });

    it("valida tese curta e confiança fora de 50–99", async () => {
      const ev = await newEvent(users.ana);
      await expectFail(seal(users.bia, ev.id, ev.options[0].id, "curta", 70), /check constraint/);
      await expectFail(seal(users.bia, ev.id, ev.options[0].id, "tese suficientemente longa", 100), /check constraint/);
      await expectFail(seal(users.bia, ev.id, ev.options[0].id, "tese suficientemente longa", 49), /check constraint/);
    });
  });

  describe("resolução e revelação", () => {
    it("só o criador resolve, e só depois do prazo", async () => {
      const ev = await newEvent(users.ana);
      await expectFail(as(users.ana, (q) => q("select public.resolve_event($1,$2)", [ev.id, ev.options[0].id])), "event_not_locked_yet");
      await lock(ev.id);
      await expectFail(as(users.bia, (q) => q("select public.resolve_event($1,$2)", [ev.id, ev.options[0].id])), "not_creator");
      await as(users.ana, (q) => q("select public.resolve_event($1,$2)", [ev.id, ev.options[0].id]));
      await expectFail(as(users.ana, (q) => q("select public.resolve_event($1,$2)", [ev.id, ev.options[1].id])), "event_not_open");
    });

    it("revela tudo para todos e o hash confere com os dados revelados", async () => {
      const ev = await newEvent(users.ana);
      const s = await seal(users.bia, ev.id, ev.options[0].id, "Vai ganhar nos pênaltis, aposto", 65);
      await lock(ev.id);
      await as(users.ana, (q) => q("select public.resolve_event($1,$2)", [ev.id, ev.options[0].id]));

      const seen = await as(users.caio, (q) => q("select * from public.predictions where event_id=$1", [ev.id]));
      expect(seen.rows).toHaveLength(1);
      const p = seen.rows[0];
      expect(p.thesis).toBe("Vai ganhar nos pênaltis, aposto");

      const recomputed = createHash("sha256")
        .update(`${p.event_id}|${p.user_id}|${p.option_id}|${p.confidence}|${p.salt}|${p.thesis}`, "utf8")
        .digest("hex");
      expect(recomputed).toBe(s.rows[0].commitment);

      const anon = await as(null, (q) => q("select revealed from public.public_seals where event_id=$1", [ev.id]));
      expect(anon.rows[0].revealed).toBe(true);
    });

    it("evento cancelado nunca revela", async () => {
      const ev = await newEvent(users.ana);
      await seal(users.bia, ev.id, ev.options[0].id);
      await as(users.ana, (q) => q("select public.cancel_event($1)", [ev.id]));
      const seen = await as(users.caio, (q) => q("select * from public.predictions where event_id=$1", [ev.id]));
      expect(seen.rows).toHaveLength(0);
      await expectFail(seal(users.caio, ev.id, ev.options[0].id), "event_locked");
    });
  });

  describe("ranking", () => {
    it("só entra com 3+ palpites resolvidos e calcula acerto e Brier", async () => {
      const carla = await newUser("carla", "carla@ex.com");
      const evs = [];
      for (let i = 0; i < 3; i++) {
        const ev = await newEvent(users.ana);
        // 2 acertos (opção 0 vence) e 1 erro
        await seal(carla, ev.id, i < 2 ? ev.options[0].id : ev.options[1].id, "Tese de teste número " + i, 80);
        evs.push(ev);
      }
      const before = await as(null, (q) => q("select * from public.leaderboard where user_id=$1", [carla]));
      expect(before.rows).toHaveLength(0);
      for (const ev of evs) {
        await lock(ev.id);
        await as(users.ana, (q) => q("select public.resolve_event($1,$2)", [ev.id, ev.options[0].id]));
      }
      const r = await as(null, (q) => q("select * from public.leaderboard where user_id=$1", [carla]));
      expect(r.rows[0]).toMatchObject({ total: 3, hits: 2 });
      expect(Number(r.rows[0].accuracy)).toBeCloseTo(66.7, 1);
      // (0.2² + 0.2² + 0.8²)/3 = 0.24
      expect(Number(r.rows[0].brier)).toBeCloseTo(0.24, 4);
    });
  });
});
