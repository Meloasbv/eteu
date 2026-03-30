
CREATE TABLE public.note_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared notes"
  ON public.note_shares FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage shares"
  ON public.note_shares FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read shared notes content"
  ON public.notes FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.note_shares WHERE note_shares.note_id = notes.id
    )
  );
