-- PARA System: items + links (vincular qualquer entidade da plataforma a um item PARA)
CREATE TABLE public.para_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'project',
  title text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#d4af7a',
  icon text DEFAULT 'folder',
  deadline timestamp with time zone,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.para_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read para_items" ON public.para_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert para_items" ON public.para_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update para_items" ON public.para_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete para_items" ON public.para_items FOR DELETE USING (true);

CREATE INDEX idx_para_items_user ON public.para_items(user_code_id);
CREATE INDEX idx_para_items_kind ON public.para_items(kind);

CREATE TABLE public.para_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id uuid NOT NULL,
  para_id uuid NOT NULL REFERENCES public.para_items(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.para_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read para_links" ON public.para_links FOR SELECT USING (true);
CREATE POLICY "Anyone can insert para_links" ON public.para_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update para_links" ON public.para_links FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete para_links" ON public.para_links FOR DELETE USING (true);

CREATE UNIQUE INDEX idx_para_links_unique ON public.para_links(para_id, entity_type, entity_id);
CREATE INDEX idx_para_links_user ON public.para_links(user_code_id);
CREATE INDEX idx_para_links_entity ON public.para_links(entity_type, entity_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_para_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_para_items_updated_at
BEFORE UPDATE ON public.para_items
FOR EACH ROW EXECUTE FUNCTION public.update_para_items_updated_at();