
-- Pensamentos
CREATE TABLE public.thoughts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'reflexão',
  keywords TEXT[] DEFAULT '{}',
  analysis JSONB,
  emotion_valence NUMERIC DEFAULT 0,
  emotion_intensity NUMERIC DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_thoughts_user ON public.thoughts(user_code_id, created_at DESC);
CREATE INDEX idx_thoughts_type ON public.thoughts(user_code_id, type);
CREATE INDEX idx_thoughts_keywords ON public.thoughts USING GIN(keywords);

ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read thoughts" ON public.thoughts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert thoughts" ON public.thoughts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update thoughts" ON public.thoughts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete thoughts" ON public.thoughts FOR DELETE USING (true);

-- Conexões entre pensamentos
CREATE TABLE public.thought_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  thought_a UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  thought_b UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'semantic',
  strength NUMERIC DEFAULT 0.5,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thought_a, thought_b)
);

CREATE INDEX idx_connections_a ON public.thought_connections(thought_a);
CREATE INDEX idx_connections_b ON public.thought_connections(thought_b);

ALTER TABLE public.thought_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read thought_connections" ON public.thought_connections FOR SELECT USING (true);
CREATE POLICY "Anyone can insert thought_connections" ON public.thought_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update thought_connections" ON public.thought_connections FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete thought_connections" ON public.thought_connections FOR DELETE USING (true);

-- Padrões detectados
CREATE TABLE public.thought_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  pattern_name TEXT NOT NULL,
  description TEXT,
  thought_ids UUID[] DEFAULT '{}',
  bible_refs TEXT[] DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.thought_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read thought_patterns" ON public.thought_patterns FOR SELECT USING (true);
CREATE POLICY "Anyone can insert thought_patterns" ON public.thought_patterns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update thought_patterns" ON public.thought_patterns FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete thought_patterns" ON public.thought_patterns FOR DELETE USING (true);
