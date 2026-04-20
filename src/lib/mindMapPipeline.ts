import { supabase } from "@/integrations/supabase/client";
import type {
  AnalysisResult,
  KeyConcept,
  QuizQuestion,
  ExpandedNote,
} from "@/components/mindmap/types";
import {
  preprocessPDF,
  groupCorpus,
  type SlideGroup,
} from "@/lib/pdfPreprocess";

export interface PipelineStatus {
  groupId: string;
  title: string;
  pageRange: [number, number];
  state: "pending" | "running" | "done" | "error";
  isQuiz: boolean;
}

export interface PipelineProgress {
  totalGroups: number;
  doneGroups: number;
  statuses: PipelineStatus[];
  pages: number;
}

interface GroupResultOk {
  isQuiz: boolean;
  title: string;
  summary?: string;
  category?: string;
  importance?: "primary" | "secondary" | "tertiary";
  pageRange: [number, number];
  core_idea?: string;
  key_points?: string[];
  subsections?: any[];
  verses?: any[];
  quotes?: any[];
  stories?: any[];
  key_dates?: any[];
  key_people?: any[];
  key_terms?: any[];
  analogy?: string;
  application?: string;
  impact_phrase?: string;
  highlights?: string[];
  questions?: QuizQuestion[];
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callAnalyzeGroup(
  group: SlideGroup,
  groupIndex: number,
  totalGroups: number,
): Promise<GroupResultOk> {
  const corpus = groupCorpus(group);
  const res = await fetch(`${FUNCTIONS_URL}/analyze-slide-group`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      title: group.title,
      corpus,
      pageRange: group.pageRange,
      totalGroups,
      groupIndex,
      isQuiz: group.isQuiz,
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`);
  return data.result as GroupResultOk;
}

function fallbackResult(group: SlideGroup): GroupResultOk {
  // Use raw slide text so user still sees something even if AI failed
  const bullets = group.slides
    .flatMap(s =>
      (s.body || s.rawText)
        .split(/[•\n]|(?:\.\s+)/)
        .map(t => t.trim())
        .filter(t => t.length > 8 && t.length < 200),
    )
    .slice(0, 12);
  return {
    isQuiz: group.isQuiz,
    title: group.title,
    summary: "",
    category: "contexto",
    pageRange: group.pageRange,
    core_idea: "",
    key_points: bullets,
    subsections: [],
    verses: [],
    quotes: [],
    stories: [],
    key_dates: [],
    key_people: [],
    application: "",
    impact_phrase: "",
    highlights: [],
    questions: [],
  };
}

function toKeyConcept(r: GroupResultOk, idx: number): KeyConcept {
  const expanded: ExpandedNote = {
    core_idea: r.core_idea || "",
    explanation: "",
    affirmations: [],
    verses: r.verses || [],
    application: r.application || "",
    impact_phrase: r.impact_phrase || "",
    key_points: r.key_points || [],
    subsections: r.subsections || [],
    author_quotes: (r.quotes || []).map((q: any) => ({
      text: q.text || "",
      author: q.author || "",
      source_slide: q.source_slide,
    })),
    stories: r.stories || [],
    key_dates: r.key_dates || [],
    key_people: r.key_people || [],
    key_terms: Array.isArray(r.key_terms) ? r.key_terms : [],
    analogy: typeof r.analogy === "string" ? r.analogy : "",
  };

  const safeStart = r.pageRange[0];
  const safeEnd = r.pageRange[1];
  const slidesArr = Array.from(
    { length: Math.max(1, safeEnd - safeStart + 1) },
    (_, i) => safeStart + i,
  );

  return {
    id: `concept_${idx + 1}`,
    type: "topic",
    title: r.title || `Bloco ${idx + 1}`,
    description: r.summary || r.core_idea || "",
    summary: r.summary || (r.core_idea || "").slice(0, 80),
    category: (r.category as any) || "contexto",
    icon_suggestion: "📖",
    is_key: false,
    importance: r.importance || "primary",
    page_ref: safeStart,
    source_slides: slidesArr,
    expanded_note: expanded,
    child_highlights: (r.highlights || []).slice(0, 3),
    child_verses: [],
  };
}

interface RunPipelineParams {
  pagesText: { page: number; text: string }[];
  pdfTitle?: string;
  onProgress?: (progress: PipelineProgress) => void;
  concurrency?: number;
}

export async function runMindMapPipeline({
  pagesText,
  pdfTitle,
  onProgress,
  concurrency = 4,
}: RunPipelineParams): Promise<AnalysisResult> {
  const { groups } = preprocessPDF(pagesText);

  if (groups.length === 0) {
    throw new Error("Não foi possível identificar seções neste PDF.");
  }

  const statuses: PipelineStatus[] = groups.map(g => ({
    groupId: g.id,
    title: g.title,
    pageRange: g.pageRange,
    state: "pending",
    isQuiz: g.isQuiz,
  }));

  const emit = () =>
    onProgress?.({
      totalGroups: groups.length,
      doneGroups: statuses.filter(s => s.state === "done" || s.state === "error").length,
      statuses: statuses.map(s => ({ ...s })),
      pages: pagesText.length,
    });

  emit();

  const results: GroupResultOk[] = new Array(groups.length);

  // Concurrency-limited parallel execution
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= groups.length) return;
      const g = groups[i];
      statuses[i].state = "running";
      emit();
      try {
        const r = await callAnalyzeGroup(g, i, groups.length);
        results[i] = r;
        statuses[i].state = "done";
      } catch (e) {
        console.warn(`[pipeline] group ${i} (${g.title}) failed:`, e);
        results[i] = fallbackResult(g);
        statuses[i].state = "error";
      }
      emit();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, groups.length) }, () => worker()));

  // Assemble final AnalysisResult
  const nonQuiz = results.filter(r => !r.isQuiz);
  const quizResults = results.filter(r => r.isQuiz);

  const concepts: KeyConcept[] = nonQuiz.map((r, i) => toKeyConcept(r, i));

  // Mark 3-4 most substantial as is_key
  const ranked = concepts
    .map((c, i) => ({
      i,
      score:
        (c.expanded_note?.key_points?.length || 0) * 2 +
        (c.expanded_note?.stories?.length || 0) * 3 +
        (c.expanded_note?.key_dates?.length || 0) +
        (c.expanded_note?.key_people?.length || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(4, Math.max(2, Math.floor(concepts.length / 3))));
  ranked.forEach(({ i }) => {
    if (concepts[i]) concepts[i].is_key = true;
  });

  // Build slide_summaries from groups (one per slide, not via AI)
  const slideSummaries = groups.flatMap((g, gi) =>
    g.slides.map(s => ({
      slide: s.page,
      title: g.title,
      summary: (s.body || s.rawText).slice(0, 160),
      topic_id: !g.isQuiz && concepts[gi - quizResults.filter((_, qi) => qi <= gi).length]?.id,
      category: !g.isQuiz ? (concepts[gi]?.category as string) : undefined,
    })),
  );

  // Cleaner topic_id linking
  const slideToConcept = new Map<number, { id: string; category: string }>();
  concepts.forEach(c => {
    (c.source_slides || []).forEach(p => {
      slideToConcept.set(p, { id: c.id, category: c.category as string });
    });
  });
  const linkedSlides = slideSummaries
    .sort((a, b) => a.slide - b.slide)
    .map(s => ({
      slide: s.slide,
      title: s.title,
      summary: s.summary,
      topic_id: slideToConcept.get(s.slide)?.id,
      category: slideToConcept.get(s.slide)?.category,
    }));

  const allQuestions: QuizQuestion[] = quizResults.flatMap(q => q.questions || []);

  // Smart title: derive from content rather than filename.
  // Priority: 1) first non-quiz group's title if it looks like a real title (not generic),
  //           2) first concept's core_idea condensed, 3) fallback to pdfTitle.
  const isGenericTitle = (t: string) => {
    if (!t) return true;
    const lower = t.toLowerCase().trim();
    return (
      lower.length < 4 ||
      /^(slide|p[áa]gina|bloco|introdu[çc][ãa]o|capa|sum[áa]rio|[ií]ndice)\s*\d*$/.test(lower) ||
      /^\d+$/.test(lower)
    );
  };
  const firstRealTitle = nonQuiz.find(r => !isGenericTitle(r.title))?.title;
  const coreIdeaShort = concepts[0]?.expanded_note?.core_idea
    ?.split(/[—.:;]/)[0]
    ?.trim()
    ?.split(/\s+/)
    ?.slice(0, 8)
    ?.join(" ");
  const smartTitle =
    firstRealTitle ||
    coreIdeaShort ||
    pdfTitle ||
    "Estudo";

  return {
    main_theme: smartTitle,
    summary:
      concepts[0]?.expanded_note?.core_idea ||
      concepts[0]?.summary ||
      "",
    key_concepts: concepts,
    hierarchy: {
      root: {
        label: smartTitle,
        children: concepts.map(c => ({ label: c.title })),
      },
    },
    keywords: [],
    structured_notes: [],
    slide_summaries: linkedSlides,
    pdf_meta: {
      total_slides: pagesText.length,
    },
    quiz_questions: allQuestions.length > 0 ? allQuestions : undefined,
  };
}
