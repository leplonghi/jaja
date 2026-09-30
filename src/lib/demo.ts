import type { EventWithMeta, LeaderboardRow, Prediction, Profile, Seal } from "./types";

/**
 * Dados fictícios usados quando o Supabase não está configurado, só para
 * navegar pela interface. Nomes e eventos são inventados.
 */
const H = 3600_000;
const D = 24 * H;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

export const DEMO_PROFILES: Profile[] = [
  { id: "u1", handle: "marina_c", display_name: "Marina Costa", avatar_url: null },
  { id: "u2", handle: "rafa.previsto", display_name: "Rafa Lima", avatar_url: null },
  { id: "u3", handle: "julia_m", display_name: "Júlia Mendes", avatar_url: null },
  { id: "u4", handle: "theo_oraculo", display_name: "Theo Ramos", avatar_url: null },
];
const P = Object.fromEntries(DEMO_PROFILES.map((p) => [p.id, p]));

const opts = (event_id: string, labels: string[]) =>
  labels.map((label, i) => ({ id: `${event_id}-o${i + 1}`, event_id, label, position: i + 1 }));

function ev(
  id: string,
  title: string,
  category: EventWithMeta["category"],
  labels: string[],
  locks: string,
  seals: number,
  extra: Partial<EventWithMeta> = {},
): EventWithMeta {
  return {
    id,
    creator_id: "u1",
    title,
    description: null,
    category,
    locks_at: locks,
    status: "open",
    winning_option_id: null,
    resolved_at: null,
    created_at: ago(2 * D),
    options: opts(id, labels),
    seals,
    creator: P.u1,
    ...extra,
  };
}

export function demoEvents(): EventWithMeta[] {
  return [
    ev("d1", "A eleição presidencial será decidida já no 1º turno?", "politica", ["Sim", "Não"], ahead(3 * D + 5 * H), 1284, {
      description: "Vale o resultado oficial divulgado pela Justiça Eleitoral. Explique o cenário que você enxerga.",
    }),
    ev("d2", "O time da casa vence o clássico do fim de semana?", "esportes", ["Vence", "Empata", "Perde"], ahead(1 * D + 2 * H), 862),
    ev("d3", "O dólar fecha o mês acima do valor de hoje?", "economia", ["Sim", "Não"], ahead(12 * D), 341),
    ev("d4", "Um novo modelo de IA de ponta será lançado antes do fim do ano?", "tecnologia", ["Sim", "Não"], ahead(70 * D), 517),
    ev("d5", "A série mais comentada da semana bate recorde de audiência?", "cultura", ["Sim", "Não"], ahead(5 * H + 20 * 60_000), 129),
    ev("d6", "O jogo de ontem termina com mais de 2 gols?", "esportes", ["Sim", "Não"], ago(30 * 60_000), 96, {
      description: "Prazo encerrado. Os lacres continuam trancados até o resultado sair.",
    }),
    ev("d7", "Vai chover na abertura do festival?", "outros", ["Sim", "Não"], ago(3 * D), 4, {
      status: "resolved",
      winning_option_id: "d7-o1",
      resolved_at: ago(2 * D),
    }),
  ];
}

export function demoPredictions(eventId: string): Prediction[] {
  if (eventId !== "d7") return [];
  const mk = (i: number, user_id: string, option: number, confidence: number, thesis: string): Prediction => ({
    id: `d7-p${i}`,
    event_id: "d7",
    user_id,
    option_id: `d7-o${option}`,
    thesis,
    confidence,
    salt: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    commitment: `${(i * 7919).toString(16).padStart(8, "0")}c0ffee${"ab12cd34ef56".repeat(4)}`.slice(0, 64),
    created_at: ago(4 * D + i * H),
  });
  return [
    mk(1, "u1", 1, 78, "A frente fria chega na sexta à noite e o radar já mostra a linha de instabilidade. Vai pegar a abertura."),
    mk(2, "u2", 2, 60, "Todo ano dizem que vai chover e no fim abre o tempo. Vou de céu limpo."),
    mk(3, "u3", 1, 91, "Três modelos concordam no horário e o histórico de abril é de chuva forte no fim da tarde."),
    mk(4, "u4", 2, 70, "A previsão oficial exagerou nos últimos dois eventos. Aposto que desvia pro litoral."),
  ];
}

export function demoSeals(eventId: string): Seal[] {
  const preds = demoPredictions(eventId);
  if (preds.length) {
    return preds.map((p) => ({
      id: p.id,
      event_id: p.event_id,
      user_id: p.user_id,
      commitment: p.commitment,
      created_at: p.created_at,
      revealed: true,
      profile: P[p.user_id],
      prediction: p,
    }));
  }
  return DEMO_PROFILES.slice(0, 4).map((profile, i) => ({
    id: `${eventId}-s${i}`,
    event_id: eventId,
    user_id: profile.id,
    commitment: `${(i + 3) * 1234567}${"9f3a1c7e5b2d4086".repeat(4)}`.slice(0, 64),
    created_at: ago((i + 1) * 47 * 60_000),
    revealed: false,
    profile,
    prediction: null,
  }));
}

export const DEMO_LEADERBOARD: LeaderboardRow[] = [
  { user_id: "u3", handle: "julia_m", display_name: "Júlia Mendes", avatar_url: null, total: 24, hits: 19, accuracy: 79.2, brier: 0.142 },
  { user_id: "u4", handle: "theo_oraculo", display_name: "Theo Ramos", avatar_url: null, total: 41, hits: 30, accuracy: 73.2, brier: 0.171 },
  { user_id: "u1", handle: "marina_c", display_name: "Marina Costa", avatar_url: null, total: 17, hits: 12, accuracy: 70.6, brier: 0.19 },
  { user_id: "u2", handle: "rafa.previsto", display_name: "Rafa Lima", avatar_url: null, total: 33, hits: 21, accuracy: 63.6, brier: 0.238 },
];
