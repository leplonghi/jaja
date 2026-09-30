# Lacre — preveja agora, revele depois

App de **palpites lacrados**. Você escreve o que vai acontecer (eleição, jogo, lançamento…), o app tranca a previsão com um selo criptográfico (SHA-256) e, quando o evento é resolvido, **todos os lacres abrem de uma vez**, com prova de que ninguém editou nada.

> "Lacre" é um nome de trabalho. Para trocar, edite `APP_NAME` em `src/components/Logo.tsx` (e `manifest.ts`, `icon.tsx`, `opengraph-image.tsx`).

## O que já está pronto

| Área | O que faz |
|---|---|
| Login | Google, Apple e e-mail (link mágico, sem senha) via Supabase Auth |
| Eventos | Qualquer usuário cria um evento (2–6 opções, prazo, categoria). O criador informa o resultado depois do prazo |
| Lacre | Opção + tese + confiança (50–99%). Confirmação "não dá para editar", animação de carimbo, link de compartilhamento |
| Sigilo | O conteúdo é escondido **pelo banco (RLS)**, não pela interface |
| Revelação | Resolver o evento revela todos os palpites, com ✓/✗ e botão **Verificar lacre** (recalcula o SHA-256 no navegador) |
| Cofre | Seus palpites, sequência de acertos, taxa de acerto e Brier score |
| Ranking / perfis | Ranking por acerto e calibragem; perfil público só mostra palpites já revelados |
| Viral | Página pública por lacre (`/p/[id]`) com card social (OG image) que **nunca vaza o conteúdo** antes da revelação; Web Share no celular |
| PWA / mobile | Layout mobile-first com barra inferior, manifest e ícone |

## Como o "lacre" funciona (e o que ele garante)

Tudo em `supabase/migrations/0001_init.sql`:

1. **Sigilo no banco.** A policy de `predictions` só deixa ler quem é o autor ou quando o evento está `resolved`. Nem o criador do evento consegue espiar. A view `public_seals` expõe apenas *quem lacrou, quando e o hash*.
2. **Imutável.** Não existe policy nem privilégio de `INSERT/UPDATE/DELETE` em `predictions`. O único caminho é a função `seal_prediction`.
3. **Hora e hash vêm do servidor.** `seal_prediction` valida o prazo (`locks_at`), gera um `salt` aleatório e calcula
   `sha256(event_id | user_id | option_id | confiança | salt | tese)`.
4. **Verificável.** Após a revelação, o `salt` fica visível e qualquer pessoa recalcula o hash (`src/lib/hash.ts`, mesma fórmula da função SQL `compute_commitment`).

### Limites do modelo de confiança (leia antes de divulgar)

- **Quem opera o banco (você) tecnicamente consegue alterar dados.** O hash prova a integridade *para quem o guardou antes* (ex.: print/link compartilhado no momento do lacre), não é uma prova independente. Para prova de terceiros, o próximo passo natural é ancorar os hashes em um serviço público de carimbo de tempo (por exemplo, OpenTimestamps). Isso **não** está implementado.
- **Quem decide o resultado é o criador do evento.** Isso funciona bem para grupos e comunidades, mas exige reputação: por isso o criador é exibido em cada evento e o formulário pede a fonte oficial. Não há mecanismo de disputa ainda.
- **Sem dinheiro.** O produto é reputação/entretenimento. Adicionar dinheiro muda o enquadramento legal (apostas) e não deve ser feito sem análise jurídica.

## Rodando localmente

Requisitos: Node 20+ e um projeto Supabase (grátis).

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto
npm run dev
```

**Sem `.env.local` o app abre em modo demonstração** (dados fictícios, somente leitura), útil para ver o design.

### 1) Banco de dados

No painel do Supabase → **SQL Editor**, cole e execute `supabase/migrations/0001_init.sql`.
(Ou, com a CLI: `supabase link` e `supabase db push`.)

Copie **Project URL** e a chave **anon/publishable** (Project Settings → API) para o `.env.local`.

### 2) Login (Authentication → Sign In / Providers)

- **E-mail:** já vem ativo. Em *Authentication → URL Configuration* defina **Site URL** (`http://localhost:3000` em dev, o domínio em produção) e adicione em **Redirect URLs**: `http://localhost:3000/auth/callback` e `https://SEU-DOMINIO/auth/callback`.
- **Google:** crie um *OAuth client (Web)* no Google Cloud Console; em *Authorized redirect URIs* coloque `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Cole *Client ID* e *Secret* no provedor Google do Supabase.
- **Apple:** exige conta **Apple Developer Program (paga)**. Crie um *App ID* e um *Services ID* com "Sign in with Apple", registre o mesmo callback do Supabase como *Return URL* e gere uma *Key* (.p8). No Supabase informe Services ID, Team ID, Key ID e o segredo (um JWT gerado a partir da .p8 — **expira em até 6 meses**, então agende a renovação). Siga o guia oficial do Supabase para "Login with Apple".
- Para e-mails de link mágico em volume, configure um SMTP próprio (o SMTP padrão do Supabase tem limite baixo).

### 3) Deploy (Vercel)

Importe o repositório e defina as variáveis de `.env.example`. `NEXT_PUBLIC_SITE_URL` deve ser o domínio final (usado nos links e nos cards sociais).

## Testes

```bash
npm run typecheck && npm run lint
npm test                                   # testes unitários (os de banco são ignorados sem a variável abaixo)
TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres npm test   # inclui testes de RLS/funções
```

Os testes de banco criam e apagam o database `lacre_test` num Postgres real e tentam **trapacear** (ler palpite alheio, editar, lacrar após o prazo, resolver sem ser criador…). Use um Postgres local descartável, nunca o de produção.

> Estado da verificação: o SQL, as policies e a lógica de ranking estão testados contra PostgreSQL 16. As telas foram conferidas no navegador em modo demonstração. **O fluxo real de login (Google/Apple/e-mail) e as chamadas ao Supabase hospedado ainda não foram exercitados de ponta a ponta**, pois dependem das suas credenciais.

## Estrutura

```
supabase/migrations/0001_init.sql   esquema, RLS, funções, ranking
src/app/                            páginas (landing, eventos, cofre, ranking, perfil, /p/[id], login)
src/app/eventos/actions.ts          server actions (lacrar, criar, resolver, cancelar)
src/lib/data.ts                     leitura de dados (com fallback de demonstração)
src/lib/supabase/                   clientes browser/server + env
src/proxy.ts                        renova a sessão do Supabase (Next 16 "proxy")
tests/                              vitest (unit + banco)
```

## Próximos passos sugeridos

1. Notificar por e-mail/push quando um evento em que você lacrou for revelado (é o gatilho de retorno mais forte).
2. Carimbo de tempo público dos hashes (OpenTimestamps) para prova independente.
3. Eventos "oficiais" curados por você (eleições, campeonatos) com resolução via fonte confiável.
4. Grupos privados/ligas entre amigos e link de convite.
5. Reações nos lacres ("🔥 quero ver") e conquistas/selos (ex.: 5 acertos seguidos).
6. Moderação e denúncia de eventos; disputa de resultado.
7. Contagem de lacres materializada e paginação, quando o volume crescer.
