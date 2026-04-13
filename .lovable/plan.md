

## Plan: Modo IA nas Notas — Transcrição de Áudio com Formatação Automática

### O que será feito

Adicionar um botão **"🎙️ Modo IA"** no editor de notas que:
1. Grava áudio do microfone usando Web Speech API (reconhecimento em tempo real)
2. Envia a transcrição para uma edge function que usa **GPT-5-mini** (via Lovable AI gateway)
3. A IA corrige, formata com headings/negrito/listas, detecta referências bíblicas e insere versículos automaticamente como blockquotes
4. O resultado formatado é inserido diretamente no editor TipTap como HTML

### Arquivos modificados

#### 1. `supabase/functions/transcribe-format/index.ts` — Nova edge function
- Recebe o texto transcrito bruto do Speech API
- Usa `openai/gpt-5-mini` via Lovable AI gateway com system prompt especializado:
  - Corrigir nomes bíblicos e termos teológicos mal transcritos
  - Formatar em Markdown com `##` headings, **negrito**, listas
  - Detectar referências bíblicas mencionadas e inserir como `> "texto" — Referência`
  - Buscar os versículos corretos e incluí-los formatados
- Retorna HTML pronto para inserção no editor

#### 2. `src/components/study/NoteEditor.tsx` — Adicionar Modo IA
- Novo botão **"🎙️ Modo IA"** na barra de ferramentas (ao lado de "Imagem" e "IA Chat")
- Ao ativar:
  - Inicia `webkitSpeechRecognition` / `SpeechRecognition` (contínuo, pt-BR)
  - Mostra indicador visual pulsante vermelho "Gravando..."
  - Texto transcrito aparece em tempo real num preview abaixo da toolbar
- Ao parar (botão ou silêncio prolongado):
  - Envia a transcrição completa para `transcribe-format`
  - Recebe HTML formatado com versículos inseridos
  - Insere no editor TipTap na posição do cursor
  - Mostra toast de sucesso

#### 3. `supabase/functions/study-chat/index.ts` — Já usa GPT, sem mudanças
#### 4. `supabase/functions/notes-ai/index.ts` — Trocar modelo para `openai/gpt-5-mini`
#### 5. `supabase/functions/summarize-transcript/index.ts` — Trocar modelo para `openai/gpt-5-mini`

### Fluxo do usuário

```text
1. Abre nota → toca "🎙️ Modo IA"
2. Fala: "Hoje vamos estudar João 3:16, o versículo diz que Deus amou o mundo..."
3. Texto aparece em tempo real no preview
4. Toca "Parar" → IA processa em 2-3 segundos
5. Editor recebe HTML formatado:
   - ## Estudo de João 3:16
   - > "Porque Deus amou o mundo..." — João 3:16
   - Parágrafos formatados com negrito nos termos-chave
```

### Detalhes técnicos
- Web Speech API é nativa do browser, sem dependências extras
- Fallback: se Speech API não disponível, mostra mensagem informativa
- O processamento IA acontece server-side na edge function
- Toda a infra usa Lovable AI gateway (sem API key adicional necessária)

