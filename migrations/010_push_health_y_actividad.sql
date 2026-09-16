-- Que las notificaciones no se mueran solas, y avisar a quien lleva un día sin entrar.
--
-- push_needs_resubscribe
--   Cuando el servicio de push responde 404 o 410, ese endpoint está muerto para siempre.
--   Se borraba la fila y ya, pero el navegador SEGUÍA teniendo esa misma suscripción
--   guardada: al abrir la app la volvía a subir igual de muerta, el siguiente envío
--   fallaba otra vez, y así para siempre. Con esta marca, la app sabe que tiene que tirar
--   la suscripción vieja y pedir una nueva de cero.
--
-- last_seen_at
--   La última vez que la persona abrió la app. Hace falta para el aviso de inactividad.
--
-- inactive_notified_at
--   Cuándo se le mandó el último aviso por llevar tiempo sin entrar. Evita repetirlo cada
--   vez que pasa el cron: solo se vuelve a avisar si entró después del último aviso.
--
-- Se puede correr varias veces sin problema.

alter table public.users
  add column if not exists push_needs_resubscribe boolean not null default false,
  add column if not exists last_seen_at timestamptz,
  add column if not exists inactive_notified_at timestamptz;

-- Comprobación: deben salir las tres en true.
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='push_needs_resubscribe') = 1 as tiene_push_needs_resubscribe,
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='last_seen_at') = 1 as tiene_last_seen_at,
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='inactive_notified_at') = 1 as tiene_inactive_notified_at;
