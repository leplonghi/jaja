-- =============================================================================
-- jaja — preveja agora, revele depois.
--
-- O que o BANCO garante (não a interface):
--   1. O conteúdo de uma previsão só aparece para outras pessoas depois da
--      revelação. Antes, só o autor (e a equipe, para moderar) enxerga.
--   2. Previsões são imutáveis: não existe UPDATE nem DELETE, e só entram por
--      seal_prediction()/create_free_topic(), com hora, salt e hash do servidor.
--   3. Evento (kind = 'event'): resultado objetivo, declarado só pela equipe.
--      Previsão livre (kind = 'free'): sem veredito; abre por data ou manual.
--   4. Conteúdo sinalizado (termos, denúncias) fica retido até a equipe revisar.
--   5. Tema eleitoral só revela depois que a equipe libera (resultado oficial).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- profiles ---
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url   text,
  is_staff     boolean not null default false,
  onboarded_at timestamptz,
  created_at   timestamptz not null default now()
);

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
    split_part(coalesce(new.email, 'previsor'), '@', 1)
  );
  base_handle := lower(regexp_replace(
    split_part(coalesce(new.email, base_name), '@', 1), '[^a-zA-Z0-9]+', '_', 'g'
  ));
  base_handle := trim(both '_' from base_handle);
  if char_length(base_handle) < 3 then
    base_handle := 'previsor';
  end if;
  base_handle := left(base_handle, 14);

  candidate := base_handle;
  while exists (select 1 from public.profiles where handle = candidate) loop
    candidate := base_handle || '_' || substr(md5(random()::text), 1, 5);
  end loop;

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id, candidate, left(base_name, 60),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------- types ---
create type public.topic_kind        as enum ('event', 'free');
create type public.topic_status      as enum ('pending_review', 'open', 'resolved', 'canceled', 'blocked');
create type public.topic_visibility  as enum ('public', 'link');
create type public.moderation_status as enum ('ok', 'flagged', 'blocked');

-- ------------------------------------------------------------------ topics ---
-- Um "topic" é o contêiner de previsões:
--   event: pergunta objetiva com opções e fonte; a equipe declara o resultado.
--   free : previsão livre do autor; com allow_join vira desafio por link.
create table public.topics (
  id                uuid primary key default gen_random_uuid(),
  kind              public.topic_kind not null,
  host_id           uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 3 and 140),
  description       text check (description is null or char_length(description) <= 600),
  category          text not null default 'outros'
                    check (category in ('politica','esportes','cultura','economia','tecnologia','ciencia','outros')),
  visibility        public.topic_visibility not null default 'public',
  status            public.topic_status not null default 'open',
  locks_at          timestamptz not null,
  reveal_at         timestamptz,
  resolve_by        timestamptz,
  source_note       text check (source_note is null or char_length(source_note) between 10 and 300),
  source_url        text check (source_url is null or source_url ~ '^https?://'),
  allow_join        boolean not null default false,
  is_electoral      boolean not null default false,
  released          boolean not null default true,
  winning_option_id uuid,
  resolved_at       timestamptz,
  revealed_at       timestamptz,
  created_at        timestamptz not null default now(),
  constraint event_needs_source check (kind <> 'event' or (source_note is not null and resolve_by is not null)),
  constraint resolved_has_winner check (
    (status = 'resolved') = (winning_option_id is not null and resolved_at is not null)
  )
);
create index topics_status_locks_idx on public.topics (status, locks_at);
create index topics_host_idx on public.topics (host_id);

create table public.topic_options (
  id       uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  label    text not null check (char_length(label) between 1 and 60),
  position smallint not null,
  unique (topic_id, position),
  unique (topic_id, id)
);

alter table public.topics
  add constraint topics_winner_fk
  foreign key (id, winning_option_id) references public.topic_options (topic_id, id)
  deferrable initially deferred;

