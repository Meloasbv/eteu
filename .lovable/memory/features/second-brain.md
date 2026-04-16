---
name: Second Brain
description: Captura de pensamentos com IA contextual (psicológica + bíblica), grafo inteligente com Modo Foco, conexões explicadas, controles por nó (editar/arquivar/excluir/remover conexões)
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
- **Arquivar / Restaurar**: marca `archived=true`. Some do grafo e da lista de contexto da IA, mas continua no feed (toggle "Com arquivados").
- **Remover conexões**: deleta todas linhas em `thought_connections` onde o pensamento aparece como A ou B.
- **Excluir permanentemente**: confirmação inline destrutiva; remove conexões antes do thought.

## Grafo inteligente (ThoughtGraph)
- **Espessura por strength**: linhas variam de 0.6px (fraca) a 3.8px (forte). Conexões fortes renderizam por cima das fracas.
- **Cor da linha por connection_type**: semantic=ouro, emotional=rosa, thematic=azul, causal=laranja, recurring=roxo.
- **Brilho pulsante (sin wave)**: nós e linhas criados nos últimos 7 dias têm halo animado.
- **Distância do link inversamente proporcional ao strength**: conexões fortes ficam mais próximas.
- **Hover**: pill label com background escuro acima do nó + glow do node + edges destacados.

## Modo Foco
- Ao clicar em um nó na bottom sheet → botão "Entrar em Modo Foco".
- Esconde todos os nós exceto o focado e seus vizinhos diretos (mesma viewport).
- Header de topo com "Voltar ao grafo" + contador de conexões.
- **Painel lateral direito (desktop ≥768px)**: mostra pensamento focado no topo, lista todas as conexões ordenadas por strength com:
  - Tipo (emoji + label colorido)
  - Barra de força (0–100%)
  - Explicação da IA em itálico ("...")
  - Snippet do pensamento conectado → clicar muda o foco para ele.
- **Bottom sheet (mobile)**: mesma info compacta, sem snippet completo.

## Filtros (não-foco)
- Período: Semana / Mês / 3 Meses / Tudo.
- Tipo: filtro multi-coloreado expandível.
