---
name: Modo IA — Estudo Guiado por Áudio
description: Modo IA do Mapa Mental gera Estudo Guiado a partir de gravação contínua, MP3 upload ou texto; áudios salvos em storage e tocáveis no estudo
type: feature
---

## Fluxo
- Aba "Mapa Mental" → cartão "Estudo Guiado IA" abre `MindMapInput`.
- Três entradas: **Gravar áudio** · **Upload MP3** · **Escrever texto**.
- Saída sempre é `StudyGuide` (modo `ai-guide`), nunca canvas de mapa visual.

## Gravação contínua com auto-segmentação
- `MediaRecorder` + AudioContext (waveform).
- Timer global; ao atingir **600s** (10 min) o recorder atual é parado e um novo é iniciado **automaticamente** sobre o mesmo `MediaStream` — usuário continua falando sem interrupção.
- Cada segmento (`Parte 1`, `Parte 2`…) é processado independentemente: upload MP3 + Whisper.

## Transcrição (somente OpenAI)
- Edge function `transcribe-audio` chama `https://api.openai.com/v1/audio/transcriptions` (`whisper-1`, `language=pt`).
- Recebe `{ audioBase64, mimeType, fileName, language }`, retorna `{ text }`.
- Limite Whisper: 25MB por chamada.

## Storage
- Bucket público `study-audio` (migration cria policies abertas — autenticação é via código de acesso).
- `src/lib/audioStudio.ts`:
  - `uploadAudio(userCodeId, blob, fileName)` → URL pública (`audio/mpeg` content-type, sempre `.mp3`).
  - `transcribeAudioBlob(blob, language?)` → string transcrita.

## Persistência no estudo
- `AnalysisResult.source_audios?: SourceAudio[]` (`{ url, label, duration_seconds, mime_type }`).
- Salvo dentro de `mind_maps.study_notes.analysis.source_audios`.
- `StudyGuide` renderiza um bloco "Áudio original" com `<audio controls>` para cada parte, logo abaixo do header e antes do sumário.

## Upload MP3 direto
- Aceita `.mp3, .wav, .webm, .m4a, .ogg` (≤25MB).
- Mesmo pipeline: upload → Whisper → texto agregado → `analyze-content` → `StudyGuide`.

## CTAs
- Botão principal: **"Gerar Estudo Guiado"** (substitui "Gerar Mapa Mental").
- Cartão da home: **"Estudo Guiado IA"** com descrição "Áudio MP3, gravação ou texto → estudo".
