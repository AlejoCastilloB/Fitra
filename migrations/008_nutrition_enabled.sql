-- Poder apagar la parte de nutrición por usuario.
--
-- Muchos usan FitTrack solo para entrenar: la pestaña de nutrición, los recordatorios de
-- comida y las insignias de comidas les sobran. Con esta bandera apagada la app se queda
-- únicamente con el entrenamiento.
--
-- Por defecto en true: ningún usuario actual nota el cambio.
-- Se puede correr varias veces sin problema.

alter table public.users
  add column if not exists nutrition_enabled boolean not null default true;

-- Comprobación: debe decir true.
select exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'users' and column_name = 'nutrition_enabled'
) as users_tiene_nutrition_enabled;
