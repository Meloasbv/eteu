-- Add area + area-specific fields to thoughts
ALTER TABLE public.thoughts ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT 'brainstorm';
ALTER TABLE public.thoughts ADD CONSTRAINT thoughts_area_check
  CHECK (area IN ('reflexao', 'oracao', 'brainstorm'));

-- Backfill area from existing type
UPDATE public.thoughts SET area = CASE
  WHEN type IN ('emocional','decisão','reflexão','problema') THEN 'reflexao'
  WHEN type = 'oração' THEN 'oracao'
  ELSE 'brainstorm'
END;

-- Prayer extras
ALTER TABLE public.thoughts ADD COLUMN IF NOT EXISTS prayer_status TEXT;
ALTER TABLE public.thoughts ADD CONSTRAINT thoughts_prayer_status_check
  CHECK (prayer_status IS NULL OR prayer_status IN ('pending','answered','ongoing'));
ALTER TABLE public.thoughts ADD COLUMN IF NOT EXISTS prayer_answered_at TIMESTAMPTZ;

-- Brainstorm kanban
ALTER TABLE public.thoughts ADD COLUMN IF NOT EXISTS kanban_status TEXT DEFAULT 'idea';
ALTER TABLE public.thoughts ADD CONSTRAINT thoughts_kanban_status_check
  CHECK (kanban_status IN ('idea','doing','done'));

-- Reflection exercise free-form JSON
ALTER TABLE public.thoughts ADD COLUMN IF NOT EXISTS reflection_exercise JSONB;

-- Index for filtering by area
CREATE INDEX IF NOT EXISTS idx_thoughts_area
  ON public.thoughts (user_code_id, area, archived);
