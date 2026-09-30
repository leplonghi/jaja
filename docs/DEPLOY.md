# Colocar o jaja no ar, passo a passo

Este guia leva você do zero a um site funcionando. A maior parte é automática: você roda **um comando** (`npm run setup`) e ele faz o que um programa pode fazer. O que sobra são as coisas que **só você** pode fazer, porque exigem a sua conta (login, faturamento, chaves). Para cada passo manual, explico **por quê**.

> **Legenda dos links:** ✅ = confirmei a existência na fonte (código do `firebase-tools`, documentação do Next 16 que acompanha o projeto, ou acesso direto). ◻ = é o endereço oficial do serviço, mas este ambiente não consegue abrir a página, então não confirmei o caminho exato. Se um link ◻ der "página não encontrada", o serviço mudou o endereço: procure o título do passo no buscador da documentação do próprio serviço. Os nomes de botões e menus também mudam de tempos em tempos.

## Visão geral: quem faz o quê

```
 Seu navegador ──▶ Firebase App Hosting (hospeda o site Next.js)
                        │
                        ▼
                  Supabase (banco de dados + login Google/Apple/e-mail)
```

- **Supabase** guarda as previsões e cuida do login. É onde ficam as regras de sigilo.
- **Firebase App Hosting** só hospeda o site. (O "Firebase Hosting" clássico não serve: ele só publica arquivos estáticos, e o jaja precisa de servidor.)

## Antes de começar (5 min)

| Você precisa de | Por quê | Onde |
|---|---|---|
| Node 20+ e `npm install` feito | rodar o assistente | https://nodejs.org ◻ |
| Conta Supabase (grátis) | banco e login | https://supabase.com/dashboard ◻ |
| Conta Google (a do Firebase) | hospedagem | https://console.firebase.google.com ✅ |
| Cartão para o faturamento do Firebase | o App Hosting roda em infraestrutura paga por uso | veja o passo 3 |

## Passo 1 · Criar o projeto no Supabase (manual, 3 min)

1. Abra https://supabase.com/dashboard ◻ → **New project**.
2. Escolha nome, senha do banco (guarde) e região (para o Brasil, procure uma região da América do Sul).
3. Quando terminar, vá em **Project Settings → API** e deixe a aba aberta: você vai copiar a **Project URL** e a chave **publishable** (começa com `sb_publishable_`; ou a chave **anon**, que começa com `eyJ`).

> ⚠️ **Nunca** use a chave `service_role` / `secret`. Ela dá acesso total ao banco e ignora todas as regras de sigilo. O assistente recusa essa chave de propósito.

**Por quê manual:** criar projeto envolve sua conta e região; não há como eu fazer isso por você daqui.

## Passo 2 · Rodar o assistente (automático)

```bash
npm install
npm run setup
```

Ele pergunta a URL e a chave do Supabase, o endereço do site e a idade mínima; **valida** cada resposta (recusa a chave secreta, por exemplo), grava o `.env.local` e o `apphosting.yaml` e, se você informar a conexão do banco, **aplica a migração sozinho**:

```bash
# opcional, deixa o banco 100% automático (precisa do psql instalado).
# A string está em Supabase → botão "Connect" do projeto → Connection string.
DATABASE_URL='postgresql://postgres:SUA-SENHA@db.xxxx.supabase.co:5432/postgres' npm run setup
```

Sem o `DATABASE_URL`, faça à mão (1 min): **SQL Editor → New query**, cole o conteúdo de `supabase/migrations/0001_jaja.sql` e clique **Run**. Rodar duas vezes é seguro no assistente (ele detecta e pula); no editor, rode **uma vez só**.

## Passo 3 · Firebase (manual, 5 min)

1. Em https://console.firebase.google.com ✅ → **Adicionar projeto**. Anote o **ID do projeto** (aparece nas configurações; é diferente do nome).
2. **Faturamento:** pelo que encontrei em buscas, o App Hosting exige o plano **Blaze** (pago por uso). Não consegui abrir a página oficial daqui, então **confirme o requisito e os preços** em https://firebase.google.com/docs/app-hosting/get-started ✅ e em https://firebase.google.com/pricing ◻ antes de ativar. Dica: configure um alerta de orçamento no Google Cloud para não ter surpresa.
3. O primeiro deploy pede que você aceite os termos do App Hosting; o CLI conduz isso.

**Por quê manual:** faturamento e termos de uso exigem o seu consentimento.

## Passo 4 · Deploy (automático)

