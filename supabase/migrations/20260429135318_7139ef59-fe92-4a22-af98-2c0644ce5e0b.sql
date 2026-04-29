ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS mind_map_id uuid;

CREATE INDEX IF NOT EXISTS idx_study_sessions_mind_map_id ON public.study_sessions(mind_map_id);