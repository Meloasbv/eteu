
CREATE TABLE public.live_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id uuid NOT NULL,
  device_id text NOT NULL,
  title text NOT NULL DEFAULT 'Sessão ao vivo',
  transcript text NOT NULL DEFAULT '',
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  personal_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'recording',
  elapsed_seconds integer NOT NULL DEFAULT 0,
  command jsonb,
  resume_of uuid,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT live_sessions_user_code_unique UNIQUE (user_code_id)
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live_sessions"
  ON public.live_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_sessions"
  ON public.live_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update live_sessions"
  ON public.live_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete live_sessions"
  ON public.live_sessions FOR DELETE USING (true);

ALTER TABLE public.live_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