-- ------------------------------------------------------------- predictions ---
create table public.predictions (
  id                uuid primary key default gen_random_uuid(),
  topic_id          uuid not null references public.topics (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  option_id         uuid,
  body              text not null default '' check (char_length(body) <= 2000),
  confidence        smallint check (confidence between 50 and 99),
  salt              text not null,
  commitment        text not null,
  moderation_status public.moderation_status not null default 'ok',
  created_at        timestamptz not null default now(),
  unique (topic_id, user_id),
  foreign key (topic_id, option_id) references public.topic_options (topic_id, id)
);
create index predictions_user_idx on public.predictions (user_id, created_at desc);

-- ------------------------------------------------ denúncias e moderação -------
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  topic_id      uuid not null references public.topics (id) on delete cascade,
  prediction_id uuid references public.predictions (id) on delete cascade,
  reason        text not null check (char_length(reason) between 3 and 500),
  created_at    timestamptz not null default now()
);
create unique index reports_unique_idx on public.reports (
  reporter_id, topic_id, coalesce(prediction_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Termos que sinalizam texto para revisão. Começa VAZIA de propósito: a equipe
-- define a lista (com orientação jurídica). Sinalizar não bloqueia o registro;
-- apenas retém a revelação até a equipe revisar.
create table public.moderation_terms (
  term text primary key check (char_length(term) between 2 and 80)
);

-- --------------------------------------------------------------- auxiliares --
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_staff from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.require_onboarded()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and onboarded_at is not null) then
    raise exception 'not_onboarded' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.check_rate_limit()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  select (select count(*) from public.topics where host_id = auth.uid() and created_at > now() - interval '1 hour')
       + (select count(*) from public.predictions where user_id = auth.uid() and created_at > now() - interval '1 hour')
    into n;
  if n >= 60 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
end;
$$;

create or replace function public.text_flagged(p_text text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.moderation_terms m
    where p_text ilike '%' || replace(replace(m.term, '%', '\%'), '_', '\_') || '%'
  )
$$;

-- Revelado? Evento: só depois de resolvido. Livre: por data ou manual, e
-- tema eleitoral só depois da liberação da equipe.
create or replace function public.topic_is_revealed(t public.topics)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case t.kind
    when 'event' then t.status = 'resolved'
    else t.status = 'open'
         and (t.revealed_at is not null or (t.reveal_at is not null and t.reveal_at <= now()))
         and (not t.is_electoral or t.released)
  end
$$;

-- Compromisso: sha256(topic|user|opção|confiança|salt|texto). Tudo antes do
-- texto tem formato fixo, então a concatenação é inequívoca.
create or replace function public.compute_commitment(
  p_topic_id uuid, p_user_id uuid, p_option_id uuid,
  p_confidence int, p_salt text, p_body text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(
        p_topic_id::text || '|' || p_user_id::text || '|' || coalesce(p_option_id::text, '') || '|' ||
        coalesce(p_confidence::text, '') || '|' || p_salt || '|' || p_body,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

-- -------------------------------------------------- row level security -------
alter table public.profiles         enable row level security;
alter table public.topics           enable row level security;
alter table public.topic_options    enable row level security;
alter table public.predictions      enable row level security;
alter table public.reports          enable row level security;
alter table public.moderation_terms enable row level security;

create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Público e listável: só tópicos públicos já aprovados. Desafios por link NÃO
-- aparecem em listas: só quem tem o link (RPC get_topic) ou participa.
create policy topics_read on public.topics for select using (
  (visibility = 'public' and status in ('open', 'resolved', 'canceled'))
  or host_id = (select auth.uid())
  or public.is_staff()
  or exists (select 1 from public.predictions p where p.topic_id = topics.id and p.user_id = (select auth.uid()))
);
create policy topic_options_read on public.topic_options for select using (
  exists (select 1 from public.topics t where t.id = topic_options.topic_id)
);

-- Conteúdo do palpite: só o autor ou a equipe. Os demais leem pela RPC
-- get_predictions, que aplica revelação e moderação.
create policy predictions_read on public.predictions for select using (
  user_id = (select auth.uid()) or public.is_staff()
);

create policy reports_staff_read on public.reports for select using (public.is_staff());
create policy terms_staff_read   on public.moderation_terms for select using (public.is_staff());
create policy terms_staff_insert on public.moderation_terms for insert with check (public.is_staff());
create policy terms_staff_delete on public.moderation_terms for delete using (public.is_staff());

revoke all on public.profiles, public.topics, public.topic_options, public.predictions,
              public.reports, public.moderation_terms from anon, authenticated;
grant select on public.profiles, public.topics, public.topic_options to anon, authenticated;
grant update (handle, display_name, avatar_url) on public.profiles to authenticated;
grant select on public.predictions, public.reports to authenticated;
grant select, insert, delete on public.moderation_terms to authenticated;

-- ------------------------------------------------------ leitura via RPC ------
create or replace function public.topic_json(t public.topics, p_uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'kind', t.kind, 'title', t.title, 'description', t.description,
    'category', t.category, 'visibility', t.visibility, 'status', t.status,
    'locks_at', t.locks_at, 'reveal_at', t.reveal_at, 'resolve_by', t.resolve_by,
    'source_note', t.source_note, 'source_url', t.source_url,
    'allow_join', t.allow_join, 'is_electoral', t.is_electoral, 'released', t.released,
    'winning_option_id', t.winning_option_id, 'resolved_at', t.resolved_at,
    'revealed_at', t.revealed_at, 'created_at', t.created_at,
    'revealed', public.topic_is_revealed(t),
    'seals', (select count(*) from public.predictions p where p.topic_id = t.id),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'position', o.position) order by o.position)
      from public.topic_options o where o.topic_id = t.id
    ), '[]'::jsonb),
    'host', (
      select jsonb_build_object('id', h.id, 'handle', h.handle, 'display_name', h.display_name, 'avatar_url', h.avatar_url)
      from public.profiles h where h.id = t.host_id
    ),
    'my_prediction_id', (select p.id from public.predictions p where p.topic_id = t.id and p.user_id = p_uid)
  )
