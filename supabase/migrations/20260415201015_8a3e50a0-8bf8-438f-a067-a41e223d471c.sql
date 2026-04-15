-- Create study_flashcards table
CREATE TABLE public.study_flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  mind_map_id UUID REFERENCES public.mind_maps(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'concept' CHECK (type IN ('concept', 'verse', 'application')),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor NUMERIC NOT NULL DEFAULT 2.5,
  next_review DATE NOT NULL DEFAULT CURRENT_DATE,
  repetitions INTEGER NOT NULL DEFAULT 0,
  last_review TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_flashcards_review ON public.study_flashcards(user_code_id, next_review);
CREATE INDEX idx_study_flashcards_map ON public.study_flashcards(mind_map_id);

ALTER TABLE public.study_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read study_flashcards" ON public.study_flashcards
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert study_flashcards" ON public.study_flashcards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update study_flashcards" ON public.study_flashcards
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete study_flashcards" ON public.study_flashcards
  FOR DELETE USING (true);

-- Create study_reviews table
CREATE TABLE public.study_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  mind_map_id UUID REFERENCES public.mind_maps(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL DEFAULT 'flashcard' CHECK (review_type IN ('flashcard', 'reveal', 'full')),
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  cards_total INTEGER NOT NULL DEFAULT 0,
  self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 3),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read study_reviews" ON public.study_reviews
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert study_reviews" ON public.study_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete study_reviews" ON public.study_reviews
  FOR DELETE USING (true);

-- Add columns to mind_maps
ALTER TABLE public.mind_maps ADD COLUMN IF NOT EXISTS study_notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.mind_maps ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';