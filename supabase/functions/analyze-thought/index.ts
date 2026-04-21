import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_PROMPT = `Você é um conselheiro sábio que combina psicologia (TCC, Inteligência Emocional) com sabedoria bíblica reformada.
O usuário registra pensamentos no seu "Segundo Cérebro". Você recebe o pensamento ATUAL, a ÁREA em que ele foi capturado, e uma lista numerada de PENSAMENTOS PASSADOS dele.

Retorne APENAS JSON válido (sem markdown, sem backticks).

Estrutura JSON base:
{
  "detected_type": "problema|insight|estudo|reflexão|oração|decisão|emocional|ideia|pergunta",
  "psychological_analysis": { "pattern": "...", "explanation": "...", "reframe": "..." },
  "biblical_analysis": { "principle": "...", "verses": ["..."], "application": "..." },
  "diagnosis": { "summary": "...", "action": "...", "question": "..." },
  "keywords": ["..."],
  "emotion_score": { "valence": 0.0, "intensity": 0.0 },
  "connections": [
    { "past_index": 0, "type": "semantic|emotional|thematic|causal|recurring", "strength": 0.75, "explanation": "..." }
  ]
}

REGRAS PARA CONNECTIONS:
- APENAS conexões REAIS e específicas; máximo 5; explanation concreta.
- past_index = índice (0-based) na lista recebida.
- strength: 0.3–1.0 honesto.

REGRAS GERAIS:
- Direto, sem rodeios.
- Padrões psicológicos reais (TCC).
- Análise bíblica reformada com versículos relevantes.
- valence: -1.0 a 1.0; intensity: 0.0 a 1.0.`;

const AREA_INSTRUCTIONS: Record<string, string> = {
  reflexao: `
ÁREA: REFLEXÃO 🪞
- Tom: calmo, analítico, sem julgamento. Como terapeuta TCC cristão.
- Foque em padrão emocional e cognitivo (catastrofização, ruminação, autocobrança, etc).
- ADICIONE ao JSON o campo "reflection_exercise":
  {
    "title": "Nome curto do exercício (ex: Reestruturação cognitiva)",
    "questions": ["Pergunta 1 que faz pensar", "Pergunta 2", "Pergunta 3"]
  }
- 3 perguntas guiadas que ajudem o usuário a destrinchar o pensamento.`,
  oracao: `
ÁREA: ORAÇÃO 🙏
- Tom: acolhedor, pastoral, reverente. Sem psicologismos pesados — fale como pastor reformado.
- psychological_analysis pode ser breve ou omitido. Foque em biblical_analysis.
- ADICIONE ao JSON o campo "suggested_prayer":
  "Texto de uma oração curta (3 a 5 frases), em primeira pessoa, ARA-style, que o usuário possa orar agora mesmo a partir desse pensamento."
- diagnosis.action = passo concreto de fé/oração.`,
  brainstorm: `
ÁREA: BRAINSTORM ⚡
- Tom: energético, criativo, prático. Como mentor estratégico.
- Foque em desdobrar a ideia, não em emoções.
- ADICIONE ao JSON o campo "expansion":
  {
    "angles": ["Ângulo 1 da ideia", "Ângulo 2", "Ângulo 3"],
    "next_steps": ["Próximo passo concreto 1", "Próximo passo 2"],
    "risks": ["Risco/objeção a considerar"]
  }
- diagnosis.action = primeiro próximo passo prático.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, pastThoughts, area } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const past = (pastThoughts || []).slice(0, 30);
    const pastText = past.length === 0
      ? "(nenhum pensamento anterior)"
      : past.map((t: any, i: number) => {
          const kw = (t.keywords && t.keywords.length > 0) ? ` [${t.keywords.slice(0, 4).join(", ")}]` : "";
          return `${i}. [${t.type}] "${(t.content || "").substring(0, 180)}"${kw}`;
        }).join("\n");

    const areaKey = typeof area === "string" && AREA_INSTRUCTIONS[area] ? area : null;
    const systemPrompt = areaKey
      ? `${BASE_PROMPT}\n\n${AREA_INSTRUCTIONS[areaKey]}`
      : BASE_PROMPT;

    const areaLabel = areaKey ? `\nÁREA: ${areaKey.toUpperCase()}` : "";
    const userMessage = `PENSAMENTO ATUAL:${areaLabel}\n"${content}"\n\nPENSAMENTOS PASSADOS DO USUÁRIO (use o índice para referenciar em "connections"):\n${pastText}`;

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
