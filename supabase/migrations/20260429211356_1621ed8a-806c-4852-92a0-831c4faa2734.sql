ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
ADD COLUMN IF NOT EXISTS shared_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_study_sessions_public_slug ON public.study_sessions(public_slug) WHERE public_slug IS NOT NULL;