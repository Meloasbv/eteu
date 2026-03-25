
CREATE TABLE public.flashcards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  note_id uuid DEFAULT NULL,
  next_review timestamp with time zone NOT NULL DEFAULT now(),
  interval integer NOT NULL DEFAULT 0,
  ease_factor numeric NOT NULL DEFAULT 2.5,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flashcards" ON public.flashcards FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert flashcards" ON public.flashcards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update flashcards" ON public.flashcards FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete flashcards" ON public.flashcards FOR DELETE TO anon USING (true);
