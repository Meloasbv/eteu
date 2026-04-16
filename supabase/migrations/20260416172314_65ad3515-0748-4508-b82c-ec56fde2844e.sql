ALTER TABLE public.thoughts ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS thoughts_user_archived_idx ON public.thoughts (user_code_id, archived);
CREATE INDEX IF NOT EXISTS thought_connections_user_idx ON public.thought_connections (user_code_id);
CREATE UNIQUE INDEX IF NOT EXISTS thought_connections_pair_uniq ON public.thought_connections (LEAST(thought_a, thought_b), GREATEST(thought_a, thought_b));