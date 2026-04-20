# Plano: PDFs Completos + Estudo Guiado

## Diagnóstico do problema atual

Hoje o `analyze-content` envia o PDF inteiro para a IA em 1-3 chamadas grandes. Em PDFs longos (Wesley = 19 slides densos) a IA atinge o teto de tokens da resposta e **comprime/corta** seções inteiras. Você viu isso: o mapa do Wesley perdeu metade dos pontos.

A solução é **pré-organizar o texto mecanicamente** (sem IA) em grupos por título, e depois chamar a IA **uma vez por grupo em paralelo**. Cada chamada cuida de 1-3 páginas → cabe folgado no orçamento de tokens → nada é cortado.

Como você escolheu **Estudo Guiado como modo padrão**, o foco da renderização vira a leitura linear estruturada. O Mapa Mental continua como toggle alternativo usando os mesmos dados.

---

## Bloco 1 — Pipeline em 2 etapas (resolve o corte)

### 1.1 Pré-processamento mecânico (sem IA)

Novo `src/lib/pdfPreprocess.ts`:

```ts
interface ExtractedSlide {
  page: number;
  title: string;            // 1ª linha substantiva
  body: string;
  hasQuote: boolean;
  detectedVerses: string[];
}

interface SlideGroup {
  title: string;
  slides: ExtractedSlide[];
  pageRange: [number, number];
  totalChars: number;
  isQuiz?: boolean;
}

export function preprocessPDF(pagesText: {page:number,text:string}[]): SlideGroup[]
```

Regras:
- Slides consecutivos com mesmo título → mesmo grupo
- Slide sem título detectado → continua o grupo anterior
- `totalChars > 6000` força split
- Keywords "quiz", "fixando", "perguntas" → grupo `__quiz__`

### 1.2 Nova edge function `analyze-slide-group`

Recebe **um grupo** (1-3 páginas) e devolve estrutura completa, sem cortar. Modelo: `google/gemini-2.5-flash`.

Schema:
```ts
{
  title, summary, category, source_slides,
  core_idea,
  key_points: string[],          // TODOS, sem cortar
  subsections: [{subtitle, points, source_slides}],
  verses, quotes, stories,        // já existentes
  key_dates: [{date, event}],     // NOVO
  key_people: [{name, role, points?}], // NOVO
  application, impact_phrase,
  highlights: string[]
}
```

Prompt enfatiza: NÃO CORTAR. Extrair TODOS os pontos/datas/pessoas/citações literais.

### 1.3 Orquestração paralela no front

`src/lib/mindMapPipeline.ts` com `Promise.allSettled` + callback `onProgress`. Renderização incremental — cada grupo aparece assim que retorna.

### 1.4 `analyze-content` legado

Continua funcionando para texto colado/manual. Para PDF, front passa a usar: `extract-pdf` → `preprocessPDF` → N x `analyze-slide-group` em paralelo → assemble local.

### 1.5 Loading progressivo

`PipelineProgress.tsx` — lista de grupos com status ✓/⏳/○ + barra "3/11 seções".

---

## Bloco 2 — Estudo Guiado (modo padrão)

### Componentes (`src/components/study-guide/`)

- `StudyGuide.tsx` — container, gerencia activeSection
- `StudySummary.tsx` — sumário clicável com âncoras
- `StudySection.tsx` — título + core idea + subsections + datas + pessoas
- `StudySubsection.tsx` — collapse/expand (Radix Collapsible, **fechado por default**)
- `StudyPersonCard.tsx` — 👤 nome + role + bullets
- `StudyDateTimeline.tsx` — timeline horizontal scrollable
- `StudyQuoteBlock.tsx` — citação + autor + slide ref
- `StudyVerseChips.tsx` — chips abrem VersePopover existente
- `StudyQuiz.tsx` — quiz parseado do PDF (não inventado)

### Toggle Guiado ↔ Mapa

`MindMapTab.tsx`:
```tsx
const [view, setView] = useState<'guide'|'map'>('guide');
```
Header: `[ 📚 Estudo Guiado ] [ 🗺️ Mapa Mental ]`. Sincroniza `activeSection` ao trocar.

### Visual

Premium Dark/Gold já estabelecido. Cinzel headings + Crimson body. Cards de pessoa com avatar gold. Timeline com pontos `#c4a46a` sobre linha cinza.

### Quiz auto-detectado

Se grupo `__quiz__` existe, parse mecânico (regex "1.", "a)") → `StudyQuiz`. Se não existe, **não inventar**.

---

## Bloco 3 — Tipos e integração

`src/components/mindmap/types.ts`:
```ts
export interface KeyDate { date: string; event: string; source_slide?: number }
export interface KeyPerson { name: string; role: string; points?: string[]; source_slide?: number }
```
Estende `KeyConcept` e `AnalysisResult`. Persistência: `mind_maps.study_notes` (jsonb existente, sem migration).

`SharedMindMap.tsx` ganha o mesmo toggle.

---

## Bloco 4 — Export PDF do Estudo Guiado

`src/lib/exportStudyGuide.ts` com jsPDF:
- Capa, sumário, seções com core idea destacada, bullets, citações em blockquote, timeline renderizada via canvas, quiz no final + gabarito.
Botão no header do Estudo Guiado.

---

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/pdfPreprocess.ts` | NOVO |
| `src/lib/mindMapPipeline.ts` | NOVO |
| `supabase/functions/analyze-slide-group/index.ts` | NOVO |
| `src/components/mindmap/PipelineProgress.tsx` | NOVO |
| `src/components/study-guide/*` (9 arquivos) | NOVOS |
| `src/lib/exportStudyGuide.ts` | NOVO |
| `src/components/mindmap/types.ts` | + KeyDate, KeyPerson |
| `src/components/mindmap/MindMapTab.tsx` | + toggle, padrão = guide |
| `src/components/mindmap/MindMapInput.tsx` | usa novo pipeline para PDF |
| `src/pages/SharedMindMap.tsx` | + toggle |

---

## Plano de execução em 3 fases

1. **Fase 1 — Pipeline** (Bloco 1): pdfPreprocess + analyze-slide-group + mindMapPipeline + PipelineProgress. Resultado renderizado no Mapa Mental atual. **Você testa o Wesley aqui** e confirma que o corte sumiu antes de eu seguir.
2. **Fase 2 — Estudo Guiado** (Bloco 2 + 3): componentes + toggle + vira padrão.
3. **Fase 3 — Export PDF** (Bloco 4).

---

## Fora de escopo

- Reordenar seções por drag
- Anotações por seção (já existe Notebook)
- IA inventar quiz quando PDF não tem (você foi explícito: não inventar)
- Apresentação cinematográfica do Estudo Guiado (Mapa já tem)

---

## Próximo passo

Vou começar pela **Fase 1**. Quando terminar, paro e te aviso para testar o Wesley. Só depois sigo para Fase 2 e 3.
