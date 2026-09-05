-- Dos cosas nuevas al terminar un entrenamiento, y el aviso de los que quedan abiertos.
--
--   1. Notas y foto del entreno: dos columnas en workout_logs.
--   2. Poder corregir la duración: no hace falta columna, duration_sec ya existe; lo que
--      hacía falta era la pantalla, y por eso viene el punto 3.
--   3. active_workouts: la tabla que le permite al cron saber que alguien dejó una sesión
--      abierta y avisarle. Se escribe desde la app mientras el entreno está en curso y se
--      borra al terminarlo o cancelarlo.
--
-- Ejecutar en Supabase: SQL Editor -> pegar -> Run. Es idempotente: se puede correr
-- varias veces sin romper nada.

-- 1) Notas y foto del entrenamiento -------------------------------------------------

alter table public.workout_logs add column if not exists notes text;
alter table public.workout_logs add column if not exists photo_url text;

-- 2) Entrenamientos abiertos --------------------------------------------------------

create table if not exists public.active_workouts (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  routine_name     text,
  started_at       timestamptz not null default now(),
  -- Momento de la ÚLTIMA serie marcada. De aquí se cuentan los 10 minutos y la hora.
  last_activity_at timestamptz not null default now(),
  reminded_first   boolean not null default false,
  reminded_second  boolean not null default false,
  updated_at       timestamptz not null default now()
);

-- Por si la tabla ya existiera de una versión anterior sin estas columnas.
alter table public.active_workouts add column if not exists routine_name text;
alter table public.active_workouts add column if not exists started_at timestamptz not null default now();
alter table public.active_workouts add column if not exists last_activity_at timestamptz not null default now();
alter table public.active_workouts add column if not exists reminded_first boolean not null default false;
alter table public.active_workouts add column if not exists reminded_second boolean not null default false;
alter table public.active_workouts add column if not exists updated_at timestamptz not null default now();

-- El cron busca por cuánto lleva sin actividad; sin índice tendría que leer la tabla
-- entera en cada pasada.
create index if not exists active_workouts_last_activity_idx
  on public.active_workouts (last_activity_at)
  where reminded_second = false;

-- 3) Permisos -----------------------------------------------------------------------
--
-- Cada quien escribe y borra SOLO su propia fila. El cron no pasa por aquí: usa la
-- service role, que salta el RLS.

alter table public.active_workouts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'active_workouts' and policyname = 'active_workouts_select_own'
  ) then
    create policy active_workouts_select_own on public.active_workouts
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'active_workouts' and policyname = 'active_workouts_insert_own'
  ) then
    create policy active_workouts_insert_own on public.active_workouts
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'active_workouts' and policyname = 'active_workouts_update_own'
  ) then
    create policy active_workouts_update_own on public.active_workouts
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'active_workouts' and policyname = 'active_workouts_delete_own'
  ) then
    create policy active_workouts_delete_own on public.active_workouts
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 4) Comprobación -------------------------------------------------------------------
-- Debe devolver una fila con las dos columnas nuevas en true y 4 políticas.

select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'workout_logs' and column_name = 'notes') = 1
    as workout_logs_tiene_notes,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'workout_logs' and column_name = 'photo_url') = 1
    as workout_logs_tiene_photo_url,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'active_workouts') = 1
    as existe_active_workouts,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'active_workouts')
    as politicas_active_workouts;
