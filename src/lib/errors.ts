import type { Key } from "@/i18n";
import { pt } from "@/i18n/pt";

const CODES = Object.keys(pt)
  .filter((k) => k.startsWith("e.") && k !== "e.check")
  .map((k) => k.slice(2));

/** Traduz a mensagem de erro do Postgres em uma chave do dicionário. */
export function errorKey(message: string | undefined): Key {
  if (!message) return "common.error";
  const code = CODES.find((c) => message.includes(c));
  if (code) return `e.${code}` as Key;
  if (/check constraint|violates foreign key|invalid input/i.test(message)) return "e.check";
  return "common.error";
}
