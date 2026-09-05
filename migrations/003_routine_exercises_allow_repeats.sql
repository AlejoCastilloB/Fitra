-- Permite que el mismo ejercicio aparezca varias veces en una misma rutina.
--
-- Es habitual: press de banca pesado al principio y otra vez ligero al final, o una
-- superserie que repite un movimiento. La app ya lo soporta (cada fila lleva su propio
-- identificador), pero si la tabla tiene una restricción de unicidad sobre
-- (routine_id, exercise_id) la segunda fila se rechaza al guardar.
--
-- Esta migración solo actúa si esa restricción existe; si no, no hace nada.
-- Ejecutar en Supabase: SQL Editor -> pegar -> Run. Es idempotente.

do $$
declare
  c record;
begin
  -- Restricciones UNIQUE que cubren exactamente (routine_id, exercise_id).
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'routine_exercises'
      and con.contype = 'u'
      and pg_get_constraintdef(con.oid) like '%routine_id%'
      and pg_get_constraintdef(con.oid) like '%exercise_id%'
  loop
    execute format('alter table public.routine_exercises drop constraint %I', c.conname);
    raise notice 'Quitada la restricción de unicidad %', c.conname;
  end loop;

  -- Índices únicos sueltos que hacen lo mismo (no todos vienen de una restricción).
  for c in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'routine_exercises'
      and indexdef like '%UNIQUE%'
      and indexdef like '%routine_id%'
      and indexdef like '%exercise_id%'
      and indexdef not like '%order_index%'
  loop
    execute format('drop index if exists public.%I', c.indexname);
    raise notice 'Quitado el índice único %', c.indexname;
  end loop;
end $$;
