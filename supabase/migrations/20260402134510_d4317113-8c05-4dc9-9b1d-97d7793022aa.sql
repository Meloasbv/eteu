CREATE TABLE public.quiz_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id uuid REFERENCES public.access_codes(id) ON DELETE CASCADE NOT NULL,
  stage_id integer NOT NULL,
  best_score integer DEFAULT 0,
  total_questions integer DEFAULT 15,
  stars integer DEFAULT 0,
  completed boolean DEFAULT false,
  attempts integer DEFAULT 0,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_code_id, stage_id)
);

ALTER TABLE public.quiz_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz progress"
  ON public.quiz_progress FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own quiz progress"
  ON public.quiz_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own quiz progress"
  ON public.quiz_progress FOR UPDATE
  USING (true)
  WITH CHECK (true);