-- Horarios de recordatorio de comida por usuario.
--
-- Guarda un objeto { "slots": [{ "key", "time", "enabled" }, ...] }. Las claves son las
-- cinco de lib/mealReminders.ts (breakfast, morning_snack, lunch, afternoon_snack,
-- dinner) y no deben renombrarse: meal_reminders_sent deduplica por esa clave.
--
-- Quien no tenga fila (o la tenga en NULL) usa los horarios por defecto del código, así
-- que no hace falta rellenar nada para los usuarios que ya existen.
--
-- Ejecutar en Supabase: SQL Editor -> pegar -> Run.

alter table public.users
  add column if not exists meal_reminders jsonb;

comment on column public.users.meal_reminders is
  'Horarios de recordatorio de comida elegidos por el usuario. NULL = usar los valores por defecto de la app.';
