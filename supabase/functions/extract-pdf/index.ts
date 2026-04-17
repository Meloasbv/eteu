import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract text from a single PDF page chunk (between obj boundaries)
function extractFromChunk(chunk: string): string {
  const parts: string[] = [];

  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(chunk)) !== null) {
    const block = match[1];
    const tjRegex = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const text = tjMatch[1].replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\");
      if (text.trim()) parts.push(text);
    }
    const tjArrayRegex = /\[((?:\\.|[^\\\]])*)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const innerRegex = /\(((?:\\.|[^\\)])*)\)/g;
      let innerMatch;
      const innerParts: string[] = [];
      while ((innerMatch = innerRegex.exec(tjArrMatch[1])) !== null) {
        innerParts.push(innerMatch[1].replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\"));
      }
      if (innerParts.length) parts.push(innerParts.join(""));
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "PDF inválido. Envie o campo pdfBase64." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const binaryStr = atob(pdfBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const decoder = new TextDecoder("latin1");
    const rawText = decoder.decode(bytes);

    // Try to split by Page objects to get per-page text
    // PDF Page references look like: << /Type /Page ... /Contents N R ... >>
    const pages: { page: number; text: string }[] = [];

    // Strategy: split by /Type /Page and extract content between successive page objects
    const pageStartRegex = /\/Type\s*\/Page[^s]/g;
    const pageStarts: number[] = [];
    let m;
    while ((m = pageStartRegex.exec(rawText)) !== null) pageStarts.push(m.index);

    if (pageStarts.length > 0) {
      for (let i = 0; i < pageStarts.length; i++) {
        const start = pageStarts[i];
        const end = i + 1 < pageStarts.length ? pageStarts[i + 1] : rawText.length;
        // Look ahead in the raw text for stream blocks that often follow
        const window = rawText.slice(start, Math.min(end + 4000, rawText.length));
        let pageText = extractFromChunk(window);

        // Also pull readable text from streams in this window
        const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
        let sm;
        while ((sm = streamRegex.exec(window)) !== null) {
          const content = sm[1];
          if (content.length < 80000) {
            const streamText = extractFromChunk(content);
            if (streamText && streamText.length > 5) {
              pageText += " " + streamText;
            }
          }
        }

        pageText = pageText.replace(/\s+/g, " ").trim();
        if (pageText.length > 0) {
          pages.push({ page: i + 1, text: pageText });
        }
      }
    }

    // Fallback: extract everything if per-page failed
    let fullText = pages.map(p => p.text).join("\n\n").trim();

    if (fullText.length < 100) {
      const allParts: string[] = [];
      const btRegex = /BT\s([\s\S]*?)ET/g;
      while ((m = btRegex.exec(rawText)) !== null) {
        const t = extractFromChunk("BT " + m[1] + " ET");
        if (t) allParts.push(t);
      }
      const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
      while ((m = streamRegex.exec(rawText)) !== null) {
        if (m[1].length < 80000) {
          const t = extractFromChunk(m[1]);
          if (t && t.length > 10) allParts.push(t);
        }
      }
      fullText = allParts.join(" ").replace(/\s+/g, " ").trim();

      // last resort readable runs
      if (fullText.length < 100) {
        const readableRegex = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s,.:;!?'"()-]{10,}/g;
        const readable = rawText.match(readableRegex) || [];
        fullText = readable
          .filter(s => !/^(Type|Page|Font|Encoding|BaseFont|Subtype|Length|Filter|obj|endobj|xref|trailer|startxref|MediaBox|Resources|Parent)/i.test(s.trim()))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    const pageCount = pages.length || (rawText.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;

    if (fullText.length < 10) {
      return new Response(
        JSON.stringify({
          error: "Não foi possível extrair texto deste PDF. O arquivo pode ser baseado em imagens (escaneado).",
          pages: pageCount,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        text: fullText,
        pages: pageCount,
        // pagesText: array with text per page, allows analyze-content to attach page refs
        pagesText: pages.length > 0 ? pages : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-pdf error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao processar PDF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
