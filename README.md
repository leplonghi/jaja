# jaja — preveja agora, revele já já

Escreva o que você acha que vai acontecer. O jaja guarda em segredo, carimba a hora e só abre quando chegar a hora, com prova de que nada mudou (SHA-256). Sem dinheiro, sem apostas.

> **Estado: MVP para teste fechado, não para lançamento público.** Falta revisão jurídica, termos reais e um classificador de conteúdo (veja "Antes de lançar").

## O que o MVP faz

| Área | O que faz |
|---|---|
| Login | Google, Apple e e-mail (link mágico) via Supabase Auth, com confirmação inicial de idade e termos |
| **Eventos** | Pergunta **objetiva** ("é ou não é") com fonte para o resultado. Qualquer pessoa propõe; a **equipe revisa** antes de publicar e **declara o resultado** pela fonte. **Sem votação** |
| **Previsão livre** | Sem evento: escrita livre, fechada até a revelação (por data ou manual). Público ou só por link. O jaja prova **quando** foi escrita, sem dar veredito |
| **Desafio com amigos** | Previsão livre com entrada por link: cada um prevê sem ver os outros e **todos abrem juntos** |
| Palpite do dia | Um toque na home registra a previsão do evento que fecha primeiro |
| Revelação | Envelope que se rasga (arrastar ou botão), resultado oficial, previsões abertas, botão **Conferir** (recalcula o SHA-256 no navegador) |
| Tempo real | Contadores ao vivo de previsões (consulta a cada 5 s) |
| Compartilhar | Página pública de cada previsão (`/p/[id]`) com card social que **nunca mostra o conteúdo** antes da revelação |
| Eleições | Tema eleitoral só revela **depois que a equipe libera** (resultado oficial); rótulo de que previsão é opinião, não pesquisa |
| Moderação | Termos sinalizados e 3 denúncias retêm o conteúdo até a equipe revisar; fila em `/admin`; limite de 60 ações por hora por pessoa |
| Ranking | Só eventos resolvidos: acerto e Brier score (calibragem), mínimo 3 |
| Idiomas | Português (completo), inglês e espanhol (**rascunho**: precisa de revisão nativa) |
| Modo demonstração | Sem Supabase configurado o app abre com dados fictícios, somente leitura |

### Decisões de produto (ver documento de conceito)
Decididas com o autor: nome **jaja**; lançamento no **Brasil**, gratuito; sem votação; eleições no lançamento; previsão livre sem veredito; vocabulário "prever / revelar". Escolhas de Claude, por delegação do autor: os cinco recursos de engajamento e a direção de arte (tipografia condensada gigante, contagem regressiva como protagonista, gesto de rasgar).

### Fora do MVP (de propósito)
- **Apuração ao vivo** e **palpites durante o evento**: pedidos pelo autor, mas dependem de revisão jurídica (conteúdo eleitoral em tempo real) e de fonte que publique resultados parciais. Regras de integridade já propostas no documento de conceito.
- Sala de revelação ao vivo, ligas e grupos permanentes, blefe entre amigos, sequência com pausa, selo "contra a maré" (precisa de massa crítica), notificações.
- Resolução automática por fonte externa (hoje a equipe declara).

## Como o sigilo funciona (e o que garante)

Tudo em `supabase/migrations/0001_jaja.sql`. O **banco** impõe, não a interface:

1. O conteúdo de uma previsão só é entregue a outras pessoas depois da revelação, e só se não estiver retido pela moderação. Antes, só o autor (e a equipe, para moderar) lê.
2. Previsões são imutáveis: sem `UPDATE`/`DELETE`, e só entram por `seal_prediction()` / `create_free_topic()`, com hora, `salt` e hash do servidor.
3. Só a equipe resolve eventos e libera temas eleitorais.
4. Leitura pública passa por funções (`get_topic`, `get_predictions`…) que aplicam visibilidade e revelação; desafios "só por link" não aparecem em listas.

**Limites do modelo de confiança:** quem opera o banco tecnicamente consegue alterar dados. O hash prova integridade para quem o guardou na hora (link ou print). Uma prova independente exigiria registrar os hashes num carimbo de tempo público (por exemplo, OpenTimestamps), o que **não está implementado**. A equipe também pode ler conteúdo sinalizado ou denunciado, e isso precisa constar nos termos (há um rascunho em `/terms` e `/privacy`).

