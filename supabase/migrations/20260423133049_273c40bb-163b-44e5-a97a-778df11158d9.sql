
-- Public bucket for study audio files (mp3 / webm recordings)
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-audio', 'study-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (it's a public learning artifact)
CREATE POLICY "study-audio public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-audio');

-- Anyone can upload (auth is via access-code; no auth.uid() in this app)
CREATE POLICY "study-audio public insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'study-audio');

-- Allow updates/deletes so users can replace or remove their own files
CREATE POLICY "study-audio public update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'study-audio');

CREATE POLICY "study-audio public delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'study-audio');
