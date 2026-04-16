import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, BookOpen, Map } from "lucide-react";
import type { AnalysisResult, KeyConcept } from "./types";
import { getCategoryColor, getCategoryName } from "./types";

interface PresentationModeProps {
  analysis: AnalysisResult;
  onExit: () => void;
}

export default function PresentationMode({ analysis, onExit }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [showMiniMap, setShowMiniMap] = useState(false);

  const topics = useMemo(
    () => (analysis.key_concepts || []).filter(c => !c.type || c.type === "topic"),
    [analysis]
  );

  // Slide 0 = cover (root), slides 1..n = topics
  const totalSlides = topics.length + 1;

  const goNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setDirection("next");
      setCurrentSlide(s => s + 1);
    }
  }, [currentSlide, totalSlides]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection("prev");
      setCurrentSlide(s => s - 1);
    }
  }, [currentSlide]);

  // Keyboard + click navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "m" || e.key === "M") setShowMiniMap(s => !s);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onExit]);

  // Fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.exitFullscreen?.().catch(() => {}); };
  }, []);

  // Touch swipe
  const touchRef = { startX: 0 };
  const onTouchStart = (e: React.TouchEvent) => { touchRef.startX = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.startX;
    if (Math.abs(dx) > 60) { dx < 0 ? goNext() : goPrev(); }
  };

  // Click halves
  const handleClick = (e: React.MouseEvent) => {
    const x = e.clientX / window.innerWidth;
    if (x > 0.5) goNext(); else goPrev();
  };

  const renderCoverSlide = () => (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h1
        className="font-display font-bold text-center uppercase tracking-[2px] mb-6"
        style={{ color: "#ede4d3", fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.15 }}
      >
        {analysis.main_theme || analysis.hierarchy?.root?.label}
      </h1>
      <div className="w-[60px] h-[2px] mb-6" style={{ background: "#c4a46a" }} />
      {analysis.summary && (
        <p
          className="font-body text-center italic max-w-[600px]"
          style={{ color: "#c4b89e", fontSize: "clamp(16px, 2vw, 22px)", lineHeight: 1.6 }}
        >
          {analysis.summary}
        </p>
      )}
      <p className="mt-10 text-[12px] font-sans tracking-[3px] uppercase" style={{ color: "#5c5347" }}>
        {topics.length} tópicos
      </p>
    </div>
  );

  const renderTopicSlide = (concept: KeyConcept, index: number) => {
    const note = concept.expanded_note;
    const coreIdea = note?.core_idea || concept.coreIdea || "";
    const affirmations = note?.affirmations || concept.keyPoints || [];
    const verses = note?.verses || concept.bible_refs || [];
    const impactPhrase = note?.impact_phrase || concept.impactPhrase || "";
    const catColor = getCategoryColor(concept.category);

    return (
      <div className="flex flex-col justify-center h-full px-8 max-w-[720px] mx-auto">
        {/* Category badge */}
        <span
          className="text-[10px] font-sans font-bold tracking-[2px] uppercase mb-4 self-start"
          style={{ color: catColor }}
        >
          {getCategoryName(concept.category)}
        </span>

        <h2
          className="font-display font-bold mb-4"
          style={{ color: "#ede4d3", fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.15 }}
        >
          {concept.title}
        </h2>

        <div className="w-[60px] h-[2px] mb-6" style={{ background: catColor }} />

        {coreIdea && (
          <p
            className="font-body italic mb-8"
            style={{ color: "#d4b87a", fontSize: "clamp(16px, 2vw, 24px)", lineHeight: 1.5 }}
          >
            "{coreIdea}"
          </p>
        )}

        {affirmations.length > 0 && (
          <ul className="space-y-3 mb-8">
            {affirmations.slice(0, 5).map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: catColor }} />
                <span className="font-body" style={{ color: "#c4b89e", fontSize: "clamp(14px, 1.5vw, 20px)", lineHeight: 1.6 }}>
                  {a}
                </span>
              </li>
            ))}
          </ul>
        )}

        {verses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {verses.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(123,163,201,0.08)", border: "1px solid rgba(123,163,201,0.25)" }}
              >
                <BookOpen size={12} style={{ color: "#7ba3c9" }} />
                <span className="font-body italic text-[13px]" style={{ color: "#7ba3c9" }}>{v}</span>
              </span>
            ))}
          </div>
        )}

        {impactPhrase && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(196,164,106,0.1)" }}>
            <p className="font-body font-semibold text-center italic" style={{ color: "#d4b87a", fontSize: "clamp(14px, 1.5vw, 18px)" }}>
              "{impactPhrase}"
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col select-none cursor-none"
      style={{ background: "#0f0d0a" }}
      onClick={handleClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide content with transition */}
      <div className="flex-1 relative overflow-hidden">
        <div
          key={currentSlide}
          className="absolute inset-0"
          style={{
            animation: `presentation-${direction === "next" ? "enter" : "enter-prev"} 0.4s cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          {currentSlide === 0
            ? renderCoverSlide()
            : renderTopicSlide(topics[currentSlide - 1], currentSlide - 1)}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: "rgba(15,13,10,0.8)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="p-2 rounded-lg transition-opacity disabled:opacity-10"
          style={{ color: "#c4a46a" }}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMiniMap(s => !s)}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: showMiniMap ? "#c4a46a" : "#5c5347" }}
          >
            <Map size={16} />
          </button>
          <span className="text-[14px] font-sans" style={{ color: "#5c5347" }}>
            {currentSlide + 1} / {totalSlides}
          </span>
          <button
            onClick={onExit}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "#8a7d6a" }}
          >
            <X size={16} />
          </button>
        </div>

        <button
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          className="p-2 rounded-lg transition-opacity disabled:opacity-10"
          style={{ color: "#c4a46a" }}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Mini-map overlay */}
      {showMiniMap && (
        <div
          className="absolute bottom-16 right-4 rounded-xl overflow-hidden"
          style={{
            background: "rgba(30,26,20,0.95)",
            border: "1px solid rgba(196,164,106,0.15)",
            width: 200, padding: 12,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[9px] font-sans uppercase tracking-[1.5px] mb-2" style={{ color: "#5c5347" }}>
            Tópicos
          </p>
          <div className="space-y-1">
            {topics.map((t, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i + 1 > currentSlide ? "next" : "prev"); setCurrentSlide(i + 1); }}
                className="w-full text-left px-2 py-1 rounded text-[10px] font-sans truncate transition-colors"
                style={{
                  color: currentSlide === i + 1 ? "#c4a46a" : "#8a7d6a",
                  background: currentSlide === i + 1 ? "rgba(196,164,106,0.1)" : "transparent",
                }}
              >
                {i + 1}. {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
