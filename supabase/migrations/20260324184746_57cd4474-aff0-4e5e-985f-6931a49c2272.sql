
-- Access codes table (simple code-based login)
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notes table linked to access codes
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_code_id uuid REFERENCES public.access_codes(id) ON DELETE CASCADE NOT NULL,
  categoria text NOT NULL DEFAULT 'aulas',
  semana text NOT NULL DEFAULT '',
  texto text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allow public access (no auth, just code-based)
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Public policies since we're using code-based access (not Supabase Auth)
CREATE POLICY "Anyone can read access_codes" ON public.access_codes FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert access_codes" ON public.access_codes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read notes" ON public.notes FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert notes" ON public.notes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update notes" ON public.notes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete notes" ON public.notes FOR DELETE TO anon USING (true);
