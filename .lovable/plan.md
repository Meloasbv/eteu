

# Modo Foco como Hub de Artifacts (estilo Claude)

Transformar o chat do Modo Foco num **command center** onde cada mensagem do usuário é classificada por intenção e responde com um **artifact interativo inline** (cards específicos no fluxo do chat), em vez de abrir o painel inteiro da plataforma.

Backend de Leitura, Devocional, Mapa Mental, Notas e Segundo Cérebro **permanece exatamente como está** — só o que muda é a camada de apresentação dentro do Modo Foco.

---

## O que muda visualmente

**Hoje:** digitar "leitura" abre o `<DevotionalTab/>` ou `<StudyTab/>` inteiro como iframe-like (48vh / 82vh). Pesado, descontextualizado.

**Depois:** digitar "leitura de hoje" mostra um **card compacto verde-neon** dentro do chat com a leitura do dia, checkboxes que marcam direto no Supabase, e botões de ação encadeada. O chat continua sendo o foco.

```text
👤 leitura de hoje

🤖 Sua leitura de Segunda — Semana 13.
   ┌──────────────────────────────────────────┐
   │ 📖 LEITURA DO DIA       Seg · Semana 13  │
   │ ─────────────────────────────────────    │
   │ ☐ Ez 45-48    ☐ Joel 1-3    ☐ Dn 1-3    │
   │ [✓ Marcar tudo]  [📖 Abrir focus mode]   │
   └──────────────────────────────────────────┘
```

---

## Arquitetura

### 1. Edge Function `focus-intent` (nova)
Classificador de intenção via Lovable AI Gateway (`google/gemini-3-flash-preview`) com tool calling estruturado. Recebe `{ text, context }`, retorna:

```ts
{
  intent: "leitura" | "devocional" | "mapa_mental" | "nota" |
          "cerebro" | "exegese" | "versiculo" | "pergunta" |
          "capturar" | "timer" | "saudacao",
  params: { ... },           // chapter, reference, content, etc.
  response_text: string      // 1-2 frases para o assistente dizer antes do artifact
}
```

Detecção rápida client-side por regex para comandos óbvios (`"leitura"`, `"devocional"`, `"capturar:"`) — só cai pro classificador AI quando a intenção for ambígua. Economiza latência e custo.

### 2. Estrutura de mensagem com artifact

`src/components/secondbrain/FocusCommandChat.tsx` ganha tipo:

```ts
type ArtifactType =
  | "reading" | "devotional_today" | "mindmap_list" | "mindmap_preview"
  | "brain_capture" | "exegese" | "note_saved" | "verse"
  | "answer" | "timer" | "loading";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text?: string;                     // texto curto do assistente (1-2 frases)
  artifact?: { type: ArtifactType; data: any };
  timestamp: number;
}
```

Cada artifact é um componente próprio em `src/components/secondbrain/artifacts/`:

| Arquivo | Renderiza | Backend |
|---|---|---|
| `ReadingArtifact.tsx` | Card da leitura do dia com checkboxes | localStorage `reading-progress` (mesma chave do `WeekSchedule`) |
| `DevotionalTodayArtifact.tsx` | Versículo do dia + summary + botão "exegese completa" | `DEVOTIONALS` data + `verse-exegesis` |
| `MindMapListArtifact.tsx` | Lista de mapas + botões "Abrir / Novo / Upload PDF" | `mind_maps` Supabase |
| `MindMapPreviewArtifact.tsx` | Mini React Flow 320px de altura, zoom/pan | `mind_maps` Supabase |
| `BrainCaptureArtifact.tsx` | Pensamento registrado + análise psicológica/bíblica | `thoughts` table + `analyze-thought` |
| `ExegeseArtifact.tsx` | Contexto + termos gregos/hebraicos + aplicação | `verse-exegesis` |
| `NoteArtifact.tsx` | Confirmação de nota salva + tags | `notes` table |
| `VerseArtifact.tsx` | Texto do versículo + ações | `bible-context` + ABibliaDigital |
| `AnswerArtifact.tsx` | Resposta formatada com refs bíblicas clicáveis | `study-chat` |
| `TimerArtifact.tsx` | Card de controle do Pomodoro inline | estado local do `FocusWorkspace` |

### 3. Roteador de intenções (client)

```text
User input → detectIntentLocal(text)
              ├─ match? → executa handler direto
              └─ no match? → fetch focus-intent → handler
                              ↓
            Handler:
              1. Insere placeholder loading artifact
              2. Executa ação no backend (insert/update/AI call)
              3. Substitui placeholder pelo artifact final
              4. Adiciona texto curto do assistente acima
```

### 4. Ações encadeadas (`sendAsUser`)

Botões dentro de artifacts disparam `sendAsUser("salvar esta exegese como nota")` que injeta a frase como mensagem do usuário, processa pelo mesmo pipeline. Cria fluxo conversacional natural.

