-- =============================================================================
-- Lacre — palpites lacrados. Preveja agora, revele depois.
--
-- Garantias que o BANCO impõe (não a interface):
--   1. Enquanto o evento não for resolvido, só o AUTOR enxerga o conteúdo do
--      palpite (opção escolhida, tese, confiança). Todo mundo enxerga apenas
--      que existe um lacre e o seu hash.
--   2. Palpites são imutáveis: não existe UPDATE nem DELETE.
--   3. Só dá para lacrar antes de `locks_at`, e a hora do lacre vem do servidor.
--   4. Cada lacre tem um compromisso SHA-256 calculado no servidor. Depois da
--      revelação, qualquer pessoa recalcula e confere.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- profiles ---
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       text not null unique
               check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Cria o perfil automaticamente no primeiro login (Google, Apple ou e-mail).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_name text;
  base_handle text;
  candidate text;
begin
  base_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'palpiteiro'), '@', 1)
  );
  base_handle := lower(regexp_replace(
    split_part(coalesce(new.email, base_name), '@', 1), '[^a-zA-Z0-9]+', '_', 'g'
  ));
  base_handle := trim(both '_' from base_handle);
  if char_length(base_handle) < 3 then
    base_handle := 'palpiteiro';
  end if;
  base_handle := left(base_handle, 14);

  candidate := base_handle;
  while exists (select 1 from public.profiles where handle = candidate) loop
    candidate := base_handle || '_' || substr(md5(random()::text), 1, 5);
  end loop;

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    candidate,
    left(base_name, 60),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ events ---
create type public.event_status as enum ('open', 'resolved', 'canceled');

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references public.profiles (id) on delete cascade,
  title            text not null check (char_length(title) between 8 and 140),
  description      text check (description is null or char_length(description) <= 600),
  category         text not null default 'outros'
                   check (category in ('politica','esportes','cultura','economia','tecnologia','ciencia','outros')),
  locks_at         timestamptz not null,
  status           public.event_status not null default 'open',
  winning_option_id uuid,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  constraint resolved_has_winner check (
    (status = 'resolved') = (winning_option_id is not null and resolved_at is not null)
  )
);
create index events_status_locks_idx on public.events (status, locks_at);
create index events_creator_idx on public.events (creator_id);

create table public.event_options (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  label    text not null check (char_length(label) between 1 and 60),
  position smallint not null,
  unique (event_id, position),
  unique (event_id, id)
);

alter table public.events
  add constraint events_winner_fk
  foreign key (id, winning_option_id) references public.event_options (event_id, id)
  deferrable initially deferred;

-- ------------------------------------------------------------- predictions ---
create table public.predictions (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  option_id  uuid not null,
  thesis     text not null check (char_length(thesis) between 10 and 1200),
  confidence smallint not null check (confidence between 50 and 99),
  salt       text not null,
  commitment text not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id),
  foreign key (event_id, option_id) references public.event_options (event_id, id)
);
create index predictions_user_idx on public.predictions (user_id, created_at desc);

-- ---------------------------------------------------- row level security -----
alter table public.profiles      enable row level security;
alter table public.events        enable row level security;
alter table public.event_options enable row level security;
alter table public.predictions   enable row level security;

create policy profiles_read on public.profiles
  for select using (true);
create policy profiles_update_own on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy events_read on public.events
  for select using (true);
create policy options_read on public.event_options
  for select using (true);
-- Sem policy de INSERT/UPDATE/DELETE em events/event_options: tudo passa pelas
-- funções abaixo (create_event / resolve_event / cancel_event).

-- O conteúdo do palpite: autor sempre; os demais só depois da resolução.
create policy predictions_read on public.predictions
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = predictions.event_id and e.status = 'resolved'
    )
  );
-- Sem INSERT/UPDATE/DELETE: imutável e só entra via seal_prediction().

-- Privilégios de tabela (defesa em profundidade além do RLS).
revoke all on public.profiles, public.events, public.event_options, public.predictions
  from anon, authenticated;
grant select on public.profiles, public.events, public.event_options to anon, authenticated;
grant update (handle, display_name, avatar_url) on public.profiles to authenticated;
grant select on public.predictions to authenticated;

-- ----------------------------------------------- vista pública dos lacres -----
-- Mostra QUE existe um lacre e o hash, nunca o conteúdo. Roda com os privilégios
-- do dono de propósito (contorna o RLS de `predictions`), por isso só expõe
-- colunas que não revelam nada.
create view public.public_seals as
  select
    p.id,
    p.event_id,
    p.user_id,
    p.commitment,
    p.created_at,
    (e.status = 'resolved') as revealed
  from public.predictions p
  join public.events e on e.id = p.event_id;

grant select on public.public_seals to anon, authenticated;

