
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova Sessão',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'live' CHECK (source_type IN ('live', 'upload', 'pdf')),
  audio_url TEXT,
  full_transcript TEXT NOT NULL DEFAULT '',
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_study JSONB,
  personal_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  study_flow_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_sessions_user ON public.study_sessions(user_code_id, created_at DESC);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read study_sessions"
  ON public.study_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert study_sessions"
  ON public.study_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update study_sessions"
  ON public.study_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete study_sessions"
  ON public.study_sessions FOR DELETE USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_study_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_study_sessions_updated_at
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_study_sessions_updated_at();

-- Vincular flashcards à sessão (opcional)
ALTER TABLE public.study_flashcards
  ADD COLUMN IF NOT EXISTS study_session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE;
