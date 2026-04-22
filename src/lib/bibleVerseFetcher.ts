import { supabase } from "@/integrations/supabase/client";
import { getCachedVerse, setCachedVerse, sanitizeBibleRef } from "@/lib/bibleRefDetection";

/**
 * Unified Bible verse fetcher. Priority order:
 *   1. localStorage cache
 *   2. Local Supabase database (Almeida Revista e Corrigida) via `bible-verse` Edge Function
 *   3. bible-api.com (Almeida) — public fallback
 *   4. Edge Function `verse-ai` (AI-generated, last resort)
 *
 * Always returns the cleaned text (no semicolon-induced extra verses).
 */

const inFlight = new Map<string, Promise<string | null>>();

export async function fetchBibleVerse(reference: string): Promise<string | null> {
  if (!reference) return null;
  const ref = sanitizeBibleRef(reference);
  if (!ref) return null;

  // 1. Cache
  const cached = getCachedVerse(ref);
  if (cached) return cached;

  // De-dupe concurrent requests for the same ref
  const existing = inFlight.get(ref);
  if (existing) return existing;

  const promise = (async () => {
    // 2. Local DB via edge function
    try {
      const { data, error } = await supabase.functions.invoke("bible-verse", {
        body: { reference: ref },
      });
      if (!error && data?.found && typeof data.text === "string" && data.text.trim()) {
        const txt = data.text.trim();
        setCachedVerse(ref, txt);
        return txt;
      }
    } catch {
      /* fall through */
    }

    // 3. bible-api.com (Portuguese)
    try {
      for (const translation of ["almeida", "arc", ""]) {
        const url = translation
          ? `https://bible-api.com/${encodeURIComponent(ref)}?translation=${translation}`
          : `https://bible-api.com/${encodeURIComponent(ref)}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();
        if (json?.error) continue;
        if (json?.text) {
          const txt = String(json.text).trim();
          setCachedVerse(ref, txt);
          return txt;
        }
      }
    } catch {
      /* fall through */
    }

    // 4. AI fallback
    try {
      const { data, error } = await supabase.functions.invoke("verse-ai", {
        body: { reference: ref },
      });
      if (!error && (data?.text || data?.result)) {
        const txt = String(data.text ?? data.result).trim();
        if (txt && !/não encontrad/i.test(txt)) {
          setCachedVerse(ref, txt);
          return txt;
        }
      }
    } catch {
      /* ignore */
    }

    return null;
  })();

  inFlight.set(ref, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(ref);
  }
}
