// Pre-processes raw PDF text into mechanical title-based groups.
// NO AI. Pure text manipulation. Goal: feed each group separately to the LLM
// so long PDFs don't get truncated.

export interface ExtractedSlide {
  page: number;
  title: string;
  body: string;
  hasQuote: boolean;
  detectedVerses: string[];
  rawText: string;
}

export interface SlideGroup {
  id: string;
  title: string;
  slides: ExtractedSlide[];
  pageRange: [number, number];
  totalChars: number;
  isQuiz: boolean;
}

const VERSE_REGEX =
  /\b(?:G[êe]n(?:esis)?|Êx(?:odo)?|Lev[íi]tico|N[úu]m(?:eros)?|Deut(?:eron[ôo]mio)?|Jos(?:u[ée])?|Ju[íi]zes|Rute|1 ?Sam|2 ?Sam|1 ?Reis|2 ?Reis|1 ?Cr[ôo]n|2 ?Cr[ôo]n|Esdras|Neem(?:ias)?|Ester|J[óo]|Sl|Salmos?|Pv|Prov(?:[ée]rbios)?|Ec(?:l)?(?:esiastes)?|Cantares|Is(?:a[íi]as)?|Jer(?:emias)?|Lam|Ez(?:equiel)?|Dn|Daniel|Os[ée]ias|Joel|Am[óo]s|Obad|Jonas|Miq[ué]ias|Naum|Hab(?:acuque)?|Sof(?:onias)?|Ageu|Zac(?:arias)?|Ml|Malaquias|Mt|Mat(?:eus)?|Mc|Marcos|Lc|Lucas|Jo|Jo[ãa]o|At(?:os)?|Rm|Rom(?:anos)?|1 ?Co?r?(?:[íi]ntios)?|2 ?Co?r?(?:[íi]ntios)?|G[áa]l(?:atas)?|Ef[ée]sios|Fp|Fil(?:ipenses)?|Cl|Col(?:ossenses)?|1 ?Tes(?:salonicenses)?|2 ?Tes(?:salonicenses)?|1 ?Tim(?:[óo]teo)?|2 ?Tim(?:[óo]teo)?|Tito|Filemon|Hb|Hebreus|Tg|Tiago|1 ?Pe(?:dro)?|2 ?Pe(?:dro)?|1 ?Jo(?:[ãa]o)?|2 ?Jo(?:[ãa]o)?|3 ?Jo(?:[ãa]o)?|Judas|Ap(?:ocalipse)?)\.?\s*\d+(?::\d+(?:[-,]\d+)*)?/gi;

const QUIZ_KEYWORDS = ["quiz", "fixando", "fixar", "perguntas", "revisão", "revisao", "teste", "questões", "questoes"];

function isLikelyTitle(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 90) return false;
  if (trimmed.length < 3) return false;
  // ends with sentence-ending punctuation? probably body
  if (/[.!?;,:]$/.test(trimmed)) return false;
  // mostly digits / page numbers?
  if (/^\d+\s*$/.test(trimmed)) return false;
  // looks like a verse ref alone?
  if (/^[A-Z][a-zêçãõáéíóú]{1,3}\s*\d+(:\d+)?$/.test(trimmed)) return false;
  // mostly uppercase OR title-case OR short caption-like
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 14) return false;
  const upperRatio = (trimmed.match(/[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ]/g) || []).length / trimmed.length;
  // strong title: lots of caps OR Title Case OR all caps
  if (trimmed === trimmed.toUpperCase() && /[A-ZÀ-Ý]/.test(trimmed)) return true;
  if (upperRatio > 0.3 && wordCount <= 10) return true;
  // Title Case heuristic: most words start with uppercase
  const titleWords = trimmed.split(/\s+/).filter(w => /^[A-ZÀ-Ý]/.test(w));
  if (titleWords.length / wordCount >= 0.6 && wordCount <= 10) return true;
  return false;
}

