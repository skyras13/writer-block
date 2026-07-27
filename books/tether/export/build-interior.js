/**
 * Tether — print interior generator (KDP paperback).
 *
 * Fixed-layout books can't go through markdown → PDF. This journal needs facing-page spreads with
 * a guaranteed parity (One always on the verso, Two always on the recto), ruled write-in areas,
 * mirrored margins with a real binding gutter, and running heads that change per week. None of
 * that is expressible in CSS that pandoc or calibre will honour, so the book ships its own
 * generator and app/export/build.js delegates to it. See CLAUDE.md §9.2.
 *
 * Reads the manuscript markdown, so edits made in the control panel flow straight into the PDF.
 *
 *   node books/tether/export/build-interior.js [--trim 6x9] [--out path.pdf]
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// pdfkit is a ROOT dependency — book-local generators resolve up the tree from
// books/<slug>/export/. Installing only in app/ leaves this broken, which is the
// trap a fresh clone falls into, so fail with an instruction rather than a stack trace.
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch {
  console.error(
    '\n  This interior generator needs pdfkit, which installs at the REPO ROOT\n' +
    '  (not in app/ — book-local generators resolve modules up the tree).\n\n' +
    '  Run:  npm run setup      # from the repo root\n' +
    '  Then: npm run doctor     # to confirm\n',
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOK_DIR = path.resolve(__dirname, '..');

/* ---------------------------------------------------------------------------
 * Page geometry
 *
 * Mirrored margins: the INSIDE edge (toward the spine) gets the gutter. On a
 * recto (odd, right-hand) page the spine is on the left; on a verso it's on the
 * right. Getting this backwards puts text into the glue.
 * ------------------------------------------------------------------------- */

const PT = 72;

const TRIM_SPECS = {
  '5x8':     { w: 5,   h: 8,   inside: 0.75, outside: 0.5,  top: 0.6, bottom: 0.6 },
  '5.5x8.5': { w: 5.5, h: 8.5, inside: 0.8,  outside: 0.55, top: 0.6, bottom: 0.6 },
  '6x9':     { w: 6,   h: 9,   inside: 0.85, outside: 0.6,  top: 0.7, bottom: 0.7 },
};

// Wide rules on purpose. ~11 lines per side is enough for three minutes of honest writing and
// few enough that a half-filled page doesn't feel like a failure. Tight ruling reads as homework.
const RULE_GAP = 42;
const RULE_COLOR = '#c9c2b6';
const INK = '#1a1a1a';
const SOFT = '#6b6b6b';
const FAINT = '#9a9186';

/* ---------------------------------------------------------------------------
 * Fonts
 *
 * KDP requires every font to be embedded, so we never fall back to PDF's
 * built-in base-14 (those are referenced, not embedded).
 *
 * Resolution order:
 *   1. books/<slug>/export/fonts/  — drop licensed .ttf files here for production
 *   2. macOS system serifs         — fine for proofing
 *
 * LICENSING: system fonts such as Georgia are generally NOT licensed for
 * embedding in commercially distributed print. For the production interior, put
 * an OFL font (EB Garamond, Crimson Pro, Libre Baskerville) in export/fonts/ and
 * rerun. The build reports which set it used, and PUBLISH.md repeats the warning.
 * ------------------------------------------------------------------------- */

const FONT_CANDIDATES = {
  regular: [
    'fonts/EBGaramond-Regular.ttf', 'fonts/CrimsonPro-Regular.ttf',
    'fonts/LibreBaskerville-Regular.ttf', 'fonts/regular.ttf',
    '/System/Library/Fonts/Supplemental/Georgia.ttf',
    '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
  ],
  italic: [
    'fonts/EBGaramond-Italic.ttf', 'fonts/CrimsonPro-Italic.ttf',
    'fonts/LibreBaskerville-Italic.ttf', 'fonts/italic.ttf',
    '/System/Library/Fonts/Supplemental/Georgia Italic.ttf',
    '/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf',
  ],
  bold: [
    'fonts/EBGaramond-Bold.ttf', 'fonts/CrimsonPro-Bold.ttf',
    'fonts/LibreBaskerville-Bold.ttf', 'fonts/bold.ttf',
    '/System/Library/Fonts/Supplemental/Georgia Bold.ttf',
    '/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf',
  ],
};

