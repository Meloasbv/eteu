CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code_id UUID NOT NULL,
  title TEXT NOT NULL,
  reminder_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'never',
  category TEXT NOT NULL DEFAULT 'outro',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reminders" ON public.reminders FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert reminders" ON public.reminders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update reminders" ON public.reminders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete reminders" ON public.reminders FOR DELETE TO anon USING (true);