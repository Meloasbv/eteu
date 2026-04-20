CREATE TABLE public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_code_id uuid NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  focus_minutes integer NOT NULL DEFAULT 0,
  artifacts_used text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read focus_sessions"
  ON public.focus_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert focus_sessions"
  ON public.focus_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update focus_sessions"
  ON public.focus_sessions FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete focus_sessions"
  ON public.focus_sessions FOR DELETE
  USING (true);

CREATE INDEX idx_focus_sessions_user_recent
  ON public.focus_sessions (user_code_id, updated_at DESC);

CREATE TRIGGER update_focus_sessions_updated_at
  BEFORE UPDATE ON public.focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_para_items_updated_at();