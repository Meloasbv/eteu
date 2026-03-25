// Bible reference detection utilities

// All 66 books with Portuguese abbreviations
const BIBLE_BOOKS: { abbrevs: string[]; full: string }[] = [
  { abbrevs: ["gn", "gên", "gen", "gênesis"], full: "Gênesis" },
  { abbrevs: ["ex", "êx", "êxodo", "exodo"], full: "Êxodo" },
  { abbrevs: ["lv", "lev", "levítico", "levitico"], full: "Levítico" },
  { abbrevs: ["nm", "num", "números", "numeros"], full: "Números" },
  { abbrevs: ["dt", "deut", "deuteronômio", "deuteronomio"], full: "Deuteronômio" },
  { abbrevs: ["js", "jos", "josué", "josue"], full: "Josué" },
  { abbrevs: ["jz", "juí", "juízes", "juizes"], full: "Juízes" },
  { abbrevs: ["rt", "rut", "rute"], full: "Rute" },
  { abbrevs: ["1sm", "1 sm", "1 samuel", "i samuel", "i sm"], full: "1 Samuel" },
  { abbrevs: ["2sm", "2 sm", "2 samuel", "ii samuel", "ii sm"], full: "2 Samuel" },
  { abbrevs: ["1rs", "1 rs", "1 reis", "i reis", "i rs"], full: "1 Reis" },
  { abbrevs: ["2rs", "2 rs", "2 reis", "ii reis", "ii rs"], full: "2 Reis" },
  { abbrevs: ["1cr", "1 cr", "1 crônicas", "1 cronicas", "i crônicas", "i cr"], full: "1 Crônicas" },
  { abbrevs: ["2cr", "2 cr", "2 crônicas", "2 cronicas", "ii crônicas", "ii cr"], full: "2 Crônicas" },
  { abbrevs: ["ed", "esd", "esdras"], full: "Esdras" },
  { abbrevs: ["ne", "nee", "neemias"], full: "Neemias" },
  { abbrevs: ["et", "est", "ester"], full: "Ester" },
  { abbrevs: ["jó", "jo_book", "job"], full: "Jó" },
  { abbrevs: ["sl", "sal", "salmos", "salmo"], full: "Salmos" },
  { abbrevs: ["pv", "prov", "provérbios", "proverbios"], full: "Provérbios" },
  { abbrevs: ["ec", "ecl", "eclesiastes"], full: "Eclesiastes" },
  { abbrevs: ["ct", "cant", "cânticos", "canticos", "cantares"], full: "Cânticos" },
  { abbrevs: ["is", "isa", "isaías", "isaias"], full: "Isaías" },
  { abbrevs: ["jr", "jer", "jeremias"], full: "Jeremias" },
  { abbrevs: ["lm", "lam", "lamentações", "lamentacoes"], full: "Lamentações" },
  { abbrevs: ["ez", "eze", "ezequiel"], full: "Ezequiel" },
  { abbrevs: ["dn", "dan", "daniel"], full: "Daniel" },
  { abbrevs: ["os", "ose", "oséias", "oseias"], full: "Oséias" },
  { abbrevs: ["jl", "joel"], full: "Joel" },
  { abbrevs: ["am", "amós", "amos"], full: "Amós" },
  { abbrevs: ["ob", "oba", "obadias"], full: "Obadias" },
  { abbrevs: ["jn", "jon", "jonas"], full: "Jonas" },
  { abbrevs: ["mq", "miq", "miquéias", "miqueias"], full: "Miquéias" },
  { abbrevs: ["na", "naum"], full: "Naum" },
  { abbrevs: ["hc", "hab", "habacuque"], full: "Habacuque" },
  { abbrevs: ["sf", "sof", "sofonias"], full: "Sofonias" },
  { abbrevs: ["ag", "age", "ageu"], full: "Ageu" },
  { abbrevs: ["zc", "zac", "zacarias"], full: "Zacarias" },
  { abbrevs: ["ml", "mal", "malaquias"], full: "Malaquias" },
  { abbrevs: ["mt", "mat", "mateus"], full: "Mateus" },
  { abbrevs: ["mc", "mar", "marcos"], full: "Marcos" },
  { abbrevs: ["lc", "luc", "lucas"], full: "Lucas" },
  { abbrevs: ["jo", "joão", "joao"], full: "João" },
  { abbrevs: ["at", "ato", "atos"], full: "Atos" },
  { abbrevs: ["rm", "rom", "romanos"], full: "Romanos" },
  { abbrevs: ["1co", "1 co", "1 coríntios", "1 corintios", "i coríntios", "i co"], full: "1 Coríntios" },
  { abbrevs: ["2co", "2 co", "2 coríntios", "2 corintios", "ii coríntios", "ii co"], full: "2 Coríntios" },
  { abbrevs: ["gl", "gál", "gal", "gálatas", "galatas"], full: "Gálatas" },
  { abbrevs: ["ef", "efé", "efe", "efésios", "efesios"], full: "Efésios" },
  { abbrevs: ["fp", "fil", "filipenses"], full: "Filipenses" },
  { abbrevs: ["cl", "col", "colossenses"], full: "Colossenses" },
  { abbrevs: ["1ts", "1 ts", "1 tessalonicenses", "i tessalonicenses", "i ts"], full: "1 Tessalonicenses" },
  { abbrevs: ["2ts", "2 ts", "2 tessalonicenses", "ii tessalonicenses", "ii ts"], full: "2 Tessalonicenses" },
  { abbrevs: ["1tm", "1 tm", "1 timóteo", "1 timoteo", "i timóteo", "i tm"], full: "1 Timóteo" },
  { abbrevs: ["2tm", "2 tm", "2 timóteo", "2 timoteo", "ii timóteo", "ii tm"], full: "2 Timóteo" },
  { abbrevs: ["tt", "tit", "tito"], full: "Tito" },
  { abbrevs: ["fm", "flm", "filemom", "filemon"], full: "Filemom" },
  { abbrevs: ["hb", "heb", "hebreus"], full: "Hebreus" },
  { abbrevs: ["tg", "tia", "tiago"], full: "Tiago" },
  { abbrevs: ["1pe", "1 pe", "1 pedro", "i pedro", "i pe"], full: "1 Pedro" },
  { abbrevs: ["2pe", "2 pe", "2 pedro", "ii pedro", "ii pe"], full: "2 Pedro" },
  { abbrevs: ["1jo", "1 jo", "1 joão", "1 joao", "i joão", "i jo"], full: "1 João" },
  { abbrevs: ["2jo", "2 jo", "2 joão", "2 joao", "ii joão", "ii jo"], full: "2 João" },
  { abbrevs: ["3jo", "3 jo", "3 joão", "3 joao", "iii joão", "iii jo"], full: "3 João" },
  { abbrevs: ["jd", "jud", "judas"], full: "Judas" },
  { abbrevs: ["ap", "apo", "apocalipse"], full: "Apocalipse" },
];

