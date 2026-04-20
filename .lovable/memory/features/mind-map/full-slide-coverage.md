---
name: Mind Map — Cobertura total dos slides + Fullscreen
description: Edge function analyze-content tem 3ª passada gerando slide_summaries por slide, PresentationMode inclui overview clicável + 1 stop por slide, MindMapCanvas tem botão fullscreen
type: feature
---
## Edge function (analyze-content)
- **PASS 3** após expansão dos topics: gera `slide_summaries[{slide,title,summary,topic_id?,category?}]` em batches de 25 slides via `SLIDES_SUMMARY_PROMPT`. Cada slide vira 1 objeto (≤22 palavras). Fallback usa o texto cru do slide (140 chars).
- Cross-link automático: cada slide_summary recebe `topic_id` + `category` se cair no `source_slides` de algum topic expandido.
- Resultado é incluído em `result.slide_summaries`. Tipo adicionado em `src/components/mindmap/types.ts` como `SlideSummary` + campo opcional em `AnalysisResult`.

## PresentationMode tour
- Após todos os topics, adiciona 1 stop `slides-overview` (grade clicável de TODOS os slides com badge numérico colorido por categoria) seguido de 1 stop `slide-summary` por slide.
- Clicar em qualquer slide na overview salta diretamente naquele stop.
- Camera focus zoom: overview = 0.75. Autoplay dwell: overview 6s, slide-summary 3s.

## MindMapCanvas fullscreen
- Botão `Maximize2/Minimize2` no toolbar superior (top-center) e no header (perto do X).
- Usa `containerRef.requestFullscreen()` + listener `fullscreenchange` para sincronizar estado.
- Background do container muda para `#16130f` em fullscreen para ficar consistente.
