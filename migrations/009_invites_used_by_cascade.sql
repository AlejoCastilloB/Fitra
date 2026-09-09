-- Que se pueda borrar la cuenta de un cliente.
--
-- Todo el árbol de datos ya cae solo: borras el usuario de auth y en cascada se van su
-- fila de `users`, su fila de `clients` y con ella entrenamientos, series, récords,
-- comidas, fotos, insignias... Todo menos una cosa.
--
-- `invites.used_by` apunta a `clients` con NO ACTION, así que Postgres RECHAZA el borrado
-- entero en cuanto el cliente haya usado una invitación — o sea, prácticamente siempre:
--   ERROR: update or delete on table "clients" violates foreign key constraint
--          "invites_used_by_fkey" on table "invites"
--
-- La regla correcta es CASCADE, y no SET NULL: una invitación se considera disponible
-- cuando `used_by` está en null (así la busca el onboarding y así la lista el panel del
-- coach). Ponerla en null resucitaría un código ya gastado y cualquiera que lo tuviera
-- guardado podría volver a usarlo. Borrando la fila, el código deja de existir.
--
-- Se puede correr varias veces sin problema.

alter table public.invites
  drop constraint if exists invites_used_by_fkey;

alter table public.invites
  add constraint invites_used_by_fkey
  foreign key (used_by) references public.clients(user_id) on delete cascade;

-- Comprobación: debe decir CASCADE.
select
  con.conname as restriccion,
  case con.confdeltype
    when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
    when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end as al_borrar
from pg_constraint con
join pg_class cl on cl.oid = con.conrelid
join pg_namespace ns on ns.oid = cl.relnamespace
where ns.nspname = 'public' and cl.relname = 'invites' and con.conname = 'invites_used_by_fkey';
