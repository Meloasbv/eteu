import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Você é um conselheiro sábio que combina psicologia com sabedoria bíblica reformada.
O usuário registra pensamentos no seu "Segundo Cérebro".
Analise o pensamento e retorne APENAS JSON válido (sem markdown, sem backticks):

{
  "detected_type": "problema|insight|estudo|reflexão|oração|decisão|emocional|ideia|pergunta",
  
  "psychological_analysis": {
    "pattern": "Nome do padrão psicológico identificado (ex: Viés de confirmação, Catastrofização, Ruminação, Projeção)",
    "explanation": "Explicação breve de 1-2 frases do que pode estar acontecendo psicologicamente",
    "reframe": "Uma forma alternativa e saudável de enxergar a situação (1 frase)"
  },
  
  "biblical_analysis": {
    "principle": "Princípio bíblico aplicável (ex: Confiança na soberania de Deus)",
    "verses": ["Referência 1", "Referência 2"],
    "application": "Como a Escritura fala diretamente sobre isso (1-2 frases)"
  },
  
  "diagnosis": {
    "summary": "Diagnóstico em 1 frase direta (ex: 'Você está tentando controlar o que não depende de você')",
    "action": "Uma ação prática sugerida (ex: 'Escreva 3 coisas que você pode controlar nessa situação')",
    "question": "Uma pergunta para aprofundar (ex: 'O que de pior pode realmente acontecer?')"
  },
  
  "keywords": ["palavra1", "palavra2", "palavra3"],
  
  "connections": {
    "search_terms": ["termos para buscar em pensamentos anteriores"],
    "possible_themes": ["tema1", "tema2"]
  },
  
  "emotion_score": {
    "valence": 0.0,
    "intensity": 0.0
  }
}

REGRAS:
- Seja direto e conciso. Nada de rodeios.
- O diagnóstico deve ser como um amigo sábio falaria: verdadeiro mas com amor.
- A análise psicológica deve nomear padrões reais (TCC, Inteligência Emocional).
- A análise bíblica deve ser teologicamente sólida (perspectiva reformada), não genérica.
- Os versículos devem ser os MAIS relevantes para a situação específica.
- O reframe deve ser transformador, não um clichê.
- A pergunta deve fazer o usuário pensar profundamente.
- valence: -1.0 (muito negativo) a 1.0 (muito positivo)
- intensity: 0.0 (calmo) a 1.0 (intenso)`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, recentThoughts } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const recentContext = (recentThoughts || [])
      .slice(0, 10)
      .map((t: any) => `- [${t.type}] ${(t.content || "").substring(0, 100)}`)
      .join("\n");

    const userMessage = `PENSAMENTO ATUAL:\n"${content}"\n\n${recentContext ? `PENSAMENTOS RECENTES DO USUÁRIO (para contexto):\n${recentContext}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content || "";
    // Strip markdown fences
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    
    const analysis = JSON.parse(raw);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-thought error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
