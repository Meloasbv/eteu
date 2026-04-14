
CREATE TABLE public.favorite_verses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  verse_reference TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  reading_day TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read favorite_verses" ON public.favorite_verses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert favorite_verses" ON public.favorite_verses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete favorite_verses" ON public.favorite_verses FOR DELETE USING (true);

CREATE INDEX idx_favorite_verses_user ON public.favorite_verses (user_code_id);