function extractTitle(rawText: string, page: number): { title: string; body: string } {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { title: `Slide ${page}`, body: "" };

  // First non-trivial line that looks like a title
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    if (isLikelyTitle(lines[i])) {
      const body = lines.slice(i + 1).join(" ").trim();
      return { title: lines[i].replace(/[•·●▪◆■□▶►–—-]+\s*/, "").trim(), body };
    }
  }

  // Fallback: take first 5-8 words as the title
  const firstLine = lines[0];
  const words = firstLine.split(/\s+/);
  const title = words.slice(0, Math.min(7, words.length)).join(" ");
  const body = lines.join(" ").trim();
  return { title, body };
}

function detectVerses(text: string): string[] {
  const matches = text.match(VERSE_REGEX) || [];
  // dedupe + clean
  const set = new Set<string>();
  matches.forEach(m => {
    const cleaned = m.replace(/\s+/g, " ").trim();
    if (cleaned.length >= 3) set.add(cleaned);
  });
  return Array.from(set).slice(0, 8);
}

function isQuizSlide(slide: ExtractedSlide): boolean {
  const lower = (slide.title + " " + slide.body.slice(0, 200)).toLowerCase();
  return QUIZ_KEYWORDS.some(k => lower.includes(k));
}

// Normalize titles for comparison: lowercase, remove punctuation/diacritics, collapse spaces
function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Two titles are "same group" if normalized strings match OR one starts with the other (with substantial overlap)
function sameGroup(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // continuation slide ("(cont.)") — check if shorter is a prefix of longer
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (shorter.length >= 6 && longer.startsWith(shorter)) return true;
  // first 4 significant words match
  const wa = na.split(" ").filter(w => w.length > 2).slice(0, 4).join(" ");
  const wb = nb.split(" ").filter(w => w.length > 2).slice(0, 4).join(" ");
  return wa.length >= 8 && wa === wb;
}

const MAX_GROUP_CHARS = 6500;

export function preprocessPDF(
  pagesText: { page: number; text: string }[],
): { slides: ExtractedSlide[]; groups: SlideGroup[] } {
  // 1. extract per-slide
  const slides: ExtractedSlide[] = pagesText
    .filter(p => (p.text || "").trim().length > 8)
    .map(p => {
      const { title, body } = extractTitle(p.text, p.page);
      const detectedVerses = detectVerses(p.text);
      const hasQuote = /^["“]/.test(p.text.trim());
      return {
        page: p.page,
        title,
        body,
        hasQuote,
        detectedVerses,
        rawText: p.text,
      };
    });

  // 2. group consecutive slides with same/continuation titles
  const groups: SlideGroup[] = [];
  let current: SlideGroup | null = null;
  let groupIdx = 0;

  for (const slide of slides) {
    const quiz = isQuizSlide(slide);

    // Force new group if quiz boundary changes
    const shouldStart =
      !current ||
      quiz !== current.isQuiz ||
      !sameGroup(slide.title, current.title) ||
      current.totalChars + slide.rawText.length > MAX_GROUP_CHARS;

    if (shouldStart) {
      groupIdx++;
      current = {
        id: quiz ? "quiz" : `g${groupIdx}`,
        title: slide.title || `Bloco ${groupIdx}`,
        slides: [],
        pageRange: [slide.page, slide.page],
        totalChars: 0,
        isQuiz: quiz,
      };
      groups.push(current);
    }

    current!.slides.push(slide);
    current!.pageRange[1] = slide.page;
    current!.totalChars += slide.rawText.length;
  }

  // 3. merge tiny consecutive groups (< 250 chars) into the previous one when titles are unrelated
  //    only if combined size still fits
  const merged: SlideGroup[] = [];
  for (const g of groups) {
    const last = merged[merged.length - 1];
    if (
      last &&
      !g.isQuiz &&
      !last.isQuiz &&
      g.totalChars < 250 &&
      last.totalChars + g.totalChars < MAX_GROUP_CHARS
    ) {
      last.slides.push(...g.slides);
      last.pageRange[1] = g.pageRange[1];
      last.totalChars += g.totalChars;
    } else {
      merged.push(g);
    }
  }

  return { slides, groups: merged };
}

// Build the corpus string passed to the LLM for one group
export function groupCorpus(group: SlideGroup): string {
  return group.slides
    .map(s => `[[SLIDE ${s.page}]]\n${s.rawText.trim()}`)
    .join("\n\n")
    .slice(0, 14000);
}
