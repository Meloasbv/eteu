import { supabase } from "@/integrations/supabase/client";

export interface AudioSegment {
  blob: Blob;            // original recorded chunk (webm/mp4/mp3…)
  mp3Blob: Blob;         // canonical .mp3 (or original blob renamed to .mp3 if already audio)
  durationSeconds: number;
  label: string;         // "Parte 1", "Parte 2"…
  publicUrl?: string;    // filled after upload
  transcript?: string;   // filled after whisper
}

/**
 * Upload an audio blob to the study-audio bucket and return the public URL.
 * Always saves with `.mp3` extension to keep the gallery uniform; the actual
 * encoding may be webm/opus, which all major browsers can play in <audio>.
 */
export async function uploadAudio(
  userCodeId: string,
  blob: Blob,
  fileName?: string,
): Promise<string> {
  const safeName = (fileName || `rec-${Date.now()}.mp3`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userCodeId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from("study-audio")
    .upload(path, blob, {
      contentType: "audio/mpeg",
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage.from("study-audio").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Transcribe an audio blob via the OpenAI Whisper edge function.
 */
export async function transcribeAudioBlob(blob: Blob, language = "pt"): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as any);
  }
  const audioBase64 = btoa(binary);

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || "audio/webm",
      fileName: `audio.${(blob.type.split("/")[1] || "webm").split(";")[0]}`,
      language,
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`);
  return (data.text as string) || "";
}