$$;

create or replace function public.topic_viewable(t public.topics)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- coalesce: para anônimo auth.uid() é nulo e a comparação viraria NULL (tratado como falso num IF).
  select t.status not in ('pending_review', 'blocked') or coalesce(t.host_id = auth.uid(), false) or public.is_staff()
$$;

create or replace function public.get_topic(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t public.topics;
begin
  select * into t from public.topics where id = p_id;
  if not found or not public.topic_viewable(t) then
    return null;
  end if;
  return public.topic_json(t, auth.uid());
end;
$$;

create or replace function public.seal_count(p_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t public.topics;
begin
  select * into t from public.topics where id = p_id;
  if not found or not public.topic_viewable(t) then
    return null;
  end if;
  return (select count(*) from public.predictions p where p.topic_id = p_id);
end;
$$;

create or replace function public.get_predictions(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t public.topics;
  uid uuid := auth.uid();
  rev boolean;
begin
  select * into t from public.topics where id = p_id;
  if not found or not public.topic_viewable(t) then
    return '[]'::jsonb;
  end if;
  rev := public.topic_is_revealed(t);
  return coalesce((
    select jsonb_agg(s.j order by s.created_at desc)
    from (
      select
        p.created_at,
        jsonb_build_object(
          'id', p.id, 'topic_id', p.topic_id, 'user_id', p.user_id,
          'created_at', p.created_at, 'commitment', p.commitment,
          'mine', coalesce(p.user_id = uid, false),
          'held', rev and p.moderation_status <> 'ok' and p.user_id is distinct from uid,
          'handle', pr.handle, 'display_name', pr.display_name, 'avatar_url', pr.avatar_url
        ) || case
          when (rev and p.moderation_status = 'ok') or p.user_id = uid then
            jsonb_build_object('option_id', p.option_id, 'body', p.body, 'confidence', p.confidence,
                               'salt', p.salt, 'moderation', p.moderation_status)
          else '{}'::jsonb
        end as j
      from public.predictions p
      join public.profiles pr on pr.id = p.user_id
      where p.topic_id = p_id
      order by p.created_at desc
      limit 300
    ) s
  ), '[]'::jsonb);
end;
$$;

-- Uma previsão (página pública da prova). Conteúdo só se revelada (ou se for sua).
create or replace function public.get_prediction(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.predictions;
  t public.topics;
  uid uuid := auth.uid();
  rev boolean;
begin
  select * into p from public.predictions where id = p_id;
  if not found then return null; end if;
  select * into t from public.topics where id = p.topic_id;
  if not public.topic_viewable(t) then return null; end if;
  rev := public.topic_is_revealed(t);
  return jsonb_build_object(
    'topic', public.topic_json(t, uid),
    'prediction', jsonb_build_object(
      'id', p.id, 'topic_id', p.topic_id, 'user_id', p.user_id,
      'created_at', p.created_at, 'commitment', p.commitment, 'mine', coalesce(p.user_id = uid, false),
      'held', rev and p.moderation_status <> 'ok' and p.user_id is distinct from uid,
      'author', (select jsonb_build_object('id', h.id, 'handle', h.handle, 'display_name', h.display_name, 'avatar_url', h.avatar_url)
                 from public.profiles h where h.id = p.user_id)
    ) || case
      when (rev and p.moderation_status = 'ok') or p.user_id = uid then
        jsonb_build_object('option_id', p.option_id, 'body', p.body, 'confidence', p.confidence,
                           'salt', p.salt, 'moderation', p.moderation_status)
      else '{}'::jsonb
    end
  );
end;
$$;

create or replace function public.list_topics(
  p_tab text default 'open',
  p_kind text default null,
  p_category text default null,
  p_limit int default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  return coalesce((
    select jsonb_agg(s.j order by s.sort_key)
    from (
      select
        public.topic_json(t, uid) as j,
        case p_tab
          when 'open'    then extract(epoch from t.locks_at)
          when 'waiting' then -extract(epoch from t.locks_at)
          else -extract(epoch from coalesce(t.resolved_at, t.revealed_at, t.reveal_at, t.created_at))
        end as sort_key
      from public.topics t
      where t.visibility = 'public'
        and t.status in ('open', 'resolved')
        and (p_kind is null or t.kind::text = p_kind)
        and (p_category is null or t.category = p_category)
        and case p_tab
          when 'open'    then t.status = 'open' and t.locks_at > now() and not public.topic_is_revealed(t)
          when 'waiting' then t.status = 'open' and t.locks_at <= now() and not public.topic_is_revealed(t)
          when 'revealed' then public.topic_is_revealed(t)
          else false
        end
      order by sort_key
      limit least(greatest(p_limit, 1), 100)
    ) s
  ), '[]'::jsonb);
end;
$$;

-- Cofre: tudo o que a pessoa prevê (o RLS já garante que são só dela).
create or replace function public.my_vault()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(s.j order by s.created_at desc)
    from (
      select p.created_at,
        jsonb_build_object(
          'prediction', jsonb_build_object(
            'id', p.id, 'topic_id', p.topic_id, 'user_id', p.user_id, 'option_id', p.option_id,
            'body', p.body, 'confidence', p.confidence, 'salt', p.salt, 'commitment', p.commitment,
            'created_at', p.created_at, 'moderation', p.moderation_status, 'mine', true, 'held', false),
          'topic', public.topic_json(t, uid)
        ) as j
      from public.predictions p
      join public.topics t on t.id = p.topic_id
      where p.user_id = uid
      order by p.created_at desc
      limit 200
    ) s
  ), '[]'::jsonb);
end;
$$;

-- Perfil público: só o que já foi revelado e aprovado, em tópicos públicos.
create or replace function public.profile_history(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  pending_count int;
begin
  select count(*) into pending_count
  from public.predictions p
  join public.topics t on t.id = p.topic_id
  where p.user_id = p_user_id and t.visibility = 'public' and t.status = 'open'
    and not public.topic_is_revealed(t);
  return jsonb_build_object(
    'pending', pending_count,
    'items', coalesce((
      select jsonb_agg(s.j order by s.created_at desc)
      from (
        select p.created_at,
          jsonb_build_object(
            'prediction', jsonb_build_object(
              'id', p.id, 'topic_id', p.topic_id, 'user_id', p.user_id, 'option_id', p.option_id,
              'body', p.body, 'confidence', p.confidence, 'salt', p.salt, 'commitment', p.commitment,
              'created_at', p.created_at, 'moderation', p.moderation_status, 'mine', coalesce(p.user_id = uid, false), 'held', false),
            'topic', public.topic_json(t, uid)
          ) as j
        from public.predictions p
        join public.topics t on t.id = p.topic_id
        where p.user_id = p_user_id and t.visibility = 'public'
          and public.topic_is_revealed(t) and p.moderation_status = 'ok'
        order by p.created_at desc
        limit 100
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------ mutações ------
create or replace function public.complete_onboarding(p_adult_ok boolean, p_terms_ok boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not (coalesce(p_adult_ok, false) and coalesce(p_terms_ok, false)) then
    raise exception 'onboarding_incomplete' using errcode = '22023';
  end if;
  update public.profiles set onboarded_at = coalesce(onboarded_at, now()) where id = auth.uid();
end;
$$;

create or replace function public.create_event(
  p_title text, p_description text, p_category text,
  p_locks_at timestamptz, p_resolve_by timestamptz,
  p_source_note text, p_source_url text,
  p_options text[], p_is_electoral boolean default false
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
  staff boolean;
  flagged boolean;
begin
  perform public.require_onboarded();
  perform public.check_rate_limit();
  staff := public.is_staff();

  if p_locks_at <= now() + interval '1 minute' then
    raise exception 'locks_at_in_past' using errcode = '22023';
  end if;
  if p_locks_at > now() + interval '2 years' then
    raise exception 'locks_at_too_far' using errcode = '22023';
  end if;
  if p_resolve_by is null or p_resolve_by <= p_locks_at then
    raise exception 'resolve_by_invalid' using errcode = '22023';
  end if;

  select coalesce(array_agg(trim(o)), '{}') into clean
  from unnest(p_options) o where trim(o) <> '';
  if coalesce(array_length(clean, 1), 0) not between 2 and 6 then
    raise exception 'invalid_options_count' using errcode = '22023';
  end if;
  if (select count(distinct lower(o)) from unnest(clean) o) <> array_length(clean, 1) then
    raise exception 'duplicate_options' using errcode = '22023';
  end if;

  flagged := public.text_flagged(coalesce(p_title, '') || ' ' || coalesce(p_description, '') || ' '
                                 || array_to_string(clean, ' '));

  insert into public.topics (
    kind, host_id, title, description, category, visibility, status,
    locks_at, resolve_by, source_note, source_url, is_electoral, released
  )
  values (
    'event', uid, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), p_category, 'public',
    case when staff and not flagged then 'open'::public.topic_status else 'pending_review' end,
    p_locks_at, p_resolve_by, trim(p_source_note), nullif(trim(coalesce(p_source_url, '')), ''),
    coalesce(p_is_electoral, false), true
  )
  returning id into new_id;

  for i in 1 .. array_length(clean, 1) loop
    insert into public.topic_options (topic_id, label, position) values (new_id, clean[i], i);
  end loop;
  return new_id;
end;
$$;

-- Previsão livre: título = rótulo público; texto = conteúdo fechado.
create or replace function public.create_free_topic(
  p_title text, p_body text, p_visibility text, p_allow_join boolean,
  p_locks_at timestamptz, p_reveal_at timestamptz,
  p_is_electoral boolean default false, p_category text default 'outros'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_topic uuid;
  new_salt text := encode(extensions.gen_random_bytes(16), 'hex');
  clean_body text := trim(p_body);
  lock_time timestamptz;
  pred public.predictions;
begin
  perform public.require_onboarded();
  perform public.check_rate_limit();

  if p_visibility not in ('public', 'link') then
    raise exception 'invalid_visibility' using errcode = '22023';
  end if;
  if char_length(clean_body) not between 10 and 2000 then
    raise exception 'body_length' using errcode = '22023';
  end if;

  if coalesce(p_allow_join, false) then
    if p_locks_at is null or p_locks_at <= now() + interval '1 minute' then
      raise exception 'locks_at_in_past' using errcode = '22023';
    end if;
    if p_locks_at > now() + interval '2 years' then
      raise exception 'locks_at_too_far' using errcode = '22023';
    end if;
    lock_time := p_locks_at;
  else
    lock_time := now();
  end if;

  if p_reveal_at is not null then
    if p_reveal_at <= greatest(lock_time, now()) + interval '1 minute' then
      raise exception 'reveal_too_soon' using errcode = '22023';
    end if;
    if p_reveal_at > now() + interval '5 years' then
      raise exception 'reveal_too_far' using errcode = '22023';
    end if;
  end if;

  insert into public.topics (
    kind, host_id, title, category, visibility, status,
    locks_at, reveal_at, allow_join, is_electoral, released
  )
  values (
    'free', uid, trim(p_title), p_category, p_visibility::public.topic_visibility,
    case when public.text_flagged(p_title) then 'pending_review'::public.topic_status else 'open' end,
    lock_time, p_reveal_at, coalesce(p_allow_join, false),
    coalesce(p_is_electoral, false), not coalesce(p_is_electoral, false)
  )
  returning id into new_topic;

  insert into public.predictions (topic_id, user_id, body, salt, commitment, moderation_status)
  values (
    new_topic, uid, clean_body, new_salt,
    public.compute_commitment(new_topic, uid, null, null, new_salt, clean_body),
    case when public.text_flagged(clean_body) then 'flagged'::public.moderation_status else 'ok' end
  )
  returning * into pred;

  return jsonb_build_object('topic_id', new_topic, 'prediction_id', pred.id, 'commitment', pred.commitment);
end;
$$;

create or replace function public.seal_prediction(
  p_topic_id uuid, p_option_id uuid, p_body text, p_confidence int
)
returns table (id uuid, commitment text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.topics;
  new_salt text := encode(extensions.gen_random_bytes(16), 'hex');
  clean_body text := trim(coalesce(p_body, ''));
  new_row public.predictions;
begin
  perform public.require_onboarded();
  perform public.check_rate_limit();

  select * into t from public.topics where topics.id = p_topic_id;
  if not found or not public.topic_viewable(t) then
    raise exception 'topic_not_found' using errcode = 'P0002';
  end if;
  if t.status <> 'open' or t.locks_at <= now() or public.topic_is_revealed(t) or t.revealed_at is not null then
    raise exception 'topic_locked' using errcode = '22023';
  end if;
  if exists (select 1 from public.predictions p where p.topic_id = p_topic_id and p.user_id = uid) then
    raise exception 'already_sealed' using errcode = '23505';
  end if;

  if t.kind = 'event' then
    if p_option_id is null then
      raise exception 'option_required' using errcode = '22023';
    end if;
    if char_length(clean_body) > 1200 then
      raise exception 'body_length' using errcode = '22023';
    end if;
  else
    if not t.allow_join then
      raise exception 'join_closed' using errcode = '42501';
    end if;
    if p_option_id is not null then
      raise exception 'invalid_option' using errcode = '22023';
    end if;
    if char_length(clean_body) not between 10 and 2000 then
      raise exception 'body_length' using errcode = '22023';
    end if;
  end if;

  insert into public.predictions (topic_id, user_id, option_id, body, confidence, salt, commitment, moderation_status)
  values (
    p_topic_id, uid, p_option_id, clean_body, p_confidence, new_salt,
    public.compute_commitment(p_topic_id, uid, p_option_id, p_confidence, new_salt, clean_body),
    case when clean_body <> '' and public.text_flagged(clean_body) then 'flagged'::public.moderation_status else 'ok' end
  )
  returning * into new_row;

  return query select new_row.id, new_row.commitment, new_row.created_at;
end;
$$;

-- O autor abre a própria previsão livre antes da data (desafio: abre para todos).
create or replace function public.reveal_now(p_topic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.topics;
begin
  perform public.require_onboarded();
  select * into t from public.topics where id = p_topic_id for update;
  if not found then
    raise exception 'topic_not_found' using errcode = 'P0002';
  end if;
  if t.host_id <> auth.uid() or t.kind <> 'free' then
    raise exception 'not_host' using errcode = '42501';
  end if;
  if t.status <> 'open' or public.topic_is_revealed(t) then
    raise exception 'topic_not_open' using errcode = '22023';
  end if;
  if t.is_electoral and not t.released then
    raise exception 'electoral_hold' using errcode = '42501';
  end if;
  update public.topics set revealed_at = now(), locks_at = least(locks_at, now()) where id = p_topic_id;
end;
$$;

-- Equipe: declarar o resultado de um evento (objetivo, pela fonte citada).
create or replace function public.resolve_event(p_topic_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.topics;
begin
  if not public.is_staff() then
    raise exception 'staff_only' using errcode = '42501';
  end if;
  select * into t from public.topics where id = p_topic_id for update;
  if not found or t.kind <> 'event' then
    raise exception 'topic_not_found' using errcode = 'P0002';
  end if;
  if t.status <> 'open' then
    raise exception 'topic_not_open' using errcode = '22023';
  end if;
  if t.locks_at > now() then
    raise exception 'topic_not_locked_yet' using errcode = '22023';
  end if;
  if not exists (select 1 from public.topic_options o where o.id = p_option_id and o.topic_id = p_topic_id) then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  update public.topics set status = 'resolved', winning_option_id = p_option_id, resolved_at = now()
   where id = p_topic_id;
end;
$$;

-- Cancelar: o autor (previsão livre) ou a equipe. Nada é revelado nem pontua.
create or replace function public.cancel_topic(p_topic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.topics;
begin
  perform public.require_onboarded();
  select * into t from public.topics where id = p_topic_id for update;
  if not found then
    raise exception 'topic_not_found' using errcode = 'P0002';
  end if;
  if not (public.is_staff() or (t.host_id = auth.uid() and t.kind = 'free')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if t.status not in ('open', 'pending_review') or public.topic_is_revealed(t) then
    raise exception 'topic_not_open' using errcode = '22023';
  end if;
  update public.topics set status = 'canceled' where id = p_topic_id;
end;
$$;

create or replace function public.review_topic(p_topic_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff_only' using errcode = '42501';
  end if;
  update public.topics
     set status = case when p_approve then 'open'::public.topic_status else 'blocked' end
   where id = p_topic_id and status = 'pending_review';
  if not found then
    raise exception 'topic_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.review_prediction(p_prediction_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff_only' using errcode = '42501';
  end if;
  update public.predictions
     set moderation_status = case when p_approve then 'ok'::public.moderation_status else 'blocked' end
   where id = p_prediction_id and moderation_status = 'flagged';
  if not found then
    raise exception 'prediction_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Equipe: liberar a revelação de tema eleitoral (depois do resultado oficial).
create or replace function public.release_electoral(p_topic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff_only' using errcode = '42501';
  end if;
  update public.topics set released = true where id = p_topic_id and is_electoral;
  if not found then
    raise exception 'topic_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Denúncia: 3 pessoas diferentes sinalizam automaticamente para revisão.
create or replace function public.report_content(p_topic_id uuid, p_prediction_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.topics;
  n int;
begin
  perform public.require_onboarded();
  select * into t from public.topics where id = p_topic_id;
  if not found or not public.topic_viewable(t) then
    raise exception 'topic_not_found' using errcode = 'P0002';
  end if;
  if p_prediction_id is not null and not exists (
    select 1 from public.predictions p where p.id = p_prediction_id and p.topic_id = p_topic_id
  ) then
    raise exception 'prediction_not_found' using errcode = 'P0002';
  end if;

  insert into public.reports (reporter_id, topic_id, prediction_id, reason)
  values (uid, p_topic_id, p_prediction_id, trim(p_reason))
  on conflict do nothing;

  select count(distinct r.reporter_id) into n
  from public.reports r
  where r.topic_id = p_topic_id and r.prediction_id is not distinct from p_prediction_id;

  if n >= 3 then
    if p_prediction_id is not null then
      update public.predictions set moderation_status = 'flagged'
       where id = p_prediction_id and moderation_status = 'ok';
    elsif t.kind = 'free' and t.status = 'open' then
      update public.topics set status = 'pending_review' where id = p_topic_id;
    end if;
  end if;
end;
$$;

-- Fila da equipe.
create or replace function public.admin_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if not public.is_staff() then
    raise exception 'staff_only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'pending_topics', coalesce((
      select jsonb_agg(public.topic_json(t, uid) order by t.created_at)
      from public.topics t where t.status = 'pending_review'), '[]'::jsonb),
    'flagged_predictions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'topic_id', p.topic_id, 'topic_title', t.title, 'body', p.body,
        'created_at', p.created_at, 'handle', pr.handle) order by p.created_at)
      from public.predictions p
      join public.topics t on t.id = p.topic_id
      join public.profiles pr on pr.id = p.user_id
      where p.moderation_status = 'flagged'), '[]'::jsonb),
    'electoral_to_release', coalesce((
      select jsonb_agg(public.topic_json(t, uid) order by t.created_at)
      from public.topics t where t.is_electoral and not t.released and t.status in ('open', 'resolved')), '[]'::jsonb),
    'events_to_resolve', coalesce((
      select jsonb_agg(public.topic_json(t, uid) order by t.locks_at)
      from public.topics t where t.kind = 'event' and t.status = 'open' and t.locks_at <= now()), '[]'::jsonb),
    'recent_reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'topic_id', r.topic_id, 'prediction_id', r.prediction_id,
        'reason', r.reason, 'created_at', r.created_at) order by r.created_at desc)
      from (select * from public.reports order by created_at desc limit 50) r), '[]'::jsonb)
  );
end;
$$;

-- Ranking: só eventos resolvidos, previsões aprovadas, mínimo de 3.
create view public.leaderboard as
  select
    pr.id as user_id, pr.handle, pr.display_name, pr.avatar_url,
    count(*)::int as total,
    count(*) filter (where p.option_id = t.winning_option_id)::int as hits,
    round(100.0 * count(*) filter (where p.option_id = t.winning_option_id) / count(*), 1) as accuracy,
    round((avg(power((p.confidence / 100.0) - (case when p.option_id = t.winning_option_id then 1 else 0 end), 2))
           filter (where p.confidence is not null))::numeric, 4) as brier
  from public.predictions p
  join public.topics t on t.id = p.topic_id and t.kind = 'event' and t.status = 'resolved'
  join public.profiles pr on pr.id = p.user_id
  where p.moderation_status = 'ok'
  group by pr.id, pr.handle, pr.display_name, pr.avatar_url
  having count(*) >= 3;

grant select on public.leaderboard to anon, authenticated;

-- ------------------------------------------------------- permissões de RPC ---
revoke execute on all functions in schema public from public;

-- Leitura: qualquer um (as funções aplicam as regras de visibilidade).
grant execute on function
  public.get_topic(uuid), public.get_predictions(uuid), public.get_prediction(uuid),
  public.list_topics(text, text, text, int), public.seal_count(uuid),
  public.profile_history(uuid), public.compute_commitment(uuid, uuid, uuid, int, text, text)
  to anon, authenticated;

-- Ações: só quem está logado.
grant execute on function
  public.my_vault(), public.complete_onboarding(boolean, boolean),
  public.create_event(text, text, text, timestamptz, timestamptz, text, text, text[], boolean),
  public.create_free_topic(text, text, text, boolean, timestamptz, timestamptz, boolean, text),
  public.seal_prediction(uuid, uuid, text, int), public.reveal_now(uuid),
  public.resolve_event(uuid, uuid), public.cancel_topic(uuid),
  public.review_topic(uuid, boolean), public.review_prediction(uuid, boolean),
  public.release_electoral(uuid), public.report_content(uuid, uuid, text),
  public.admin_queue()
  to authenticated;

-- Usadas dentro de policies: precisam ser executáveis por quem consulta.
grant execute on function public.is_staff() to anon, authenticated;
