

# Corrigir extração de PDF + reforçar fidelidade do mapa

## Diagnóstico

Seu PDF "John Wesley" tem texto riquíssimo (vida, Aldersgate, Revolução Industrial, teologia arminiana, etc), mas o mapa gerou "FlateDecode / ColorSpace / DeviceGray / TimesNewRomanPSMT".

**Causa raiz:** o `extract-pdf` atual faz regex direto nos bytes do PDF. Quando o PDF está comprimido com `FlateDecode` (caso do seu), os streams de texto ficam ilegíveis e o fallback regex pega **metadados técnicos** (nomes de fontes, codecs) achando que é texto. A IA então "resumiu" fielmente esses metadados — exatamente o comportamento esperado dado o lixo que recebeu.

A IA está fazendo o trabalho dela. O problema é o input.

## Solução: trocar o extrator de PDF por um real

### 1. Reescrever `supabase/functions/extract-pdf/index.ts`

Trocar a regex bruta por **`unpdf`** (https://esm.sh/unpdf) — biblioteca Deno-nativa que descomprime FlateDecode, processa fontes e devolve texto real por página.

```ts
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const pdf = await getDocumentProxy(bytes);
const { totalPages, text } = await extractText(pdf, { mergePages: false });
// text é string[] — uma entrada por página
const pages = text.map((t, i) => ({ page: i+1, text: t.trim() }))
                  .filter(p => p.text.length > 5);
```

Saída idêntica à atual (`{ text, pages, pagesText }`) — `analyze-content` continua funcionando sem mudanças.

### 2. Validação anti-lixo no `analyze-content`

Adicionar guard antes de chamar a IA:

```ts
const looksLikeMetadata = /FlateDecode|ColorSpace|DeviceGray|MacRomanEncoding|StructTreeRoot|BaseFont|MediaBox/i;
const hits = (corpus.match(looksLikeMetadata) || []).length;
const ratio = hits / Math.max(corpus.split(/\s+/).length, 1);
if (ratio > 0.05) {
  return error("PDF não pôde ser lido — texto não extraído corretamente.");
}
```

Evita o caso de o extrator falhar silenciosamente e gerar mapa-lixo.

### 3. Reforçar prompt de fidelidade (pequeno ajuste)

No `EXPAND_PROMPT` atual, adicionar no topo:

> "Se o trecho contiver palavras como 'FlateDecode', 'ColorSpace', 'BaseFont', 'StructElem', 'MacRomanEncoding' — IGNORE COMPLETAMENTE. Isso é metadado de PDF, não conteúdo. Retorne erro."

Defesa em profundidade, caso o validador deixe passar.

### 4. Mensagem de erro clara para o usuário

No `MindMapInput.tsx` (frontend), tratar o novo erro do passo 2 com toast:

> "Não consegui ler este PDF (provavelmente escaneado ou protegido). Tente exportá-lo novamente como PDF de texto."

## Resultado esperado

Após fix, o mesmo PDF deve gerar nodes como:
- **Contexto e Família** → pontos: "Nasceu em 1703, Epworth", "15º de 19 filhos", "Susanna Wesley — maior influência espiritual"
- **Tição Tirado do Fogo** → "Resgate do incêndio aos 5 anos", "Mãe creu em missão especial"
- **Conversão em Aldersgate** → "24 maio 1738", "Prefácio de Lutero a Romanos", "Coração estranhamente aquecido"
- **Pregação ao Ar Livre** → "Influência de Whitefield", "O mundo é minha paróquia", "400 mil km a cavalo, 40 mil sermões"
- **Teologia Arminiana** → "Redenção universal", "Livre-arbítrio", "Perfeição cristã"

Fiel ao slide, sem invenção, sem metadado técnico.

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/extract-pdf/index.ts` | Reescrito usando `unpdf` |
| `supabase/functions/analyze-content/index.ts` | Validador anti-metadado + guard no prompt |
| `src/components/mindmap/MindMapInput.tsx` | Toast de erro amigável |

## Escopo NÃO incluído

- Redesign visual do NotePanel (já está bom)
- Sistema de 3 níveis (já implementado)
- Transformações (já funcionam)

Apenas corrigir a porta de entrada — texto real do PDF chegando até a IA.