```bash
FIREBASE_PROJECT=seu-id-do-projeto npm run setup   # o assistente faz o login e o deploy
# ou, se já configurou:
FIREBASE_PROJECT=seu-id-do-projeto npm run deploy
```

O que acontece: (1) abre o navegador para você logar no Google, **uma única vez**; (2) o script recusa seguir se o `apphosting.yaml` ainda tiver valores de exemplo; (3) roda typecheck, lint e testes; (4) faz o deploy e, na primeira vez, cria o backend `jaja` e pergunta a região.

Sem navegador (servidor de CI)? Use uma conta de serviço: https://console.cloud.google.com/iam-admin/serviceaccounts ◻ e `GOOGLE_APPLICATION_CREDENTIALS=/caminho/chave.json`.

Ao final o CLI mostra a **URL do site**. Guarde.

## Passo 5 · Ligar o login (manual, 10 a 40 min)

Volte ao Supabase. **Authentication → URL Configuration** ◻ (https://supabase.com/docs/guides/auth/redirect-urls ◻):

- **Site URL:** a URL do seu site.
- **Redirect URLs:** `https://SUA-URL/auth/callback` (e `http://localhost:3000/auth/callback` para testar em casa).

Depois rode `npm run setup` de novo informando a URL real (para os links de compartilhamento) e faça novo deploy.

**Por quê:** por segurança, o Supabase só devolve o usuário para endereços que você autorizou. Sem isso o login volta com erro.

### E-mail (link mágico), já funciona
Nada a fazer além do passo acima.

### Google
1. https://console.cloud.google.com/apis/credentials ◻ → **Criar credenciais → ID do cliente OAuth → Aplicativo da Web**. Antes, o Google pode pedir para configurar a **tela de consentimento**.
2. Em **URIs de redirecionamento autorizados** coloque `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. Copie *Client ID* e *Client secret* para **Supabase → Authentication → Sign In / Providers → Google**.
4. Guia oficial: https://supabase.com/docs/guides/auth/social-login/auth-google ◻

### Apple (o mais trabalhoso)
Exige o **Apple Developer Program**, que é pago (https://developer.apple.com/programs/ ✅). Precisa de Services ID, Team ID, Key ID e um segredo (JWT gerado da chave `.p8`) que **expira em até 6 meses**: coloque um lembrete no calendário. Guia oficial: https://supabase.com/docs/guides/auth/social-login/auth-apple ◻. Dica: lance primeiro só com e-mail e Google e adicione a Apple depois.

## Passo 6 · Virar equipe (para usar `/admin`)

Entre uma vez no site (isso cria seu perfil) e, no SQL Editor:

```sql
update public.profiles set is_staff = true where handle = 'seu_handle';
```

Seu `@` é o que você escolheu na tela de boas-vindas. Equipe é quem revisa eventos, declara resultados e libera temas eleitorais.

## Passo 7 · Conferir

1. Abra o site → **Entrar** → e-mail → clique no link recebido.
2. Escolha nome e `@`, confirme idade e termos.
3. Crie uma previsão livre com revelação em 2 minutos, abra-a em outra janela anônima (você não deve ver o conteúdo) e espere revelar.

## Quando algo dá errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Site abre mas diz que é demonstração, sem login | variáveis do Supabase ausentes **no build** | confira o `apphosting.yaml` (`availability: [BUILD, RUNTIME]`) e faça novo deploy |
| Login volta para a página de erro | Redirect URL não cadastrada | passo 5 |
| Links de compartilhamento apontam para `localhost` | `NEXT_PUBLIC_SITE_URL` desatualizada | rode `npm run setup` com a URL real e faça deploy |
| `permission denied for function ...` | migração não aplicada (ou aplicada pela metade) | rode a migração num banco vazio |
| Erro ao aplicar a migração: "already exists" | você rodou duas vezes no editor | use um projeto novo ou limpe o schema `public` |
| Deploy falha no build | algum teste/lint quebrou | leia a mensagem: o script para antes de publicar |
| Não consigo logar no Firebase em servidor sem navegador | login interativo | use conta de serviço (passo 4) |

## Segurança: o que é público e o que nunca pode vazar

- Público por natureza (pode estar no repositório): URL do Supabase e chave *publishable/anon*. As regras de sigilo estão no banco (RLS), não na chave.
- **Nunca** no repositório: chave `service_role`/`secret`, senha do banco, `DATABASE_URL`, JSON de conta de serviço.
- Este é um **MVP para teste fechado**. Antes de abrir ao público, veja a lista "Antes de lançar" no README (revisão jurídica, moderação real, etc.).
