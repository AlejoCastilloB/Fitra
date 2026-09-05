-- Arregla la causa de que llegara la MISMA notificación de comida cada 10 minutos.
--
-- El cron reserva el aviso escribiendo una fila en meal_reminders_sent antes de mandarlo.
-- Si esa escritura falla, no queda constancia y en la siguiente pasada se vuelve a mandar.
-- El código ya no manda nada si la reserva falla, pero hay que dejar la tabla en
-- condiciones para que la reserva funcione. Dos cosas pueden estar rompiéndola:
--
--   1. Falta el índice único sobre (user_id, local_date, slot). Sin él, el ON CONFLICT
--      que usaba el código antiguo daba error.
--   2. Una restricción CHECK sobre `slot` con la lista vieja de comidas. Al añadir el
--      almuerzo, el valor 'lunch' la viola y la fila se rechaza. Encaja con que la comida
--      que se repetía fuera justo el almuerzo.
--
-- Ejecutar en Supabase: SQL Editor -> pegar -> Run. Es idempotente.

-- 1) La tabla, por si no existiera.
create table if not exists public.meal_reminders_sent (
  user_id    uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  slot       text not null,
  sent_at    timestamptz not null default now()
);

-- 2) Fuera cualquier CHECK sobre esta tabla que enumere las comidas viejas: es lo que
--    impide guardar 'lunch'. Se buscan por su definición, no por nombre, porque el nombre
--    lo pone Postgres y no es predecible.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'meal_reminders_sent'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%breakfast%'
  loop
    execute format('alter table public.meal_reminders_sent drop constraint %I', c.conname);
    raise notice 'Quitada la restricción %', c.conname;
  end loop;
end $$;

-- 3) Antes de crear el índice único hay que quitar duplicados que hubieran quedado de
--    cuando la reserva no funcionaba. Se conserva la fila más antigua de cada grupo.
delete from public.meal_reminders_sent a
using public.meal_reminders_sent b
where a.ctid > b.ctid
  and a.user_id = b.user_id
  and a.local_date = b.local_date
  and a.slot = b.slot;

-- 4) El índice único. Es lo que convierte el insert en una reserva atómica: solo la
--    primera pasada del cron consigue la fila, las demás chocan y no mandan nada.
create unique index if not exists meal_reminders_sent_user_date_slot_key
  on public.meal_reminders_sent (user_id, local_date, slot);
