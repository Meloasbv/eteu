import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { detectBibleReferences, getCachedVerse, setCachedVerse } from "@/lib/bibleRefDetection";

const ABBREV_MAP: Record<string, string> = {
  "gênesis": "Genesis", "êxodo": "Exodus", "levítico": "Leviticus", "números": "Numbers",
  "deuteronômio": "Deuteronomy", "josué": "Joshua", "juízes": "Judges", "rute": "Ruth",
  "1 samuel": "1 Samuel", "2 samuel": "2 Samuel", "1 reis": "1 Kings", "2 reis": "2 Kings",
  "1 crônicas": "1 Chronicles", "2 crônicas": "2 Chronicles", "esdras": "Ezra", "neemias": "Nehemiah",
  "ester": "Esther", "jó": "Job", "salmos": "Psalms", "provérbios": "Proverbs",
  "eclesiastes": "Ecclesiastes", "cânticos": "Song of Solomon", "isaías": "Isaiah",
  "jeremias": "Jeremiah", "lamentações": "Lamentations", "ezequiel": "Ezekiel", "daniel": "Daniel",
  "oséias": "Hosea", "joel": "Joel", "amós": "Amos", "obadias": "Obadiah", "jonas": "Jonah",
  "miquéias": "Micah", "naum": "Nahum", "habacuque": "Habakkuk", "sofonias": "Zephaniah",
  "ageu": "Haggai", "zacarias": "Zechariah", "malaquias": "Malachi", "mateus": "Matthew",
  "marcos": "Mark", "lucas": "Luke", "joão": "John", "atos": "Acts", "romanos": "Romans",
  "1 coríntios": "1 Corinthians", "2 coríntios": "2 Corinthians", "gálatas": "Galatians",
  "efésios": "Ephesians", "filipenses": "Philippians", "colossenses": "Colossians",
  "1 tessalonicenses": "1 Thessalonians", "2 tessalonicenses": "2 Thessalonians",
  "1 timóteo": "1 Timothy", "2 timóteo": "2 Timothy", "tito": "Titus", "filemom": "Philemon",
  "hebreus": "Hebrews", "tiago": "James", "1 pedro": "1 Peter", "2 pedro": "2 Peter",
  "1 joão": "1 John", "2 joão": "2 John", "3 joão": "3 John", "judas": "Jude",
  "apocalipse": "Revelation",
};

function toApiRef(normalized: string): string {
  // "João 3:16" -> "John 3:16"
  const match = normalized.match(/^(.+?)\s+(\d.*)$/);
  if (!match) return normalized;
  const bookPt = match[1].toLowerCase();
  const rest = match[2];
  const bookEn = ABBREV_MAP[bookPt];
  return bookEn ? `${bookEn} ${rest}` : normalized;
}

// In-flight fetch tracker to avoid duplicate requests
const pendingFetches = new Map<string, Promise<string | null>>();

async function fetchVerseText(normalized: string): Promise<string | null> {
  const cached = getCachedVerse(normalized);
  if (cached) return cached;

  if (pendingFetches.has(normalized)) {
    return pendingFetches.get(normalized)!;
  }

  const apiRef = toApiRef(normalized);
  const promise = (async () => {
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(apiRef)}?translation=almeida`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.text) {
        const text = data.text.trim();
        setCachedVerse(normalized, text);
        return text;
      }
    } catch {}
    return null;
  })();

  pendingFetches.set(normalized, promise);
  promise.finally(() => pendingFetches.delete(normalized));
  return promise;
}

// Tooltip element management
let tooltipEl: HTMLDivElement | null = null;
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

function getTooltip(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "bible-ref-tooltip";
    tooltipEl.style.cssText = `
      position: fixed; z-index: 9999; max-width: 320px; padding: 10px 14px;
      background: hsl(var(--card)); border: 1px solid hsl(var(--border));
      border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      font-family: Georgia, 'Crimson Text', serif; font-size: 14px; line-height: 1.6;
      color: hsl(var(--foreground)); pointer-events: none; opacity: 0;
      transition: opacity 200ms ease, transform 200ms ease;
      transform: translateY(4px);
    `;
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTooltip(el: HTMLElement, text: string, ref: string) {
  if (tooltipTimeout) clearTimeout(tooltipTimeout);
  const tip = getTooltip();
  tip.innerHTML = `
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:hsl(var(--primary));margin-bottom:6px;font-family:var(--font-display,Cinzel,serif);">${ref}</div>
    <div style="font-style:italic;color:hsl(var(--foreground));opacity:0.9;">${text}</div>
  `;
  const rect = el.getBoundingClientRect();
  tip.style.left = `${Math.min(rect.left, window.innerWidth - 340)}px`;
  tip.style.top = `${rect.bottom + 8}px`;
  tip.style.opacity = "1";
  tip.style.transform = "translateY(0)";
}

function hideTooltip() {
  tooltipTimeout = setTimeout(() => {
    const tip = getTooltip();
    tip.style.opacity = "0";
    tip.style.transform = "translateY(4px)";
  }, 100);
}

const pluginKey = new PluginKey("bibleRefHighlight");

export const BibleRefHighlight = Extension.create({
  name: "bibleRefHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init(_, state) {
            return buildDecorations(state.doc);
          },
          apply(tr, oldDecos) {
            if (tr.docChanged) {
              return buildDecorations(tr.doc);
            }
            return oldDecos;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function buildDecorations(doc: any): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    const text = node.text || "";
    const refs = detectBibleReferences(text);

    for (const ref of refs) {
      // Find the position of this match in the text
      const idx = text.indexOf(ref.fullMatch);
      if (idx === -1) continue;

      const from = pos + idx;
      const to = from + ref.fullMatch.length;

      decorations.push(
        Decoration.inline(from, to, {
          class: "bible-ref-detected",
          "data-bible-ref": ref.normalized,
          nodeName: "span",
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

// Setup hover listeners on the editor container
export function setupBibleRefListeners(container: HTMLElement) {
  const handleMouseEnter = async (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.classList?.contains("bible-ref-detected")) return;
    const ref = target.dataset.bibleRef;
    if (!ref) return;

    // Show loading state
    showTooltip(target, "Carregando...", ref);

    const text = await fetchVerseText(ref);
    if (text) {
      showTooltip(target, text, ref);
    } else {
      showTooltip(target, "Versículo não encontrado", ref);
    }
  };

  const handleMouseLeave = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.classList?.contains("bible-ref-detected")) return;
    hideTooltip();
  };

  container.addEventListener("mouseover", handleMouseEnter);
  container.addEventListener("mouseout", handleMouseLeave);

  return () => {
    container.removeEventListener("mouseover", handleMouseEnter);
    container.removeEventListener("mouseout", handleMouseLeave);
  };
}
