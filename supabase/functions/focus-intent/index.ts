import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o roteador de intenções do Modo Foco do Fascinação 2026 — um app devocional reformado.

Classifique a mensagem do usuário e chame a função classify_intent com o resultado.

INTENTS DISPONÍVEIS:
- "leitura" → pediu plano/leitura do dia. params: { action: "show_today" | "show_plan" }
- "devocional" → pediu devocional/meditação do dia. params: { action: "show_today" }
- "mapa_mental" → pediu mapa mental, listar mapas, criar novo. params: { action: "list" | "create" | "open", topic?: string }
- "nota" → criar nota rápida. params: { action: "create", content: string }
- "cerebro" → registrar pensamento/sentimento/ideia (capture). params: { action: "capture", content: string }
- "exegese" → análise exegética de versículo. params: { reference: string }
- "versiculo" → mostrar texto de um versículo. params: { reference: string }
- "pergunta" → pergunta bíblica/teológica geral. params: { question: string }
- "timer" → controlar Pomodoro. params: { action: "pause" | "resume" | "reset" }
- "saudacao" → cumprimento simples. params: {}

response_text: 1 frase natural em português que o assistente diz ANTES do artifact (ex: "Aqui está sua leitura.", "Registrei seu pensamento."). NUNCA repita o input do usuário.

REGRAS:
- Se a mensagem é introspectiva, emocional ou descritiva ("estou ansioso", "me sinto perdido"), use intent="cerebro" com action="capture" e content = a mensagem inteira.
- Se cita explicitamente um versículo (ex "Rm 8:28", "João 3:16") e pede análise → "exegese". Se só quer ler → "versiculo".
- Pergunta teológica genérica sem referência específica → "pergunta".
- Se ambíguo entre nota e capturar: comandos curtos com prefixo "anotar:" → nota. Pensamentos espontâneos → cerebro.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY missing");
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_intent",
              description: "Return the routed intent for the focus chat",
              parameters: {
                type: "object",
                properties: {
                  intent: {
                    type: "string",
                    enum: [
                      "leitura",
                      "devocional",
                      "mapa_mental",
                      "nota",
                      "cerebro",
                      "exegese",
                      "versiculo",
                      "pergunta",
                      "timer",
                      "saudacao",
                    ],
                  },
                  params: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      reference: { type: "string" },
                      content: { type: "string" },
                      question: { type: "string" },
                      topic: { type: "string" },
                    },
                    additionalProperties: true,
                  },
                  response_text: { type: "string" },
                },
                required: ["intent", "params", "response_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_intent" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido, tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos na sua workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await resp.text();
      console.error("focus-intent gateway error:", resp.status, t);
      throw new Error(`Gateway error ${resp.status}`);
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("focus-intent error:", e);
    return new Response(
      JSON.stringify({
        intent: "pergunta",
        params: { question: "" },
        response_text: "",
        error: e instanceof Error ? e.message : "Unknown",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
