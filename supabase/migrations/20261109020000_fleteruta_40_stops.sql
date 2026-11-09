-- FleteRuta only: increase capacity without rewriting or deleting routes.
create or replace function public.fleteruta_valid_stops(items jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare item jsonb; ids text[]='{}'; ident text;
begin
 if jsonb_typeof(items) is distinct from 'array' then return false; end if;
 if jsonb_array_length(items)>40 then return false; end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item) is distinct from 'object' then return false; end if;
  ident=item->>'id';
  if ident is null or length(ident) not between 1 and 80 or ident=any(ids) then return false; end if;
  ids=array_append(ids,ident);
  if jsonb_typeof(item->'address') is distinct from 'string' or length(item->>'address') not between 1 and 2500 then return false; end if;
  if jsonb_typeof(item->'lat') is distinct from 'number' or jsonb_typeof(item->'lon') is distinct from 'number' then return false; end if;
  if (item->>'lat')::numeric not between -90 and 90 or (item->>'lon')::numeric not between -180 and 180 then return false; end if;
  if jsonb_typeof(item->'done') is distinct from 'boolean' then return false; end if;
  if item ? 'shortAddress' and (jsonb_typeof(item->'shortAddress') is distinct from 'string' or length(item->>'shortAddress') not between 1 and 300) then return false; end if;
  if item ? 'returnPoint' and jsonb_typeof(item->'returnPoint') is distinct from 'boolean' then return false; end if;
  if item ? 'recipient' and (jsonb_typeof(item->'recipient') is distinct from 'string' or length(item->>'recipient')>150) then return false; end if;
  if item ? 'notes' and (jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes')>300) then return false; end if;
 end loop;
 return true;
end $$;
