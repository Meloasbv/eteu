

## Leitura por voz (TTS) integrada ao Modo Foco

Adiciona uma camada de leitura em voz alta dentro do Modo Foco — visualmente coerente com a paleta neon (#00FF94 / #0B0F14) e os artifacts atuais. Tudo via Web Speech API (sem custo, sem chave) e em PT‑BR, com um mini‑player flutuante no topo do chat.

---

### 1. Núcleo: hook + player global

**`src/hooks/useFocusTTS.ts` (novo)**
Hook singleton que controla `window.speechSynthesis`:
- Estado: `playingId | null`, `isPaused`, `rate` (0.85, 1, 1.15, 1.3), `progress` (0–1).
- API: `speak(id, text, opts?)`, `pause()`, `resume()`, `stop()`, `setRate(n)`.
- Quebra automática em sentenças (`.`, `!`, `?`, `;`) para permitir pular frase e progresso visível.
- Auto‑escolha de voz pt‑BR (primeira `voice.lang.startsWith("pt")`).
- Persiste `rate` em `localStorage[focus-tts-rate]`.
- Pausa automática se outro `id` chamar `speak()` (apenas um áudio por vez).
- Limpeza no `unmount` global e quando o Foco fecha.

**`src/components/secondbrain/FocusTTSPlayer.tsx` (novo)**
Mini‑player flutuante posicionado abaixo da top‑bar do `FocusWorkspace`, sticky, só aparece quando há `playingId`:
- Largura `max-w-[760px]` centralizada, igual ao chat.
- Card translúcido com borda neon (mesmo estilo do `ArtifactShell`).
- Conteúdo: ícone pulsante + label do que toca (ex: "Lendo · João 3:16") + barra de progresso fina + controles `Pause/Play`, `Stop`, dropdown de velocidade `1x`, e `X`.
- Animação de onda sonora (3 barrinhas verdes) quando ativo.

---

### 2. Botão "Ouvir" reutilizável nos artifacts

**`src/components/secondbrain/artifacts/ListenButton.tsx` (novo)**
Componente compacto reutilizável:
- Estado visual: idle (`Headphones`), playing (`Pause` + onda animada), paused (`Play`).
- Usa `useFocusTTS` com `id` único por artifact (ex: `verse-${ref}`, `dev-${ref}`, `answer-${id}`).
- Estilo idêntico ao `ArtifactAction`, variante `primary` quando ativo.

**Integração nos artifacts existentes (cada um ganha "Ouvir" na barra de ações):**
- `VerseArtifact.tsx` — lê o `text` do versículo. Botão antes de "Exegese".
- `DevotionalTodayArtifact.tsx` — lê `verseText + summary` concatenados.
- `ExegeseArtifact.tsx` — lê o resultado completo da exegese (após carregar).
- `AnswerArtifact.tsx` — lê a resposta do assistente.
- `ReadingArtifact.tsx` — botão "Ouvir leitura" abre o `ReadingFocusView` já existente (que tem TTS verso a verso) para preservar UX rica.

**Mensagens de texto do assistente (não‑artifact)**
No `FocusCommandChat.tsx`, ao lado do label "ASSISTENTE", aparece um `ListenButton` minúsculo (12px) que lê `m.text` corrido — útil para perguntas curtas e saudações.

---

### 3. Comandos de voz no chat

**`src/lib/focusIntent.ts`** ganha 3 atalhos:
- `/^(parar|pausar|silenciar)\s+(leitura|voz|áudio)/i` → dispara `useFocusTTS.stop()` via custom event `focus-tts-stop`.
- `/^(ler|ouvir)\s+em\s+voz/i` (sem argumento) → lê o último artifact/mensagem do assistente.
- `/^(ler|ouvir)\s+(.+)/i` (com referência bíblica) → cria `verse` artifact e auto‑inicia leitura.

`FocusWorkspace` escuta `focus-tts-stop` e chama o hook.

---

### 4. Comportamento e detalhes finos

- **Música de fundo**: ao iniciar TTS, volume do YouTube cai automaticamente para 30 % (via `useFocusMusic.changeVolume`); ao parar, restaura o valor anterior.
- **Pomodoro**: TTS continua rodando independente do timer.
- **Mobile**: o mini‑player respeita `safe-area-inset-bottom` do composer e fica acima dele; controles com `min-h-[40px]`.
- **Iframes/PWA**: Web Speech API funciona sem libs externas, totalmente offline, sem custo.
- **Reduced motion**: oculta a onda sonora animada se `prefers-reduced-motion`.
- **Acessibilidade**: `aria-live="polite"` no player, `aria-label` em todos os botões.

---

### Arquivos

**Novos (3):**
- `src/hooks/useFocusTTS.ts`
- `src/components/secondbrain/FocusTTSPlayer.tsx`
- `src/components/secondbrain/artifacts/ListenButton.tsx`

**Editados (7):**
- `src/components/secondbrain/FocusWorkspace.tsx` — monta o `FocusTTSPlayer`, ducking de música, listener de stop.
- `src/components/secondbrain/FocusCommandChat.tsx` — `ListenButton` ao lado do label "ASSISTENTE".
- `src/components/secondbrain/artifacts/VerseArtifact.tsx`
- `src/components/secondbrain/artifacts/DevotionalTodayArtifact.tsx`
- `src/components/secondbrain/artifacts/ExegeseArtifact.tsx`
- `src/components/secondbrain/artifacts/AnswerArtifact.tsx`
- `src/components/secondbrain/artifacts/ReadingArtifact.tsx` (botão "Ouvir leitura focada")
- `src/lib/focusIntent.ts` — comandos de voz.

---

### Memória a salvar
`mem://features/second-brain/focus-tts` — descrição do sistema TTS singleton, ducking de música, padrão de IDs por artifact.