-- --------------------------------------------------------------- funções -----
create or replace function public.create_event(
  p_title       text,
  p_description text,
  p_category    text,
  p_locks_at    timestamptz,
  p_options     text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  clean text[];
  i int;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_locks_at <= now() + interval '1 minute' then
    raise exception 'locks_at_in_past' using errcode = '22023';
  end if;
  if p_locks_at > now() + interval '2 years' then
    raise exception 'locks_at_too_far' using errcode = '22023';
  end if;

  select coalesce(array_agg(trim(o)), '{}') into clean
  from unnest(p_options) o where trim(o) <> '';
  if coalesce(array_length(clean, 1), 0) not between 2 and 6 then
    raise exception 'invalid_options_count' using errcode = '22023';
  end if;
  if (select count(distinct lower(o)) from unnest(clean) o) <> array_length(clean, 1) then
    raise exception 'duplicate_options' using errcode = '22023';
  end if;

  insert into public.events (creator_id, title, description, category, locks_at)
  values (uid, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), p_category, p_locks_at)
  returning id into new_id;

  for i in 1 .. array_length(clean, 1) loop
    insert into public.event_options (event_id, label, position)
    values (new_id, clean[i], i);
  end loop;

  return new_id;
end;
$$;

-- Compromisso: sha256(event|user|opção|confiança|salt|tese). Tudo antes da tese
-- tem formato fixo, então a concatenação é inequívoca.
create or replace function public.compute_commitment(
  p_event_id uuid, p_user_id uuid, p_option_id uuid,
  p_confidence int, p_salt text, p_thesis text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(
        p_event_id::text || '|' || p_user_id::text || '|' || p_option_id::text || '|' ||
        p_confidence::text || '|' || p_salt || '|' || p_thesis,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.seal_prediction(
  p_event_id   uuid,
  p_option_id  uuid,
  p_thesis     text,
  p_confidence int
)
returns table (id uuid, commitment text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ev public.events;
  new_salt text := encode(extensions.gen_random_bytes(16), 'hex');
  clean_thesis text := trim(p_thesis);
  new_row public.predictions;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into ev from public.events where events.id = p_event_id;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if ev.status <> 'open' or ev.locks_at <= now() then
    raise exception 'event_locked' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.predictions p where p.event_id = p_event_id and p.user_id = uid
  ) then
    raise exception 'already_sealed' using errcode = '23505';
  end if;

  insert into public.predictions (event_id, user_id, option_id, thesis, confidence, salt, commitment)
  values (
    p_event_id, uid, p_option_id, clean_thesis, p_confidence, new_salt,
    public.compute_commitment(p_event_id, uid, p_option_id, p_confidence, new_salt, clean_thesis)
  )
  returning * into new_row;

  return query select new_row.id, new_row.commitment, new_row.created_at;
end;
$$;

-- Quem criou o evento resolve depois do prazo. Resolver revela tudo de uma vez.
create or replace function public.resolve_event(p_event_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ev public.events;
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if ev.creator_id is distinct from uid then
    raise exception 'not_creator' using errcode = '42501';
  end if;
  if ev.status <> 'open' then
    raise exception 'event_not_open' using errcode = '22023';
  end if;
  if ev.locks_at > now() then
    raise exception 'event_not_locked_yet' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.event_options o where o.id = p_option_id and o.event_id = p_event_id
  ) then
    raise exception 'invalid_option' using errcode = '22023';
  end if;

  update public.events
     set status = 'resolved', winning_option_id = p_option_id, resolved_at = now()
   where id = p_event_id;
end;
$$;

-- Cancelar (ex.: jogo adiado): nada é revelado, ninguém pontua.
create or replace function public.cancel_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ev public.events;
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if ev.creator_id is distinct from uid then
    raise exception 'not_creator' using errcode = '42501';
  end if;
  if ev.status <> 'open' then
    raise exception 'event_not_open' using errcode = '22023';
  end if;
  update public.events set status = 'canceled' where id = p_event_id;
end;
$$;

-- Ranking: acerto e Brier score (menor = melhor calibrado). Mínimo 3 palpites.
create view public.leaderboard as
  select
    pr.id as user_id,
    pr.handle,
    pr.display_name,
    pr.avatar_url,
    count(*)::int as total,
    count(*) filter (where p.option_id = e.winning_option_id)::int as hits,
    round(
      100.0 * count(*) filter (where p.option_id = e.winning_option_id) / count(*), 1
    ) as accuracy,
    round(avg(power(
      (p.confidence / 100.0) - (case when p.option_id = e.winning_option_id then 1 else 0 end), 2
    ))::numeric, 4) as brier
  from public.predictions p
  join public.events e on e.id = p.event_id and e.status = 'resolved'
  join public.profiles pr on pr.id = p.user_id
  group by pr.id, pr.handle, pr.display_name, pr.avatar_url
  having count(*) >= 3;

grant select on public.leaderboard to anon, authenticated;

-- Só os RPCs necessários ficam expostos ao público.
revoke execute on function
  public.create_event(text, text, text, timestamptz, text[]),
  public.seal_prediction(uuid, uuid, text, int),
  public.resolve_event(uuid, uuid),
  public.cancel_event(uuid),
  public.compute_commitment(uuid, uuid, uuid, int, text, text)
  from public;
grant execute on function
  public.create_event(text, text, text, timestamptz, text[]),
  public.seal_prediction(uuid, uuid, text, int),
  public.resolve_event(uuid, uuid),
  public.cancel_event(uuid)
  to authenticated;
grant execute on function public.compute_commitment(uuid, uuid, uuid, int, text, text)
  to anon, authenticated;

-- Contagem de lacres por evento (alimenta o "N pessoas já lacraram" do feed).
create view public.event_seal_counts as
  select event_id, count(*)::int as seals
  from public.predictions
  group by event_id;

grant select on public.event_seal_counts to anon, authenticated;
