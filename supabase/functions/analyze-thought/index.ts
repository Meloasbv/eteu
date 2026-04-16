import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Você é um conselheiro sábio que combina psicologia (TCC, Inteligência Emocional) com sabedoria bíblica reformada.
O usuário registra pensamentos no seu "Segundo Cérebro". Você recebe o pensamento ATUAL e uma lista numerada de PENSAMENTOS PASSADOS dele.

Sua tarefa: analisar o pensamento atual E identificar conexões REAIS e EXPLICADAS com pensamentos passados.

Retorne APENAS JSON válido (sem markdown, sem backticks):

{
  "detected_type": "problema|insight|estudo|reflexão|oração|decisão|emocional|ideia|pergunta",

  "psychological_analysis": {
    "pattern": "Nome do padrão psicológico (ex: Catastrofização, Ruminação, Autocobrança)",
    "explanation": "1-2 frases sobre o que está acontecendo psicologicamente",
    "reframe": "Forma alternativa e saudável de enxergar (1 frase)"
  },

  "biblical_analysis": {
    "principle": "Princípio bíblico aplicável",
    "verses": ["Referência 1", "Referência 2"],
    "application": "Como a Escritura fala sobre isso (1-2 frases)"
  },

  "diagnosis": {
    "summary": "Diagnóstico em 1 frase direta",
    "action": "Ação prática sugerida",
    "question": "Pergunta para aprofundar"
  },

  "keywords": ["palavra1", "palavra2", "palavra3"],

  "emotion_score": { "valence": 0.0, "intensity": 0.0 },

  "connections": [
    {
      "past_index": 0,
      "type": "semantic|emotional|thematic|causal|recurring",
      "strength": 0.75,
      "explanation": "Por que esses dois pensamentos estão conectados (1 frase concreta, ex: 'Ambos refletem autocobrança após falha')."
    }
  ]
}

REGRAS PARA CONNECTIONS:
- Inclua APENAS conexões REAIS e específicas. Se não houver, retorne array vazio [].
- Máximo 5 conexões. Priorize as mais fortes.
- past_index = índice (0-based) do pensamento passado na lista que recebeu.
- type:
  • "semantic" = mesmo assunto / sobreposição de keywords genuína
  • "emotional" = mesma carga emocional ou padrão emocional
  • "thematic" = mesmo tema espiritual / teológico
  • "causal" = um parece ser causa ou consequência do outro
  • "recurring" = padrão que se repete (mesmo problema, mesma luta)
- strength: 0.3 (fraca) a 1.0 (muito forte). Seja honesto. Se for fraca, marque como fraca.
- explanation deve ser ESPECÍFICA, não genérica. Ruim: "ambos falam de fé". Bom: "Ambos mostram cobrança própria após falhar com a esposa".

REGRAS GERAIS:
- Seja direto. Sem rodeios.
- Análise psicológica nomeia padrões reais.
- Análise bíblica teologicamente sólida (perspectiva reformada).
- Versículos MAIS relevantes para a situação específica.
- valence: -1.0 (muito negativo) a 1.0 (muito positivo)
- intensity: 0.0 (calmo) a 1.0 (intenso)`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, pastThoughts } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // pastThoughts: [{ id, type, content, keywords?, created_at? }]
    const past = (pastThoughts || []).slice(0, 30);
    const pastText = past.length === 0
      ? "(nenhum pensamento anterior)"
      : past.map((t: any, i: number) => {
          const kw = (t.keywords && t.keywords.length > 0) ? ` [${t.keywords.slice(0, 4).join(", ")}]` : "";
          return `${i}. [${t.type}] "${(t.content || "").substring(0, 180)}"${kw}`;
        }).join("\n");

    const userMessage = `PENSAMENTO ATUAL:\n"${content}"\n\nPENSAMENTOS PASSADOS DO USUÁRIO (use o índice para referenciar em "connections"):\n${pastText}`;

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
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    const analysis = JSON.parse(raw);

    // Resolve past_index -> id, filter invalid
    const rawConns = Array.isArray(analysis.connections) ? analysis.connections : [];
    const resolvedConnections = rawConns
      .map((c: any) => {
        const idx = Number(c.past_index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= past.length) return null;
        const target = past[idx];
        if (!target?.id) return null;
        const strength = Math.max(0.1, Math.min(1, Number(c.strength) || 0.5));
        return {
          target_id: target.id,
          type: typeof c.type === "string" ? c.type : "semantic",
          strength,
          explanation: typeof c.explanation === "string" ? c.explanation.slice(0, 500) : "",
        };
      })
      .filter(Boolean);

    analysis.resolved_connections = resolvedConnections;

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
