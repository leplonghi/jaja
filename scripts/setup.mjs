#!/usr/bin/env node
// Assistente de configuração do jaja: `npm run setup`
// Pergunta só o que precisa, valida, grava as variáveis, aplica o banco e (opcional) faz o deploy.
//
// Não-interativo (útil em CI/testes): defina SUPABASE_URL, SUPABASE_KEY, SITE_URL, MIN_AGE e,
// opcionalmente, DATABASE_URL. Flags: --dry-run (não grava nem executa nada), --deploy, --yes.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const rl = process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;

const say = (m = "") => console.log(m);
const ok = (m) => say(`  ✔ ${m}`);
const warn = (m) => say(`  ! ${m}`);
const step = (n, t) => say(`\n[${n}] ${t}`);

async function ask(envName, question, { def = "", validate } = {}) {
  for (;;) {
    let v = process.env[envName];
    if (v === undefined) {
      if (!rl) throw new Error(`Faltou ${envName} (sem terminal interativo).`);
      v = (await rl.question(`  ${question}${def ? ` [${def}]` : ""}: `)).trim() || def;
    }
    const problem = validate?.(v);
    if (!problem) return v;
    say(`  ✖ ${problem}`);
    if (process.env[envName] !== undefined) throw new Error(`${envName} inválido: ${problem}`);
  }
}

const run = (cmd, argv, opts = {}) => spawnSync(cmd, argv, { cwd: root, stdio: "inherit", ...opts });
const has = (cmd) => spawnSync(cmd, ["--version"], { stdio: "ignore" }).status === 0;

say("jaja · configuração automática");
say("Nada é enviado a terceiros além de uma chamada de teste ao SEU projeto Supabase.");

// 1) Supabase
step(1, "Supabase (https://supabase.com/dashboard → seu projeto → Project Settings → API)");
const url = (
  await ask("SUPABASE_URL", "Project URL (https://xxxx.supabase.co)", {
    validate: (v) => (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(v) ? "" : "Deve ser algo como https://abcdxyz.supabase.co"),
  })
).replace(/\/$/, "");
const key = await ask("SUPABASE_KEY", "Chave publishable (sb_publishable_...) ou anon (eyJ...)", {
  validate: (v) => {
    if (/service_role/i.test(v)) return "Essa parece ser a chave service_role. NUNCA use aqui: use a publishable/anon.";
    if (/^sb_secret_/.test(v)) return "Essa é uma chave SECRETA. Use a publishable (sb_publishable_...) ou a anon.";
    return /^(sb_publishable_|eyJ)/.test(v) ? "" : "Deve começar com sb_publishable_ ou eyJ";
  },
});
try {
  const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
  if (r.ok) ok("Supabase respondeu e aceitou a chave.");
  else warn(`Supabase respondeu ${r.status}: confira URL e chave.`);
} catch (e) {
  warn(`Não consegui falar com o Supabase daqui (${e.cause?.code ?? e.message}). Seguindo mesmo assim.`);
}

// 2) Site
step(2, "Endereço do site e idade mínima");
say("  Na primeira vez use http://localhost:3000; depois do 1º deploy, rode de novo com a URL real.");
const site = (
  await ask("SITE_URL", "URL pública do site", {
    def: "http://localhost:3000",
    validate: (v) => (/^https?:\/\/[^\s/]+/.test(v) ? "" : "Informe uma URL começando com http:// ou https://"),
  })
).replace(/\/$/, "");
const age = await ask("MIN_AGE", "Idade mínima (definir com orientação jurídica)", {
  def: "18",
  validate: (v) => (/^\d{1,2}$/.test(v) && +v >= 13 && +v <= 21 ? "" : "Número entre 13 e 21"),
});

