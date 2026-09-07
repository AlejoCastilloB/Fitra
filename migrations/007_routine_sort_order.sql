-- Orden manual de las rutinas dentro de una carpeta.
--
-- Hasta ahora la lista salía por fecha de creación, así que el orden dependía de en qué
-- momento se armó cada día. En un programa de seis días eso no dice nada: el entrenador
-- quiere verlos en el orden en que se entrenan, y poder arrastrarlos.
--
-- `null` significa "sin ordenar a mano": esas quedan al final, por fecha, como hasta
-- ahora. Solo las que se arrastran reciben un número.
--
-- Ejecutar en Supabase: SQL Editor -> pegar -> Run. Es idempotente.

alter table public.routines add column if not exists sort_order integer;

-- La lista se pide siempre filtrando por entrenador y ordenando por esto.
create index if not exists routines_trainer_sort_idx
  on public.routines (trainer_id, sort_order);

-- Comprobación: debe devolver true.
select (select count(*) from information_schema.columns
          where table_schema = 'public' and table_name = 'routines'
            and column_name = 'sort_order') = 1 as routines_tiene_sort_order;
