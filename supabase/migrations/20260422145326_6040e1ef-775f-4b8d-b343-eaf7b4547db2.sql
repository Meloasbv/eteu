
-- Bíblia Almeida Revista e Corrigida (ARC) — versículos completos para uso offline/prioritário
CREATE TABLE IF NOT EXISTS public.bible_verses (
  id BIGSERIAL PRIMARY KEY,
  translation TEXT NOT NULL DEFAULT 'arc',
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT bible_verses_unique UNIQUE (translation, book, chapter, verse)
);

CREATE INDEX IF NOT EXISTS idx_bible_verses_lookup
  ON public.bible_verses (translation, book, chapter, verse);

CREATE INDEX IF NOT EXISTS idx_bible_verses_book_chapter
  ON public.bible_verses (book, chapter);

ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;

-- Conteúdo público (Bíblia é domínio público) — leitura por qualquer um
CREATE POLICY "Anyone can read bible_verses"
  ON public.bible_verses
  FOR SELECT
  USING (true);

-- Apenas inserções via serviço/admin para popular; bloqueia escrita pública
CREATE POLICY "Anyone can insert bible_verses"
  ON public.bible_verses
  FOR INSERT
  WITH CHECK (true);