## Rodando localmente

Requisitos: Node 20+ e um projeto Supabase (grátis).

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto
npm run dev
```

Sem `.env.local` o app abre em **modo demonstração**: dá para navegar por todas as telas, inclusive o formulário e o envelope, mas nada é gravado.

### 1) Banco de dados
No painel do Supabase → **SQL Editor**, execute `supabase/migrations/0001_jaja.sql` (ou `supabase db push` com a CLI).

### 2) Login (Authentication → Sign In / Providers)
- **E-mail:** já vem ativo. Em *URL Configuration* defina a **Site URL** e adicione em **Redirect URLs** `http://localhost:3000/auth/callback` e `https://SEU-DOMINIO/auth/callback`.
- **Google:** crie um *OAuth client (Web)* no Google Cloud Console com o redirect `https://SEU-PROJETO.supabase.co/auth/v1/callback` e cole *Client ID/Secret* no Supabase.
- **Apple:** exige conta **Apple Developer Program (paga)**: *Services ID*, *Team ID*, *Key ID* e o segredo (JWT gerado da chave .p8, que **expira em até 6 meses**). Siga o guia oficial do Supabase.

### 3) Equipe e moderação
```sql
-- dar acesso à equipe (vale para /admin, resolver eventos, revisar, liberar temas eleitorais)
update public.profiles set is_staff = true where handle = 'seu_handle';

-- termos que retêm texto para revisão (a tabela começa VAZIA de propósito)
insert into public.moderation_terms (term) values ('exemplo de termo');
```

### 4) Deploy
Vercel: importe o repositório e defina as variáveis de `.env.example`. `NEXT_PUBLIC_SITE_URL` deve ser o domínio final.

## Testes

```bash
npm run typecheck && npm run lint
npm test                                                                 # unitários (os de banco são ignorados sem a variável abaixo)
TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres npm test   # inclui 28 testes de RLS/funções
```

Os testes de banco criam e apagam o database `jaja_test` num Postgres real e tentam **trapacear** (ler previsão alheia, editar, prever após o prazo, resolver sem ser equipe, vazar item pendente para anônimo, abrir tema eleitoral sem liberação…). Use um Postgres local descartável, nunca o de produção. Os unitários conferem, entre outras coisas, que **pt/en/es têm as mesmas chaves e marcadores** e que o hash calculado no navegador é idêntico ao do banco.

> **Verificação até aqui:** banco e regras testados contra PostgreSQL 16 (incluindo sabotagem proposital das regras de sigilo e eleitoral: os testes quebram). Telas conferidas no navegador em modo demonstração (desktop e celular, três idiomas, gesto de rasgar, formulários). **Login real (Google/Apple/e-mail) e o Supabase hospedado ainda não foram exercitados de ponta a ponta**, pois dependem de credenciais.

## Antes de lançar (lista de pendências reais)
1. **Advogado:** conteúdo eleitoral (previsão vs. pesquisa/propaganda), proteção de dados (opinião política pode ser dado sensível), responsabilidade por conteúdo de usuários, idade mínima, regras de loja de aplicativos. `/terms` e `/privacy` são **rascunhos**.
2. **Moderação de verdade:** a lista de termos está vazia; integrar um classificador de texto (exige aviso nos termos) e um fluxo de atendimento às denúncias.
3. **Operação da equipe:** quem declara resultados, inclusive na noite de eleição, e como contestar.
4. **Tradução:** revisão nativa de inglês e espanhol.
5. **Carimbo de tempo público** dos hashes (prova independente).
6. **Checagem de domínio e marca** de "jaja" (não foi feita: o ambiente bloqueou a consulta).
7. **Carga:** testar o pico da noite de eleição com carga simulada.

## Estrutura
```
supabase/migrations/0001_jaja.sql   esquema, RLS, funções, ranking
src/app/                            páginas (/, /explore, /new, /t/[id], /p/[id], /vault, /ranking, /u/[handle], /admin, /login, /welcome)
src/app/actions.ts                  server actions
src/i18n/                           dicionários tipados pt/en/es
src/lib/data.ts                     leitura via RPC (com fallback de demonstração)
src/components/                     PredictForm, RevealGate (envelope), BigCountdown, TopicCard…
tests/                              vitest (unitários + banco)
```
