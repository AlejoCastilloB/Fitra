-- Descripción del PROGRAMA (la carpeta), para explicar el conjunto.
--
-- La descripción de cada día ya existe: es routines.notes, que el cliente ya ve en su
-- lista de rutinas. Lo que faltaba era el nivel de arriba — por qué el plan tiene seis
-- días y no cuatro, qué se busca este mes— y eso no cabe en ninguna rutina suelta porque
-- habla de todas.
--
-- Las carpetas hoy son solo un texto en routines.folder. Esta tabla les da una fila
-- propia donde colgar esa descripción, sin tocar cómo se agrupan: el vínculo sigue siendo
-- el nombre.
--
-- Ejecutar en Supabase: SQL Editor -> pegar -> Run. Es idempotente.

create table if not exists public.routine_folders (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.routine_folders add column if not exists description text;
alter table public.routine_folders add column if not exists updated_at timestamptz not null default now();

-- Una carpeta por nombre y entrenador: es lo que permite guardarla con upsert desde la app.
create unique index if not exists routine_folders_trainer_name_key
  on public.routine_folders (trainer_id, name);

-- Permisos ---------------------------------------------------------------------------
--
-- El entrenador manda sobre sus carpetas. El cliente SOLO puede leer, y solo la carpeta
-- de una rutina que sea suya: sin esa condición podría leer la descripción de los
-- programas de todos los demás clientes de su entrenador.

alter table public.routine_folders enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routine_folders' and policyname='routine_folders_trainer_all') then
    create policy routine_folders_trainer_all on public.routine_folders
      for all using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routine_folders' and policyname='routine_folders_client_read') then
    create policy routine_folders_client_read on public.routine_folders
      for select using (
        exists (
          select 1 from public.routines r
          where r.folder = routine_folders.name
            and r.trainer_id = routine_folders.trainer_id
            and r.client_id = auth.uid()
        )
      );
  end if;
end $$;

-- Comprobación ------------------------------------------------------------------------
-- Debe devolver true y 2 políticas.

select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='routine_folders') = 1 as existe_routine_folders,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='routine_folders') as politicas;
