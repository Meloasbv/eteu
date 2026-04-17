---
name: Mind Map Performance + PDF Depth + AI Images
description: Cache LRU + skeleton + prefetch para mapas salvos; PDF com page_ref/quotes/is_key; geração de imagens IA nos cards-chave (root + topics is_key) via Gemini image em background
type: feature
---
## Carregamento rápido
- mapCache.ts: LRU em memória (8 mapas), inflight dedup, invalidate no save
- MindMapTab faz prefetch on hover/focus/touchstart + warm-up das chunks lazy após 800ms
- Fallback skeleton com grid de pontos + spinner em pill dourado

## PDF expandido
- extract-pdf retorna pagesText: [{page, text}] por página
- analyze-content recebe pagesText, marca corpus com [[PÁGINA N]] e exige is_key, page_ref, quotes literais (2-3 por topic)
- Garantia: se IA não marcar nenhum is_key, primeiros 2 topics são marcados

## Imagens IA nos cards
- Edge function generate-card-image (Gemini 2.5 flash image, modalities image+text)
- Estilo fixo: dark/gold premium, símbolo único, sem texto na imagem
- Disparada em paralelo no MindMapCanvas para __root__ + topics is_key, não bloqueia render
- TopicCard e RootNode mostram imagem com loader; NotePanel mostra page_ref + blockquotes das citações
