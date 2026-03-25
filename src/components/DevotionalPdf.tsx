import jsPDF from "jspdf";

interface DevotionalData {
  ref: string;
  verseText: string;
  summary: string;
  exegese?: string;
}

// Helper: wrap text properly with word separation
function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  // Fix common word-joining issues
  const cleaned = text
    .replace(/\.([A-ZÀ-Ú])/g, ". $1")
    .replace(/,([A-Za-zÀ-ú])/g, ", $1")
    .replace(/;([A-Za-zÀ-ú])/g, "; $1");
  return doc.splitTextToSize(cleaned, maxWidth);
}

export function generateDevotionalPdf(devotional: DevotionalData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 20; // ~2cm margins
  const contentW = pageW - margin * 2;

  // ─── PAGE 1: COVER ───────────────────────────────────────────────
  // Dark gradient background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, pageH, "F");

  // Subtle accent stripe
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, pageH * 0.35, pageW, 2, "F");
  doc.rect(0, pageH * 0.65, pageW, 1, "F");

  // Cross symbol
  doc.setTextColor(196, 164, 106); // gold
  doc.setFont("helvetica", "normal");
  doc.setFontSize(48);
  doc.text("✟", pageW / 2, 80, { align: "center" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text("DEVOCIONAIS", pageW / 2, 120, { align: "center" });

  // Decorative line
  doc.setDrawColor(196, 164, 106);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 30, 128, pageW / 2 + 30, 128);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(196, 164, 106);
  doc.text(`Reflexão: ${devotional.ref}`, pageW / 2, 142, { align: "center" });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Material de Estudo Bíblico", pageW / 2, pageH - 30, { align: "center" });

  // Small decorative line at bottom
  doc.setDrawColor(196, 164, 106);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2 - 20, pageH - 24, pageW / 2 + 20, pageH - 24);

  // ─── PAGE 2: CONTENT ─────────────────────────────────────────────
  doc.addPage();

  let y = margin;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(`REFLEXÃO: ${devotional.ref.toUpperCase()}`, margin, y + 6);
  y += 14;

  // Decorative line under title
  doc.setDrawColor(196, 164, 106);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 40, y);
  y += 12;

  // Summary paragraphs
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);

  const summaryParagraphs = devotional.summary.split(/\n+/).filter(p => p.trim());
  for (const para of summaryParagraphs) {
    const lines = wrapText(doc, para.trim(), contentW);
    for (const line of lines) {
      if (y > pageH - 40) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7; // generous line-height
    }
    y += 4; // paragraph spacing
  }

  // Exegesis content
  if (devotional.exegese) {
    y += 6;

    // Section header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("EXEGESE — PALAVRA POR PALAVRA", margin, y);
    y += 3;
    doc.setDrawColor(196, 164, 106);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 50, y);
    y += 8;

    // Parse and render exegesis
    const cleanExegese = devotional.exegese
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\.([A-ZÀ-Ú])/g, ". $1");

    // Split by sentence boundaries that start word entries
    const entries = cleanExegese.split(/(?="[A-ZÀ-Úa-zà-ú])/);
    
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);

    for (const entry of entries) {
      const trimmed = entry.trim();
      if (!trimmed) continue;

      const lines = wrapText(doc, trimmed, contentW);
      for (const line of lines) {
        if (y > pageH - 40) {
          doc.addPage();
          y = margin;
          // Page number
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text(String(doc.getNumberOfPages()), pageW / 2, pageH - 15, { align: "center" });
        }
        doc.text(line, margin, y);
        y += 6.5;
      }
      y += 3;
    }
  }

  // Verse box at the end
  y += 8;
  if (y > pageH - 60) {
    doc.addPage();
    y = margin;
  }

  // Verse decorative box
  const boxX = margin;
  const verseLines = wrapText(doc, `"${devotional.verseText}"`, contentW - 16);
  const refLine = `— ${devotional.ref}`;
  const boxH = verseLines.length * 6 + 20;

  doc.setFillColor(245, 240, 232); // warm cream
  doc.setDrawColor(196, 164, 106);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, y, contentW, boxH, 3, 3, "FD");

  // Gold left accent
  doc.setFillColor(196, 164, 106);
  doc.rect(boxX, y, 3, boxH, "F");

  y += 10;
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(80, 60, 40);

  for (const line of verseLines) {
    doc.text(line, boxX + 12, y);
    y += 6;
  }

  y += 2;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(140, 110, 60);
  doc.text(refLine, boxX + 12, y);

  // Page numbers on all content pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(String(i - 1), pageW / 2, pageH - 15, { align: "center" });
  }

  // Save
  const safeName = devotional.ref.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`devocional_${safeName}.pdf`);
}
