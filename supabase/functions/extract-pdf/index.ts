import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Decode base64 to Uint8Array
    const binaryStr = atob(pdfBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Extract text from PDF using basic parsing
    // PDF text is between BT...ET blocks or in stream objects
    const decoder = new TextDecoder("latin1");
    const rawText = decoder.decode(bytes);
    
    // Count pages
    const pageMatches = rawText.match(/\/Type\s*\/Page[^s]/g);
    const pageCount = pageMatches ? pageMatches.length : 1;

    // Extract text content using multiple strategies
    const extractedParts: string[] = [];
    
    // Strategy 1: Extract text between BT/ET blocks (text objects)
    const btEtRegex = /BT\s([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(rawText)) !== null) {
      const block = match[1];
      // Extract text from Tj, TJ, ' and " operators
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const text = tjMatch[1].replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
        if (text.trim()) extractedParts.push(text);
      }
      
      // TJ array operator
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjArrMatch;
      while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
        const innerRegex = /\(([^)]*)\)/g;
        let innerMatch;
        const parts: string[] = [];
        while ((innerMatch = innerRegex.exec(tjArrMatch[1])) !== null) {
          parts.push(innerMatch[1].replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\\(/g, "(").replace(/\\\)/g, ")"));
        }
        if (parts.length) extractedParts.push(parts.join(""));
      }
    }

    // Strategy 2: Look for stream content with readable text
    const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
    while ((match = streamRegex.exec(rawText)) !== null) {
      const content = match[1];
      // Check if it contains readable text (not binary)
      if (content.length < 50000) {
        const readableText = content.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ")
          .replace(/\s{3,}/g, " ")
          .trim();
        if (readableText.length > 20 && /[a-zA-ZÀ-ÿ]{3,}/.test(readableText)) {
          // Only add if it looks like actual text content
          const wordCount = readableText.split(/\s+/).filter(w => /[a-zA-ZÀ-ÿ]{2,}/.test(w)).length;
          if (wordCount > 5) {
            extractedParts.push(readableText);
          }
        }
      }
    }

    let text = extractedParts.join(" ")
      .replace(/\s+/g, " ")
      .replace(/(\w)\s{2,}(\w)/g, "$1 $2")
      .trim();

    // If basic extraction yields very little, try a broader approach
    if (text.length < 100) {
      // Try to extract any readable strings from the entire PDF
      const readableRegex = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s,.:;!?'"()-]{10,}/g;
      const readableMatches = rawText.match(readableRegex) || [];
      text = readableMatches
        .filter(s => !/^(Type|Page|Font|Encoding|BaseFont|Subtype|Length|Filter|obj|endobj|xref|trailer|startxref)/i.test(s.trim()))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (text.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: "Não foi possível extrair texto deste PDF. O arquivo pode ser baseado em imagens (escaneado). Tente copiar o texto manualmente.",
          pages: pageCount 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ text, pages: pageCount }),
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