// 3) Gravar variáveis
step(3, "Gravando variáveis");
const envLocal = `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\nNEXT_PUBLIC_SITE_URL=${site}\nMIN_AGE_BR=${age}\n`;
const block = `# --- env:begin
env:
  - variable: NEXT_PUBLIC_SUPABASE_URL
    value: ${url}
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    value: ${key}
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_SITE_URL
    value: ${site}
    availability: [BUILD, RUNTIME]
  - variable: MIN_AGE_BR
    value: "${age}"
    availability: [RUNTIME]
# --- env:end`;
const yamlPath = join(root, "apphosting.yaml");
const yaml = readFileSync(yamlPath, "utf8");
const nextYaml = yaml.replace(/# --- env:begin[\s\S]*# --- env:end/, block);
if (nextYaml === yaml && !yaml.includes(block)) throw new Error("Marcadores env:begin/env:end não encontrados no apphosting.yaml");
if (DRY) {
  warn("--dry-run: nada gravado. Seria escrito em .env.local e apphosting.yaml:");
  say(block.replace(key, "<chave>"));
} else {
  writeFileSync(join(root, ".env.local"), envLocal);
  writeFileSync(yamlPath, nextYaml);
  ok(".env.local (não vai para o git) e apphosting.yaml atualizados. A chave publishable é pública por natureza.");
}

// 4) Banco
step(4, "Banco de dados");
const migration = join(root, "supabase/migrations/0001_jaja.sql");
const dbUrl = process.env.DATABASE_URL;
if (dbUrl && has("psql")) {
  const exists = spawnSync("psql", [dbUrl, "-tAc", "select to_regclass('public.profiles') is not null"], { encoding: "utf8" });
  if (exists.status !== 0) warn(`psql falhou: ${exists.stderr.trim()}`);
  else if (exists.stdout.trim() === "t") ok("O banco já tem as tabelas do jaja: migração pulada.");
  else if (DRY) warn("--dry-run: a migração seria aplicada agora.");
  else {
    const r = run("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", migration]);
    if (r.status === 0) ok("Migração aplicada.");
    else warn("A migração falhou (veja acima).");
  }
} else {
  say("  Sem DATABASE_URL (ou sem psql), faça pelo painel, é rápido:");
  say("   1. Abra https://supabase.com/dashboard → seu projeto → SQL Editor → New query");
  say(`   2. Cole o conteúdo de ${migration} e clique em Run`);
  say("   (Automático na próxima vez: DATABASE_URL='postgresql://...' npm run setup, com psql instalado.)");
}

// 5) Login do Supabase
step(5, "Login (faça no painel do Supabase; guia completo em docs/DEPLOY.md)");
say(`  Redirect URL a cadastrar em Authentication → URL Configuration:  ${site}/auth/callback`);
say(`  Site URL:                                                       ${site}`);

// 6) Deploy
step(6, "Deploy no Firebase App Hosting");
const project = process.env.FIREBASE_PROJECT ?? (rl && !DRY ? (await rl.question("  ID do projeto Firebase (vazio = pular deploy): ")).trim() : "");
if (!project) {
  say("  Pulado. Quando quiser:  FIREBASE_PROJECT=seu-id npm run deploy");
} else if (DRY) {
  warn(`--dry-run: faria o deploy no projeto ${project}.`);
} else {
  const fb = ["--yes", "firebase-tools@15"];
  const who = spawnSync("npx", [...fb, "projects:list", "--json"], { cwd: root, encoding: "utf8" });
  if (who.status !== 0) {
    say("  Você ainda não está logado no Firebase. Abrindo o login (vai abrir o navegador)…");
    if (run("npx", [...fb, "login"]).status !== 0) throw new Error("Login do Firebase não concluído.");
  }
  const r = run("bash", ["scripts/deploy-firebase.sh"], { env: { ...process.env, FIREBASE_PROJECT: project } });
  if (r.status === 0) ok("Deploy concluído.");
  else warn("O deploy falhou (veja acima).");
}

say("\nPronto. Próximos passos e solução de problemas: docs/DEPLOY.md");
rl?.close();