function resolveFonts(bookDir) {
  const chosen = {};
  const warnings = [];
  for (const [style, candidates] of Object.entries(FONT_CANDIDATES)) {
    const hit = candidates
      .map((c) => (path.isAbsolute(c) ? c : path.join(bookDir, 'export', c)))
      .find((p) => fsSync.existsSync(p));
    if (!hit) throw new Error(`No ${style} font found. Put a .ttf at export/fonts/${style}.ttf`);
    chosen[style] = hit;
    if (hit.startsWith('/System/')) {
      warnings.push(`Using a system font for ${style} (${path.basename(hit)}). Fine for proofing; NOT licensed for commercial embedding. Put an OFL font in export/fonts/ before publishing.`);
    }
  }
  return { fonts: chosen, warnings };
}

/* ---------------------------------------------------------------------------
 * Manuscript parsing
 * ------------------------------------------------------------------------- */

const stripFm = (s) => s.replace(/^---\n[\s\S]*?\n---\n/, '');

/** Split front/back matter into <!-- PAGE: id --> sections. */
function parsePages(md) {
  const out = [];
  const parts = stripFm(md).split(/<!--\s*PAGE:\s*([\w-]+)\s*-->/);
  for (let i = 1; i < parts.length; i += 2) {
    const body = (parts[i + 1] || '').trim();
    const heading = body.match(/^#\s+(.+)$/m);
    out.push({
      id: parts[i].trim(),
      heading: heading ? heading[1].trim() : '',
      body: body.replace(/^#\s+.+$/m, '').trim(),
    });
  }
  return out;
}

function parseWeek(md) {
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  const field = (name) => {
    const m = (fm?.[1] || '').match(new RegExp(`^${name}:\\s*"?(.*?)"?\\s*$`, 'm'));
    return m ? m[1] : '';
  };
  const body = stripFm(md);

  const prompts = [...body.matchAll(/^(\d+)\.\s+(.+)$/gm)]
    .map((m) => ({ n: Number(m[1]), text: m[2].trim() }));

  const tether = body.split(/\*\*The Weekly Tether\*\*/)[1];

  return {
    week: Number(field('week')),
    theme: field('theme'),
    epigraph: field('epigraph'),
    prompts,
    tether: (tether || '').trim().replace(/\n+/g, ' '),
  };
}

/** Markdown → plain paragraphs. Inline citation IDs are working-copy apparatus, not reader text. */
function toParagraphs(md) {
  return md
    // Swallow the leading space too, or "…later [C-001]." leaves "…later ." on the page.
    .replace(/[ \t]*\[C-[\w-]+\]/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);
}

/* ---------------------------------------------------------------------------
 * Renderer
 * ------------------------------------------------------------------------- */

class Interior {
  constructor(doc, spec, fonts, title) {
    this.doc = doc;
    this.spec = spec;
    this.fonts = fonts;
    this.title = title;
    this.pageNo = 0;          // 1-based; odd = recto (right-hand), even = verso
    this.runningHead = '';
    this.suppressFolio = false;
    this.spreadLog = [];
  }

  /* --- geometry --- */

  get W() { return this.spec.w * PT; }
  get H() { return this.spec.h * PT; }
  get isRecto() { return this.pageNo % 2 === 1; }

  /** Left/right margins swap by page side so the gutter always faces the spine. */
  get left() { return (this.isRecto ? this.spec.inside : this.spec.outside) * PT; }
  get right() { return (this.isRecto ? this.spec.outside : this.spec.inside) * PT; }
  get top() { return this.spec.top * PT; }
  get bottom() { return this.spec.bottom * PT; }
  get colWidth() { return this.W - this.left - this.right; }
  get textBottom() { return this.H - this.bottom; }

  /* --- pages --- */

  newPage({ head = this.runningHead, folio = true } = {}) {
    // autoFirstPage is off, so every page — including the first — is created here.
    this.doc.addPage({ size: [this.W, this.H], margin: 0 });
    this.pageNo += 1;
    this.runningHead = head;
    this.suppressFolio = !folio;
    if (folio) this.drawRunningHeadAndFolio();
    this.doc.y = this.top;
    return this.pageNo;
  }

  /** Add a blank until the next page would be a recto. Books open chapters on the right. */
  padToRecto() {
    while ((this.pageNo + 1) % 2 === 0) this.newPage({ head: '', folio: false });
  }

  drawRunningHeadAndFolio() {
    const { doc } = this;
    const y = this.top - 26;

    doc.font(this.fonts.regular).fontSize(7.5).fillColor(FAINT);
    // Verso carries the book title, recto carries the current week's theme.
    const head = this.isRecto ? this.runningHead : this.title;
    if (head) {
      doc.text(head.toUpperCase(), this.left, y, {
        width: this.colWidth,
        align: this.isRecto ? 'right' : 'left',
        characterSpacing: 1.4,
        lineBreak: false,
      });
    }

    doc.fontSize(8.5).fillColor(SOFT).text(String(this.pageNo), this.left, this.H - this.bottom + 16, {
      width: this.colWidth,
      align: this.isRecto ? 'right' : 'left',
      lineBreak: false,
    });
    doc.fillColor(INK);
  }

  /* --- type --- */

  heading(text, { size = 19, gapAfter = 16, align = 'left', font = 'regular' } = {}) {
    this.doc.font(this.fonts[font]).fontSize(size).fillColor(INK)
      .text(text, this.left, this.doc.y, { width: this.colWidth, align, lineGap: 2 });
    this.doc.y += gapAfter;
  }

  para(text, { size = 10.5, italic = false, align = 'left', gapAfter = 9, color = INK, indent = 0 } = {}) {
    this.doc.font(this.fonts[italic ? 'italic' : 'regular']).fontSize(size).fillColor(color)
      .text(text, this.left + indent, this.doc.y, {
        width: this.colWidth - indent, align, lineGap: 2.6, paragraphGap: 0,
      });
    this.doc.y += gapAfter;
  }

  smallCaps(text, { size = 7.5, align = 'left', color = FAINT, gapAfter = 8 } = {}) {
    this.doc.font(this.fonts.regular).fontSize(size).fillColor(color)
      .text(text.toUpperCase(), this.left, this.doc.y, {
        width: this.colWidth, align, characterSpacing: 1.6,
      });
    this.doc.y += gapAfter;
  }

  /** Draw a single write-in rule at y. */
  rule(y) {
    this.doc.save()
      .moveTo(this.left, y).lineTo(this.W - this.right, y)
      .lineWidth(0.5).strokeColor(RULE_COLOR).stroke()
      .restore();
  }

  /** Ruled write-in area filling from the current y down to the bottom margin. */
  rules({ from = this.doc.y, gap = RULE_GAP } = {}) {
    let y = from + gap;
    let count = 0;
    while (y <= this.textBottom) {
      this.rule(y);
      y += gap;
      count += 1;
    }
    this.doc.y = y;
    return count;
  }

  /** Exactly `n` rules — for fill-in fields, where filling the page would be wrong. */
  ruleLines(n, { gap = 24, from = this.doc.y } = {}) {
    let y = from + gap;
    for (let i = 0; i < n && y <= this.textBottom; i++) {
      this.rule(y);
      y += gap;
    }
    this.doc.y = y - gap + 6;
    return this.doc.y;
  }

  /**
   * A drawn hairline, not a glyph. Ornamental characters like ◆ are missing from most text
   * serifs and print as tofu — vector geometry is font-independent and always renders.
   */
  ornament({ width = 34 } = {}) {
    const y = this.doc.y + 6;
    const cx = this.left + this.colWidth / 2;
    this.doc.save()
      .moveTo(cx - width / 2, y).lineTo(cx + width / 2, y)
      .lineWidth(0.6).strokeColor(RULE_COLOR).stroke()
      .restore();
    this.doc.y = y + 16;
    this.doc.fillColor(INK);
  }
}

/* ---------------------------------------------------------------------------
 * Build
 * ------------------------------------------------------------------------- */

export async function buildInterior({ bookDir = BOOK_DIR, outDir, trim = '6x9' } = {}) {
  const spec = TRIM_SPECS[trim] || TRIM_SPECS['6x9'];
  outDir = outDir || path.join(bookDir, 'export');
  await fs.mkdir(outDir, { recursive: true });

  const { fonts, warnings } = resolveFonts(bookDir);

  const msDir = path.join(bookDir, 'manuscript');
  const front = parsePages(await fs.readFile(path.join(msDir, 'front-matter.md'), 'utf8'));
  const back = parsePages(await fs.readFile(path.join(msDir, 'back-matter.md'), 'utf8'));

  const weekFiles = (await fs.readdir(msDir)).filter((f) => /^week-\d+\.md$/.test(f)).sort();
  const weeks = [];
  for (const f of weekFiles) weeks.push(parseWeek(await fs.readFile(path.join(msDir, f), 'utf8')));

  let meta = {};
  try { meta = JSON.parse(await fs.readFile(path.join(bookDir, 'meta.json'), 'utf8')); } catch { /* defaults */ }
  const title = meta.title || 'Tether';

  const outFile = path.join(outDir, `book-${trim}.pdf`);
  const doc = new PDFDocument({
    size: [spec.w * PT, spec.h * PT],
    margin: 0,
    autoFirstPage: false,
    bufferPages: true,
    info: {
      Title: title,
      Author: meta.author || meta.kdp?.author || '',
      Subject: meta.subtitle || '',
      Creator: 'Book Factory interior generator',
    },
  });

  const stream = fsSync.createWriteStream(outFile);
  doc.pipe(stream);

  const I = new Interior(doc, spec, fonts, title);
  const page = (id) => front.find((p) => p.id === id) || back.find((p) => p.id === id) || { body: '' };

  /* ---- Front matter ---------------------------------------------------- */

  // Title page (p1, recto, no folio)
  I.newPage({ folio: false });
  doc.y = I.H * 0.3;
  I.heading(title, { size: 40, align: 'center', gapAfter: 18 });
  I.para(meta.subtitle || 'A Couples Gratitude Journal for Noticing Why',
    { size: 12, italic: true, align: 'center', gapAfter: 8 });
  I.smallCaps('90 days · write apart, reveal together', { size: 8, align: 'center', gapAfter: 0 });
  doc.y = I.H - I.bottom - 40;
  I.para(meta.author || meta.kdp?.author || '[AUTHOR NAME]',
    { size: 11, align: 'center', gapAfter: 0, color: SOFT });

  // Copyright (p2, verso, no folio)
  I.newPage({ folio: false });
  doc.y = I.H * 0.45;
  for (const p of toParagraphs(page('copyright').body)) {
    I.para(p, { size: 8, gapAfter: 7, color: SOFT });
  }

  // Epigraph (p3, recto, no folio)
  I.newPage({ folio: false });
  doc.y = I.H * 0.33;
  I.para(page('epigraph').body.replace(/^\*|\*$/g, ''),
    { size: 12, italic: true, align: 'center', gapAfter: 0 });

  // "The Tether" essay — opens recto
  I.newPage({ folio: false });   // p4 blank verso
  I.newPage({ head: '', folio: true });
  I.heading('The Tether', { size: 22, gapAfter: 20 });
  for (const p of toParagraphs(page('essay').body)) {
    if (doc.y > I.textBottom - 50) { I.newPage({ head: '' }); }
    I.para(p, { size: 10.5, gapAfter: 10 });
  }

  // How to Use — opens recto
  I.padToRecto();
  I.newPage({ head: '' });
  I.heading('How to Use This Journal', { size: 22, gapAfter: 20 });
  for (const p of toParagraphs(page('howto').body)) {
    if (doc.y > I.textBottom - 50) I.newPage({ head: '' });
    I.para(p.replace(/\*\*/g, ''), { size: 10.5, gapAfter: 10 });
  }

  // Before You Begin — opens recto, with write-in lines
  I.padToRecto();
  I.newPage({ head: '' });
  I.heading('Before You Begin', { size: 22, gapAfter: 30 });

  // Identity fields — one rule each. This is also the page a gift-giver writes on.
  for (const label of ['One is', 'Two is', 'We started']) {
    I.smallCaps(label, { size: 8, gapAfter: 2 });
    I.ruleLines(1, { gap: 26 });
    doc.y += 22;
  }

  doc.y += 14;
  I.para('Write down one thing you each want out of the next ninety days. One sentence. Come back and read it on day ninety.',
    { size: 10, italic: true, gapAfter: 20, color: SOFT });

  for (const label of ['One', 'Two']) {
    I.smallCaps(label, { size: 8, gapAfter: 2 });
    I.ruleLines(2, { gap: 28 });
    doc.y += 26;
  }

  /* ---- Body: 13 weeks -------------------------------------------------- */

  const parityErrors = [];

  for (const wk of weeks) {
    // Week opener — always recto.
    I.padToRecto();
    I.newPage({ head: wk.theme, folio: false });
    doc.y = I.H * 0.34;
    I.smallCaps(`Week ${wk.week}`, { size: 8, align: 'center', gapAfter: 14 });
    I.heading(wk.theme, { size: 24, align: 'center', gapAfter: 18 });
    I.ornament();
    I.para(wk.epigraph, { size: 11, italic: true, align: 'center', gapAfter: 0, color: SOFT });

    // Daily spreads — One on verso, Two on recto.
    for (const prompt of wk.prompts) {
      for (const side of ['One', 'Two']) {
        const n = I.newPage({ head: wk.theme });

        if (side === 'One' && n % 2 !== 0) parityErrors.push(`Prompt ${prompt.n}: "One" landed on page ${n} (recto) — expected verso.`);
        if (side === 'Two' && n % 2 !== 1) parityErrors.push(`Prompt ${prompt.n}: "Two" landed on page ${n} (verso) — expected recto.`);

        doc.y = I.top;
        I.smallCaps(`${side}  ·  ${prompt.n}`, {
          size: 7.5, align: side === 'One' ? 'left' : 'right', gapAfter: 12,
        });
        I.para(prompt.text, { size: 12.5, gapAfter: 10 });
        const lines = I.rules({ from: doc.y + 4 });
        if (side === 'One') I.spreadLog.push({ prompt: prompt.n, versoPage: n, lines });
      }
    }

    // The Weekly Tether — verso, so the next week's opener falls naturally on a recto.
    I.newPage({ head: wk.theme });
    doc.y = I.top + 10;
    I.smallCaps('The Weekly Tether', { size: 8, gapAfter: 14 });
    I.para(wk.tether, { size: 12.5, gapAfter: 6 });
    I.para('Do this one together, out loud.', { size: 9, italic: true, gapAfter: 12, color: SOFT });
    I.rules({ from: doc.y });
  }

  /* ---- Back matter ----------------------------------------------------- */

  for (const id of ['keepnoticing', 'keepsake', 'imprint']) {
    const p = page(id);
    if (!p.body) continue;
    I.padToRecto();
    I.newPage({ head: p.heading, folio: id !== 'imprint' });
    if (id === 'imprint') doc.y = I.H * 0.3;
    I.heading(p.heading, { size: id === 'imprint' ? 14 : 22, gapAfter: 20 });
    for (const para of toParagraphs(p.body)) {
      if (doc.y > I.textBottom - 50) I.newPage({ head: p.heading, folio: id !== 'imprint' });
      I.para(para.replace(/\*\*/g, '').replace(/^-\s+/, ''), {
        size: id === 'imprint' ? 8 : 10.5,
        gapAfter: id === 'imprint' ? 7 : 10,
        color: id === 'imprint' ? SOFT : INK,
      });
    }
  }

  // KDP wants an even total page count.
  if (I.pageNo % 2 !== 0) I.newPage({ head: '', folio: false });

  doc.end();
  await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });

  const bytes = (await fs.stat(outFile)).size;

  const report = {
    file: `export/book-${trim}.pdf`,
    trim,
    pages: I.pageNo,
    spreads: I.spreadLog.length,
    prompts: weeks.reduce((n, w) => n + w.prompts.length, 0),
    weeks: weeks.length,
    linesPerPage: I.spreadLog[0]?.lines ?? null,
    bytes,
    fonts: Object.fromEntries(Object.entries(fonts).map(([k, v]) => [k, path.basename(v)])),
    parityErrors,
    warnings: [
      ...warnings,
      ...(parityErrors.length ? [`${parityErrors.length} facing-page parity errors — the spread mechanic is broken. Fix before printing.`] : []),
      `Gutter check: inside margin ${spec.inside}in / outside ${spec.outside}in. Confirm against KDP's current margin table for ${I.pageNo} pages before uploading.`,
    ],
  };

  await fs.writeFile(path.join(outDir, 'interior-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  return report;
}

export default buildInterior;

/* --- CLI ----------------------------------------------------------------- */

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const i = process.argv.indexOf('--trim');
  const report = await buildInterior({ trim: i > -1 ? process.argv[i + 1] : '6x9' });
  console.log(JSON.stringify(report, null, 2));
  if (report.parityErrors.length) process.exit(1);
}
