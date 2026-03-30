CREATE POLICY "Anyone can insert note_shares"
ON public.note_shares
FOR INSERT
TO anon
WITH CHECK (true);