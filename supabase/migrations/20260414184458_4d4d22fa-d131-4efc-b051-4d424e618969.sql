
CREATE TABLE public.mind_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Meu Mapa Mental',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mind_maps" ON public.mind_maps FOR SELECT USING (true);
CREATE POLICY "Anyone can insert mind_maps" ON public.mind_maps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update mind_maps" ON public.mind_maps FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete mind_maps" ON public.mind_maps FOR DELETE USING (true);
