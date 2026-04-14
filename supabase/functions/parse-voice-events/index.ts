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
    const { text, date } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Texto muito curto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const today = date || new Date().toISOString().split("T")[0];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um assistente que extrai eventos de agenda a partir de texto falado. A data de referência é ${today}. Extraia TODOS os eventos mencionados. Se não houver horário específico, use horários razoáveis (ex: culto = 19:00-21:00, almoço = 12:00-13:00). Se não houver data específica, use a data de referência. Use ícones emoji relevantes.`,
          },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_events",
              description: "Extract calendar events from spoken text",
              parameters: {
                type: "object",
                properties: {
                  events: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome do evento" },
                        date: { type: "string", description: "Data no formato YYYY-MM-DD" },
                        start: { type: "string", description: "Horário de início HH:MM" },
                        end: { type: "string", description: "Horário de fim HH:MM" },
                        location: { type: "string", description: "Local do evento (opcional)" },
                        icon: { type: "string", description: "Emoji ícone relevante" },
                        repeat: { type: "string", enum: ["none", "daily", "weekly", "monthly"], description: "Repetição" },
                      },
                      required: ["name", "date", "start", "end", "icon"],
                    },
                  },
                },
                required: ["events"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_events" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições. Tente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;

    if (toolCall?.function?.arguments) {
      result = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      result = { events: [] };
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-voice-events error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
