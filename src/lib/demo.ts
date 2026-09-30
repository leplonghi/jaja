import type { LeaderboardRow, Prediction, Profile, Topic, TopicOption } from "./types";

/**
 * Dados fictícios usados quando o Supabase não está configurado, só para
 * navegar pela interface. Nomes, eventos e textos são inventados.
 */
const H = 3600_000;
const D = 24 * H;
const at = (ms: number) => new Date(Date.now() + ms).toISOString();

export const DEMO_PROFILES: Profile[] = [
  { id: "u1", handle: "marina_c", display_name: "Marina Costa", avatar_url: null },
  { id: "u2", handle: "rafa_lima", display_name: "Rafa Lima", avatar_url: null },
  { id: "u3", handle: "julia_m", display_name: "Júlia Mendes", avatar_url: null },
  { id: "u4", handle: "theo_ramos", display_name: "Theo Ramos", avatar_url: null },
];
const P = Object.fromEntries(DEMO_PROFILES.map((p) => [p.id, p]));

const opts = (id: string, labels: string[]): TopicOption[] =>
  labels.map((label, i) => ({ id: `${id}-o${i + 1}`, label, position: i + 1 }));

type Extra = Partial<Topic>;
function topic(id: string, title: string, category: Topic["category"], seals: number, extra: Extra): Topic {
  return {
    id,
    kind: "event",
    title,
    description: null,
    category,
    visibility: "public",
    status: "open",
    locks_at: at(D),
    reveal_at: null,
    resolve_by: at(3 * D),
    source_note: "Resultado oficial divulgado no site da organização.",
    source_url: null,
    allow_join: false,
    is_electoral: false,
    released: true,
    winning_option_id: null,
    resolved_at: null,
    revealed_at: null,
    created_at: at(-2 * D),
    revealed: false,
    seals,
    options: opts(id, ["Sim", "Não"]),
    host: P.u1,
    my_prediction_id: null,
    ...extra,
  };
}

export function demoTopics(): Topic[] {
  return [
    topic("demo-e1", "A eleição presidencial será decidida já no 1º turno?", "politica", 1284, {
      locks_at: at(3 * D + 5 * H),
      is_electoral: true,
      released: false,
      source_note: "Resultado oficial proclamado pela Justiça Eleitoral.",
    }),
    topic("demo-e2", "O time da casa vence o clássico do fim de semana?", "esportes", 862, {
      locks_at: at(D + 2 * H),
      source_note: "Placar final no site oficial da liga.",
    }),
    topic("demo-e3", "O dólar fecha o mês acima do valor de hoje?", "economia", 341, { locks_at: at(12 * D) }),
    topic("demo-e4", "Um novo modelo de IA de ponta será lançado antes do fim do ano?", "tecnologia", 517, {
      locks_at: at(70 * D),
    }),
    topic("demo-e5", "A série mais comentada da semana bate recorde de audiência?", "cultura", 129, {
      locks_at: at(5 * H + 20 * 60_000),
    }),
    topic("demo-e6", "O jogo de ontem termina com mais de 2 gols?", "esportes", 96, { locks_at: at(-30 * 60_000) }),
    topic("demo-e7", "Vai chover na abertura do festival?", "outros", 4, {
      status: "resolved",
      revealed: true,
      winning_option_id: "demo-e7-o1",
      resolved_at: at(-2 * D),
      locks_at: at(-3 * D),
    }),
    topic("demo-f1", "Minha previsão sobre a eleição", "politica", 1, {
      kind: "free",
      host: P.u1,
      is_electoral: true,
      released: false,
      locks_at: at(-H),
      reveal_at: at(4 * D),
      source_note: null,
      resolve_by: null,
      options: [],
    }),
    topic("demo-f2", "Desafio: quem acerta o campeão do ano?", "esportes", 4, {
      kind: "free",
      host: P.u3,
      visibility: "link",
      allow_join: true,
      locks_at: at(2 * D),
      reveal_at: at(3 * D),
      source_note: null,
      resolve_by: null,
      options: [],
    }),
    topic("demo-f3", "Eu avisei sobre o novo disco", "cultura", 1, {
      kind: "free",
      host: P.u4,
      revealed: true,
      locks_at: at(-12 * D),
      reveal_at: at(-2 * D),
      created_at: at(-12 * D),
      source_note: null,
      resolve_by: null,
      options: [],
    }),
  ];
}

const hex = (seed: number) => {
  let h = "";
  let x = seed * 2654435761;
  while (h.length < 64) {
    x = (x * 1103515245 + 12345) >>> 0;
    h += x.toString(16).padStart(8, "0");
  }
  return h.slice(0, 64);
};

export function demoPredictions(topicId: string): Prediction[] {
  const all = demoTopics();
  const t = all.find((x) => x.id === topicId);
  if (!t) return [];
  const mk = (i: number, userId: string, agoMs: number, content?: Partial<Prediction>): Prediction => ({
    id: `${topicId}-p${i}`,
    topic_id: topicId,
    user_id: userId,
    created_at: at(-agoMs),
    commitment: hex(i * 7 + topicId.length * 13),
    mine: false,
    held: false,
    handle: P[userId].handle,
    display_name: P[userId].display_name,
    avatar_url: null,
    ...(t.revealed ? { salt: "a1b2c3d4e5f60718293a4b5c6d7e8f90", moderation: "ok" as const, ...content } : {}),
  });

  if (topicId === "demo-e7") {
    return [
      mk(1, "u1", 4 * D, { option_id: "demo-e7-o1", confidence: 78, body: "A frente fria chega na sexta à noite e o radar já mostra a linha de instabilidade. Vai pegar a abertura." }),
      mk(2, "u2", 4 * D, { option_id: "demo-e7-o2", confidence: 60, body: "Todo ano dizem que vai chover e no fim abre o tempo. Vou de céu limpo." }),
      mk(3, "u3", 4 * D, { option_id: "demo-e7-o1", confidence: 91, body: "Três modelos concordam no horário e o histórico de abril é de chuva forte no fim da tarde." }),
      mk(4, "u4", 4 * D, { option_id: "demo-e7-o2", confidence: 70, body: "A previsão oficial exagerou nos últimos dois eventos. Aposto que desvia pro litoral." }),
    ];
  }
  if (topicId === "demo-f3") {
    return [mk(1, "u4", 12 * D, { body: "O próximo disco vai ser todo acústico e sai antes do fim do ano. Ouvi o ensaio aberto e o repertório não tem uma faixa elétrica." })];
  }
  const n = Math.min(t.seals, 4);
  return DEMO_PROFILES.slice(0, n).map((p, i) => mk(i + 1, p.id, (i + 1) * 47 * 60_000));
}

export const DEMO_LEADERBOARD: LeaderboardRow[] = [
  { user_id: "u3", handle: "julia_m", display_name: "Júlia Mendes", avatar_url: null, total: 24, hits: 19, accuracy: 79.2, brier: 0.142 },
  { user_id: "u4", handle: "theo_ramos", display_name: "Theo Ramos", avatar_url: null, total: 41, hits: 30, accuracy: 73.2, brier: 0.171 },
  { user_id: "u1", handle: "marina_c", display_name: "Marina Costa", avatar_url: null, total: 17, hits: 12, accuracy: 70.6, brier: 0.19 },
  { user_id: "u2", handle: "rafa_lima", display_name: "Rafa Lima", avatar_url: null, total: 33, hits: 21, accuracy: 63.6, brier: 0.238 },
];
