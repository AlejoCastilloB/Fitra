-- La descripción del plan de UNA persona.
--
-- La 005 puso la descripción en la carpeta, que sirve cuando el entrenador organiza sus
-- rutinas por programa. Pero el caso normal es otro: "el plan de Daniela", con sus días,
-- y una explicación dirigida a ella. Si sus rutinas no están en ninguna carpeta —que es
-- lo habitual— no había dónde escribirla.
--
-- Va en `clients` y no en una tabla nueva porque es exactamente eso: un dato de esa
-- persona con su entrenador. La lee ella en su app, encima de sus rutinas.
--
-- Ejecutar en Supabase: SQL Editor -> pegar -> Run. Es idempotente.

alter table public.clients add column if not exists training_description text;

-- Comprobación: debe devolver true.
select (select count(*) from information_schema.columns
          where table_schema = 'public' and table_name = 'clients'
            and column_name = 'training_description') = 1 as clients_tiene_training_description;
