---
name: Mind Map — Estudo Profundo (3 níveis)
description: Cards do mapa mental geram conteúdo em 3 níveis (síntese, exploração, estudo profundo) com transformações em devocional/sermão/cartão de estudo
type: feature
---
## Estrutura de 3 níveis no expanded_note

**Nível 1 (síntese)** — gerado upfront pelo `analyze-content`:
- `core_idea`, `key_points` (4-6), `impact_phrase`

**Nível 2 (exploração)** — gerado upfront pelo `analyze-content`:
- `detailed_explanation` (parágrafo 4-7 frases)
- `historical_context` (2-4 frases)
- `examples` (2-4 ilustrações concretas)
- `key_points_deep` (cada bullet com `detail` aprofundado, expansível inline)
- `subsections`, `verses`, `author_quotes`, `application`

**Nível 3 (estudo profundo)** — fetch on-demand via edge function `deepen-concept`:
- `theological_analysis` (5-8 frases citando escolas/autores)
- `connections` (3-5 ligações com peers do mapa, com tipo de relação)
- `reflection_questions` (4-6 perguntas reflexivas)

## Edge function deepen-concept
- `mode: "deep"` → retorna análise/conexões/perguntas (Nível 3)
- `mode: "study_card" | "devotional" | "sermon_outline"` → retorna Markdown formatado pronto para salvar no Caderno
- Modelo: `google/gemini-2.5-flash` via Lovable AI Gateway

## NotePanel
- Seções renderizadas em ordem Notion-like: CORE_IDEA → EXPLICAÇÃO → CONTEXTO → EXEMPLOS → PONTOS PRINCIPAIS (com depth toggle por bullet) → SUBSECTIONS → VERSÍCULOS → CITAÇÕES → APLICAÇÃO → FRASE DE IMPACTO → ESTUDO PROFUNDO (collapsible) → TRANSFORMAR EM…
- Estudo Profundo lazy-fetched ao primeiro clique; cached por sessão (`deepData` state) e reaproveitado se já estava no `expanded_note`
- Transformações são salvas direto em `localStorage["fascinacao_study_notes"]` (categoria: Teologia/Devocionais/Sermões) — abre automaticamente no NotebookList

## TopicCard
- Badge `Sparkles + "Aprofundar"` quando o card tem `hasNote`, sinalizando que existe conteúdo profundo ao clicar
