

## Plan: 5 Correções no Fascinação

### 1. Remover aba Quiz
- **`src/pages/Index.tsx`**: Remover `"quiz"` do tipo de estado `tab`, remover o item Quiz do array `TABS`, remover `import Quiz`, remover o bloco `{tab === "quiz" && <Quiz ... />}`
- Não deletar os arquivos Quiz.tsx e quizData.ts (podem ser usados futuramente)

### 2. Melhorar formatação das respostas da IA no Assistente
- **`src/components/study/ChatMessage.tsx`**: Melhorar a renderização markdown — aumentar espaçamento entre seções, adicionar separadores visuais entre blocos, melhorar tipografia dos headings (Georgia serif, tamanhos maiores), estilizar blockquotes com borda dourada e fundo sutil, melhorar listas com bullets estilizados, adicionar espaçamento `prose-p:my-2` e `prose-headings:mt-6 prose-headings:mb-3`
- **`supabase/functions/study-chat/index.ts`**: Ajustar o system prompt para instruir a IA a formatar respostas com seções claras usando `##`, usar listas com bullets, separar parágrafos curtos, e evitar blocos de texto densos. Adicionar instrução: "Quebre respostas em seções curtas com subtítulos. Use parágrafos curtos (2-3 frases máximo). Use listas quando possível."

### 3. Conectar ChatGPT API (usar Lovable AI com modelo GPT)
- **`supabase/functions/study-chat/index.ts`**: Trocar o modelo de `google/gemini-2.5-flash` para `openai/gpt-5-mini` (melhor custo-benefício via Lovable AI gateway — mesma infraestrutura, sem necessidade de API key do OpenAI)
- Todas as outras edge functions que usam IA (`bible-context`, `verse-ai`, `notes-ai`, etc.) podem manter os modelos atuais ou ser migradas conforme necessidade futura

### 4. Corrigir pesquisa de versículo nas Notas (BibleContextPanel)
- **Problema**: O `BibleContextPanel` ao abrir só mostra o versículo na aba "Versículo" mas as abas "Contexto", "Exegese" e "Conexões" dependem de clicar manualmente em cada aba e chamar a edge function `bible-context`
- **Correção em `src/components/BibleContextPanel.tsx`**: Ao abrir o painel, auto-carregar a aba de Exegese junto com o versículo (pré-fetch dos dados de contexto e exegese em paralelo), e mudar o tab inicial para "exegesis" em vez de "verse" para mostrar as informações ricas diretamente
- Verificar se a edge function `bible-context` está deployada e funcionando corretamente

### 5. Melhorar visual do campo Assistente
- **`src/components/study/AssistantChat.tsx`**: Melhorar espaçamento das mensagens (gap de 16px entre mensagens), adicionar avatar/ícone para o assistente (📖 ou ícone subtle), melhorar a animação de typing (dots mais elegantes), aumentar padding das mensagens
- **`src/components/study/ChatMessage.tsx`**: Adicionar borda sutil nas mensagens do assistente, melhorar contraste tipográfico, aumentar line-height para 1.8, adicionar animação de fade-in suave nas novas mensagens
- **`src/components/study/SuggestionCards.tsx`**: Verificar e melhorar o visual dos cards de sugestão iniciais

### Arquivos modificados
1. `src/pages/Index.tsx` — remover Quiz
2. `src/components/study/ChatMessage.tsx` — melhorar formatação markdown
3. `supabase/functions/study-chat/index.ts` — trocar modelo + ajustar prompt
4. `src/components/BibleContextPanel.tsx` — auto-carregar exegese
5. `src/components/study/AssistantChat.tsx` — melhorar visual do chat