### 5. Captura inteligente do "Capturar"

O card "Capturar" da tela inicial **não envia comando** — foca no input e troca placeholder para `"O que está na sua mente?"`. O próximo envio é tratado como pensamento (intent forçado = `cerebro/capture`), evitando o classificador.

### 6. Loading states

Skeleton verde-neon pulsante com mensagem contextual:
- "Analisando seu pensamento..." (cerebro)
- "Consultando o texto original..." (exegese)
- "Construindo o mapa..." (mapa_mental)
- "Refletindo sobre isso..." (pergunta)

### 7. Persistência da sessão (opcional, fim do bloco)

Nova tabela:
```sql
CREATE TABLE focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_code_id uuid NOT NULL,
  messages jsonb DEFAULT '[]',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  focus_minutes int DEFAULT 0,
  artifacts_used text[] DEFAULT '{}'
);
```

Restaura sessão se reaberta em <2h; senão nova com saudação contextual.

### 8. Saudação automática

Ao abrir o Modo Foco com chat vazio, dispara automaticamente:
```text
🤖 Bom dia, Melo. Sua leitura de hoje é Ez 45-48, Joel 1-3, Dn 1-3.
   [ReadingArtifact com checkboxes prontos]
```
Calculado a partir de `WEEKS` + dia atual.

---

## Estilo visual (mantém paleta atual `#0B0F14` / `#00FF94`)

- Artifacts são **cards translúcidos** com `border: 1px solid rgba(0,255,148,0.12)`, `border-radius: 16px`, `backdrop-filter: blur(8px)`.
- Header do artifact: ícone 20px verde + label uppercase tracking-2px + badge à direita (semana, tipo, etc).
- Botões internos: pílulas verde-neon translúcidas com hover suave.
- Animação de entrada: fade + translateY 8px, 0.3s ease-out.
- Mensagens do assistente continuam **flush** (sem balão), tipografia serif Crimson, indent 24px.
- Mensagens do usuário continuam pílula verde sutil à direita.

---

## Arquivos afetados

**Novos:**
- `supabase/functions/focus-intent/index.ts`
- `src/components/secondbrain/artifacts/ReadingArtifact.tsx`
- `src/components/secondbrain/artifacts/DevotionalTodayArtifact.tsx`
- `src/components/secondbrain/artifacts/MindMapListArtifact.tsx`
- `src/components/secondbrain/artifacts/MindMapPreviewArtifact.tsx`
- `src/components/secondbrain/artifacts/BrainCaptureArtifact.tsx`
- `src/components/secondbrain/artifacts/ExegeseArtifact.tsx`
- `src/components/secondbrain/artifacts/NoteArtifact.tsx`
- `src/components/secondbrain/artifacts/VerseArtifact.tsx`
- `src/components/secondbrain/artifacts/AnswerArtifact.tsx`
- `src/components/secondbrain/artifacts/TimerArtifact.tsx`
- `src/components/secondbrain/artifacts/ArtifactRenderer.tsx` (switch central)
- `src/components/secondbrain/artifacts/types.ts`
- `src/lib/focusIntent.ts` (regex local + chamada à edge function)
- Migration: `focus_sessions` table + RLS

**Modificados:**
- `src/components/secondbrain/FocusCommandChat.tsx` — substitui sistema de tool panels por sistema de artifacts; adiciona saudação inicial; integra `sendAsUser`; troca handler dos quick chips.
- `src/components/secondbrain/FocusWorkspace.tsx` — atalhos da sidebar agora chamam `sendAsUser`; expõe controles do Pomodoro para o `TimerArtifact`; remove o `renderTab` (não precisa mais expor o painel da plataforma).
- `src/pages/Index.tsx` — remove `renderTab` callback; passa apenas `userCodeId` e `onClose`.
- `.lovable/memory/features/second-brain/focus-workspace.md` — atualizar para o modelo artifact-first.

---

## Plano de execução em 3 blocos

**Bloco 1 — Core (esta primeira passada):**
- Edge function `focus-intent`
- `types.ts` + `ArtifactRenderer` + `focusIntent.ts` lib
- Refatorar `FocusCommandChat` pro novo modelo
- 4 artifacts essenciais: `Reading`, `BrainCapture`, `Exegese`, `Answer`
- Saudação inicial automática
- Loading states

**Bloco 2 — Artifacts complementares:**
- `Devotional`, `Note`, `Verse`, `MindMapList`, `MindMapPreview`, `Timer`
- Ações encadeadas via `sendAsUser`
- Card "Capturar" muda placeholder do input

**Bloco 3 — Persistência:**
- Migration `focus_sessions`
- Restauração de sessão recente
- Heatmap de minutos no `TodayDashboard`

Todo o backend de leitura/devocional/mapa/notas/cérebro permanece intacto — os artifacts são uma nova camada de apresentação que conversa com as tabelas e edge functions já existentes.

