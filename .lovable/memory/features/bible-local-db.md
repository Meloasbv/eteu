---
name: Bíblia local no banco
description: Tabela bible_verses com 31.067 versículos da ARC; edge function bible-verse e helper fetchBibleVerse priorizam o banco local antes de bible-api.com e verse-ai
type: feature
---
Bíblia Almeida Revista e Corrigida (ARC) armazenada localmente no Supabase para evitar dependência de APIs externas.

**Tabela `bible_verses`** (translation, book, chapter, verse, text). Índices em (translation, book, chapter, verse) e (book, chapter). RLS: leitura pública.

**Edge Function `bible-verse`** (`supabase/functions/bible-verse/index.ts`):
- Aceita `{ reference: "João 3:16" }` (com aliases pt-br: gn, sl, mt, 1co, miqéias…).
- Sanitiza `;` e pontuação, parseia "Livro Cap[:V[-V2]]".
- Retorna `{ found, reference, text, verses[] }`.

**Helper `src/lib/bibleVerseFetcher.ts`** — `fetchBibleVerse(ref)`:
1. Cache localStorage (`getCachedVerse`)
2. Banco local via Edge Function `bible-verse`
3. bible-api.com (almeida/arc) — fallback
4. Edge Function `verse-ai` — último recurso

**Aplicado em:** `bibleRefExtension.ts`, `VerseArtifact`, `ExegeseArtifact`, `ReadingArtifact`, `BibleContextPanel`, `VersePopover`. Outros arquivos (`BibleNotes`, `DevotionalTab`, `VerseReaderArtifact`) já usam `sanitizeBibleRef` para o `;` mas continuam batendo direto na bible-api — migrar quando precisar.

**Versículos faltantes conhecidos:** Salmo 10 não tem cabeçalho próprio no PDF (continua dentro do Salmo 9) — fallback para bible-api preenche.
