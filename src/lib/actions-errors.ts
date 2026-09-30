/** Traduz erros do Postgres (mensagens das funções SQL) para português. */
const MESSAGES: Array<[RegExp, string]> = [
  [/not_authenticated/, "Entre na sua conta para continuar."],
  [/event_locked/, "Esse evento já fechou para novos lacres."],
  [/already_sealed/, "Você já lacrou um palpite neste evento. Lacre é lacre: não dá para trocar."],
  [/event_not_found/, "Evento não encontrado."],
  [/not_creator/, "Só quem criou o evento pode fazer isso."],
  [/event_not_locked_yet/, "Só dá para resolver depois que o prazo de lacres terminar."],
  [/event_not_open/, "Esse evento já foi encerrado."],
  [/invalid_option|foreign key/, "Opção inválida para este evento."],
  [/locks_at_in_past/, "O prazo precisa estar pelo menos 1 minuto no futuro."],
  [/locks_at_too_far/, "O prazo pode ser de no máximo 2 anos."],
  [/invalid_options_count/, "Informe entre 2 e 6 opções."],
  [/duplicate_options/, "As opções precisam ser diferentes entre si."],
  [/predictions_thesis_check/, "Sua tese precisa ter entre 10 e 1200 caracteres."],
  [/predictions_confidence_check/, "A confiança precisa estar entre 50% e 99%."],
  [/events_title_check/, "O título precisa ter entre 8 e 140 caracteres."],
];

export function friendlyError(message: string | undefined): string {
  if (!message) return "Algo deu errado. Tente de novo.";
  return MESSAGES.find(([re]) => re.test(message))?.[1] ?? "Algo deu errado. Tente de novo em instantes.";
}
