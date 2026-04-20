import { jsPDF } from "jspdf";
import type { AnalysisResult } from "@/components/mindmap/types";

const MARGIN = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function exportStudyGuidePDF(result: AnalysisResult) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const newPageIfNeeded = (h: number) => {
    if (y + h > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const writeWrapped = (
    text: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; gap?: number } = {},
  ) => {
    const { size = 11, style = "normal", color = [40, 40, 40], gap = 1.5 } = opts;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    const lineHeight = size * 0.45;
    for (const line of lines) {
      newPageIfNeeded(lineHeight + gap);
      doc.text(line, MARGIN, y);
      y += lineHeight + gap;
    }
  };

  // Cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 30, 30);
  doc.text(result.main_theme, MARGIN, y + 6);
  y += 14;
  if (result.summary) {
    writeWrapped(result.summary, { size: 11, style: "italic", color: [110, 110, 110], gap: 1.2 });
  }
  y += 4;
  doc.setDrawColor(196, 164, 106);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  // Table of contents
  writeWrapped("SUMÁRIO", { size: 9, style: "bold", color: [196, 164, 106], gap: 2 });
  result.key_concepts.forEach((c, i) => {
    const num = String(i + 1).padStart(2, "0");
    writeWrapped(`${num}. ${c.title}`, { size: 10.5, style: "normal", gap: 1 });
  });
  y += 4;

  // Sections
  result.key_concepts.forEach((c, i) => {
    const note = c.expanded_note;
    newPageIfNeeded(20);
    y += 4;
    writeWrapped(`${String(i + 1).padStart(2, "0")} · ${c.title.toUpperCase()}`, {
      size: 13,
      style: "bold",
      color: [30, 30, 30],
      gap: 2,
    });

    if (note?.core_idea) {
      writeWrapped(note.core_idea, { size: 11, style: "italic", color: [80, 80, 80], gap: 1.4 });
      y += 1;
    }

    if (note?.key_dates && note.key_dates.length > 0) {
      writeWrapped("CRONOLOGIA", { size: 8, style: "bold", color: [196, 164, 106], gap: 1.2 });
      note.key_dates.forEach(d => {
        writeWrapped(`• ${d.date} — ${d.event}`, { size: 10, gap: 0.8 });
      });
      y += 1;
    }

    if (note?.key_points && note.key_points.length > 0) {
      note.key_points.forEach(p => {
        writeWrapped(`• ${p}`, { size: 10.5, gap: 1 });
      });
      y += 1;
    }

    if (note?.subsections && note.subsections.length > 0) {
      note.subsections.forEach(s => {
        writeWrapped(s.subtitle, { size: 10.5, style: "bold", color: [60, 60, 60], gap: 1.2 });
        s.points.forEach(p => writeWrapped(`  · ${p}`, { size: 10, gap: 0.8 }));
        y += 0.5;
      });
    }

    if (note?.key_people && note.key_people.length > 0) {
      writeWrapped("PERSONAGENS", { size: 8, style: "bold", color: [196, 164, 106], gap: 1.2 });
      note.key_people.forEach(p => {
        writeWrapped(`${p.name} — ${p.role}`, { size: 10.5, style: "bold", gap: 1 });
        (p.points || []).forEach(pt => writeWrapped(`  · ${pt}`, { size: 10, gap: 0.8 }));
        y += 0.5;
      });
    }

    if (note?.stories && note.stories.length > 0) {
      note.stories.forEach(st => {
        writeWrapped(st.title, { size: 10.5, style: "bold", color: [60, 60, 60], gap: 1.2 });
        writeWrapped(st.narrative, { size: 10, gap: 1 });
        y += 1;
      });
    }

    if (note?.author_quotes && note.author_quotes.length > 0) {
      note.author_quotes.forEach(q => {
        writeWrapped(`"${q.text}"`, { size: 10, style: "italic", color: [90, 90, 90], gap: 1 });
        if (q.author) writeWrapped(`— ${q.author}`, { size: 9, color: [140, 140, 140], gap: 1.2 });
      });
    }

    if (note?.verses && note.verses.length > 0) {
      const refs = note.verses
        .map(v => (typeof v === "string" ? v : v.ref))
        .filter(Boolean)
        .join(" · ");
      if (refs) writeWrapped(`Versículos: ${refs}`, { size: 9.5, style: "italic", color: [120, 120, 120], gap: 1.2 });
    }

    if (note?.application) {
      writeWrapped("APLICAÇÃO", { size: 8, style: "bold", color: [196, 164, 106], gap: 1.2 });
      writeWrapped(note.application, { size: 10.5, gap: 1 });
    }

    if (note?.impact_phrase) {
      writeWrapped(`"${note.impact_phrase}"`, { size: 10.5, style: "italic", color: [196, 164, 106], gap: 1.5 });
    }

    y += 3;
  });

  // Quiz
  if (result.quiz_questions && result.quiz_questions.length > 0) {
    doc.addPage();
    y = MARGIN;
    writeWrapped("FIXANDO O CONTEÚDO", { size: 13, style: "bold", color: [30, 30, 30], gap: 3 });
    result.quiz_questions.forEach((q, i) => {
      writeWrapped(`${i + 1}. ${q.question}`, { size: 10.5, style: "bold", gap: 1.2 });
      q.options.forEach((opt, oi) =>
        writeWrapped(`   ${String.fromCharCode(65 + oi)}) ${opt}`, { size: 10, gap: 0.8 }),
      );
      y += 1;
    });

    doc.addPage();
    y = MARGIN;
    writeWrapped("GABARITO", { size: 12, style: "bold", color: [30, 30, 30], gap: 2 });
    result.quiz_questions.forEach((q, i) => {
      const ans =
        q.answer_index !== null && q.answer_index !== undefined
          ? `${String.fromCharCode(65 + q.answer_index)}) ${q.options[q.answer_index] || ""}`
          : "—";
      writeWrapped(`${i + 1}. ${ans}`, { size: 10, gap: 0.8 });
    });
  }

  const safeName = (result.main_theme || "estudo").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  doc.save(`${safeName}_estudo.pdf`);
}
