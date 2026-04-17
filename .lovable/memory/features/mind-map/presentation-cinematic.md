---
name: Mind Map — Cinematic Presentation Mode
description: Apresentar = tour fullscreen do mapa real com pan+zoom animado entre TODOS os nodes (root, topics, highlights, verses), com legendas ricas e auto-play
type: feature
---
## Architecture
- `PresentationMode.tsx` envolve um `ReactFlow` em `ReactFlowProvider` e usa `useReactFlow().setCenter(x, y, { zoom, duration: 900 })` para pan+zoom cinematográfico entre stops.
- Tour sequencial: root → para cada topic [topicCard, child_highlights..., child_verses...]. Construído em `buildTour(analysis)`.
- Node atual fica com `opacity: 1`, demais com `0.35` (transição 0.6s). Edges relacionadas ao node em destaque ficam com opacity 1.
- Zoom por tipo: root 0.85, topic 1.1, highlight/verse 1.4.

## Controls
- → / Espaço: próximo stop · ← anterior · P: auto-play · F: fit-view · Esc: sair
- Auto-play (Play/Pause): dwell 4.5s topic · 3.5s root · 2.8s highlight/verse
- Click zones invisíveis nas laterais (15% width) avançam/voltam
- Touch swipe horizontal

## Caption overlay
Painel inferior (até 38vh) com gradient blur e conteúdo específico por tipo:
- root → tema central + summary
- topic → categoria + page_ref + título + core_idea + 4 affirmations + impact_phrase
- highlight → "Destaque · {topic}" + frase
- verse → badge + referência grande + topic de origem

## Analyze-content prompt
- Cobertura TOTAL: mínimo 6 topics (8-12 ideal); para PDF gerar topic por seção
- `is_key: true` reservado para 3-5 topics centrais (apenas esses recebem imagem AI)
- 3-5 child_highlights por topic, 2-4 child_verses
- 3-6 highlights standalone + 2-5 verses standalone globais
- Corpus PDF até 45k chars, texto até 30k chars, max_tokens: 24000
