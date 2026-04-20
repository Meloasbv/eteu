import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Decode base64 to bytes
    const binaryStr = atob(pdfBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Use unpdf — handles FlateDecode, fonts, encodings properly
    let pages: { page: number; text: string }[] = [];
    let fullText = "";
    let totalPages = 0;

    try {
      const pdf = await getDocumentProxy(bytes);
      const { totalPages: tp, text } = await extractText(pdf, { mergePages: false });
      totalPages = tp;
      const arr = Array.isArray(text) ? text : [String(text || "")];
      pages = arr
        .map((t, i) => ({ page: i + 1, text: (t || "").replace(/\s+/g, " ").trim() }))
        .filter((p) => p.text.length > 5);
      fullText = pages.map((p) => p.text).join("\n\n").trim();
    } catch (err) {
      console.error("unpdf error:", err);
      return new Response(
        JSON.stringify({
          error:
            "Não consegui ler este PDF (provavelmente escaneado, protegido ou corrompido). Tente exportá-lo novamente como PDF de texto.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (fullText.length < 30 || pages.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Não foi possível extrair texto deste PDF. O arquivo pode ser baseado em imagens (escaneado).",
          pages: totalPages || 0,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        text: fullText,
        pages: totalPages || pages.length,
        pagesText: pages,
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