// Build all book name patterns (longest first to avoid partial matches)
function buildAllBookNames(): string[] {
  const names: string[] = [];
  for (const book of BIBLE_BOOKS) {
    names.push(book.full.toLowerCase());
    for (const abbr of book.abbrevs) {
      names.push(abbr.toLowerCase());
    }
  }
  // Sort longest first
  names.sort((a, b) => b.length - a.length);
  return names;
}

const ALL_BOOK_NAMES = buildAllBookNames();

// Build regex pattern for Bible references
function buildBibleRefRegex(): RegExp {
  // Escape special regex chars in book names
  const escaped = ALL_BOOK_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const bookPattern = escaped.join("|");
  // Match: [book name] [chapter]:[verse(s)] with optional range
  // Examples: "Gn 1:1", "Gênesis 1:1", "2 Co 11:30", "João 3:16-18", "Sl 23:1-6"
  return new RegExp(
    `(?:^|(?<=\\s|\\(|\\[|"|"|«))` +
    `((?:${bookPattern})\\.?)` +                   // book name (group 1)
    `\\s*` +
    `(\\d{1,3})` +                                  // chapter (group 2)
    `(?:[:\\.]\\s*(\\d{1,3}))?` +                   // :verse (group 3, optional)
    `(?:\\s*[-–]\\s*(\\d{1,3}))?` +                 // -endVerse (group 4, optional)
    `(?=[\\s,;.)\\]""|»]|$)`,
    "gi"
  );
}

export const BIBLE_REF_REGEX = buildBibleRefRegex();

export interface BibleRef {
  fullMatch: string;
  book: string;
  chapter: string;
  verse?: string;
  endVerse?: string;
  normalized: string; // e.g. "João 3:16"
}

function findBookFull(bookStr: string): string {
  const clean = bookStr.replace(/\.$/, "").trim().toLowerCase();
  for (const book of BIBLE_BOOKS) {
    if (book.full.toLowerCase() === clean) return book.full;
    if (book.abbrevs.includes(clean)) return book.full;
  }
  return bookStr;
}

export function detectBibleReferences(text: string): BibleRef[] {
  const refs: BibleRef[] = [];
  const regex = buildBibleRefRegex(); // fresh regex each call
  let match;

  while ((match = regex.exec(text)) !== null) {
    const book = findBookFull(match[1]);
    const chapter = match[2];
    const verse = match[3];
    const endVerse = match[4];

    let normalized = `${book} ${chapter}`;
    if (verse) {
      normalized += `:${verse}`;
      if (endVerse) normalized += `-${endVerse}`;
    }

    refs.push({
      fullMatch: match[0],
      book,
      chapter,
      verse,
      endVerse,
      normalized,
    });
  }

  return refs;
}

// Verse cache in localStorage
const VERSE_CACHE_KEY = "bible-verse-cache";
const VERSE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedVerse {
  text: string;
  timestamp: number;
}

export function getCachedVerse(ref: string): string | null {
  try {
    const cache = JSON.parse(localStorage.getItem(VERSE_CACHE_KEY) || "{}");
    const entry: CachedVerse | undefined = cache[ref];
    if (entry && Date.now() - entry.timestamp < VERSE_CACHE_TTL) {
      return entry.text;
    }
  } catch {}
  return null;
}

export function setCachedVerse(ref: string, text: string) {
  try {
    const cache = JSON.parse(localStorage.getItem(VERSE_CACHE_KEY) || "{}");
    cache[ref] = { text, timestamp: Date.now() } as CachedVerse;
    // Limit cache size
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
      for (let i = 0; i < 100; i++) delete cache[sorted[i]];
    }
    localStorage.setItem(VERSE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}
