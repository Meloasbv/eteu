---
name: Second Brain
description: Captura de pensamentos com IA contextual (psicológica + bíblica), conexões explicadas, controles por nó (editar/arquivar/excluir/remover conexões) e detecção de padrões
type: feature
---

# Second Brain — Memória inteligente

## Captura
- Tabela `thoughts` (Supabase, RLS por user_code_id, coluna `archived` boolean default false).
- Tipos: problema, insight, estudo, reflexão, oração, decisão, emocional, ideia, pergunta. Modo "Auto" deixa a IA detectar.
- Voz via Web Speech API (pt-BR).

## IA contextual (analyze-thought)
- Edge function `analyze-thought` recebe `{ content, pastThoughts: [{id, type, content, keywords}] }` (até 25 não arquivados).
- Modelo: `google/gemini-2.5-flash`.
- Retorna análise psicológica (TCC), bíblica (reformada), diagnóstico, keywords, emotion_score E `connections[]` referenciando `past_index` que o backend resolve para `target_id`.
- Connection types: semantic | emotional | thematic | causal | recurring; strength 0.1–1.0; explanation obrigatória e específica.
- Frontend persiste via upsert em `thought_connections` com par ordenado (least/greatest) — índice único `thought_connections_pair_uniq` previne duplicatas.

## Controles por pensamento (menu MoreHorizontal)
- **Editar**: edição inline do texto.
- **Arquivar / Restaurar**: marca `archived=true`. Some do grafo e da lista de contexto da IA, mas continua no feed (toggle "Com arquivados"). Excluído do envio para a IA ao gerar conexões.
- **Remover conexões**: deleta todas linhas em `thought_connections` onde o pensamento aparece como A ou B.
- **Excluir permanentemente**: confirmação inline destrutiva; remove conexões antes do thought.

## Conexões explicadas
- Cada conexão IA mostra: tipo, barra de força (0–100%), explicação específica do porquê foi conectada.
- Renderizadas dentro do card expandido na seção "🔗 Conexões detectadas".
