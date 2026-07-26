/**
 * Book Factory — KDP cover dimension calculator.
 *
 * A cover is mostly arithmetic, and getting it wrong costs a rejected upload or a reprint. This
 * computes the full-wrap canvas from the finished page count so nobody has to do it by hand or
 * trust a model to multiply.
 *
 * It produces a SPEC, not artwork. The output is what you hand a designer, or paste into Canva /
 * Affinity / Illustrator as the document setup.
 *
 * ── Source of the numbers ────────────────────────────────────────────────────
 * All constants below come from Amazon KDP's own paperback cover help page
 * (kdp.amazon.com/en_US/help/topic/G201953020, read 2026-07-24):
 *
 *   White paper          page count × 0.002252"
 *   Cream paper          page count × 0.0025"
 *   Premium Color        page count × 0.002347"
 *   Standard Color       page count × 0.002252"
 *   Bleed                0.125" on top, bottom, and outside edges
 *   Cover width          bleed + back + spine + front + bleed
 *   Cover height         bleed + trim height + bleed
 *   Spine text           requires a minimum of 79 pages
 *   Spine text clearance 0.0625" from each spine edge
 *   Front/back safe area 0.125" inside the trim lines
 *
 * ⚠️ Several popular third-party KDP calculators add **+0.06" to the spine** as a "cover
 * thickness allowance." That figure is NOT in KDP's formula. We do not add it. If you want it as
 * a safety margin, pass `coverAllowance` explicitly — it is reported as a separate line so it can
 * never be mistaken for Amazon's number.
 *
 * KDP's own template generator is authoritative and free. Always download it with the final page
 * count and check this spec against it before sending anything to a designer.
 */

const round = (n, dp = 4) => Number(n.toFixed(dp));
const mm = (inches) => round(inches * 25.4, 2);

/** Per-page caliper, in inches. From KDP's help page — see the header comment. */
export const PAPER_THICKNESS = {
  white: 0.002252,
  cream: 0.0025,
  'premium-color': 0.002347,
  'standard-color': 0.002252,
};

/** Trim sizes this factory supports for interiors. KDP offers more; these match print.css. */
export const TRIMS = {
  '5x8': { w: 5, h: 8 },
  '5.5x8.5': { w: 5.5, h: 8.5 },
  '6x9': { w: 6, h: 9 },
};

export const BLEED = 0.125;             // KDP: top, bottom, and outside edges
export const SAFE_MARGIN = 0.125;       // KDP: keep cover text this far inside the trim lines
export const SPINE_TEXT_CLEARANCE = 0.0625;  // KDP: spine text clearance from each spine edge
export const SPINE_TEXT_MIN_PAGES = 79; // KDP: below this, the spine must stay blank
export const REQUIRED_DPI = 300;

/** KDP prints a barcode on the back cover. Leave it a clear rectangle. */
export const BARCODE = { w: 2.0, h: 1.2, fromTrimEdge: 0.25 };

/**
 * Compute the full-wrap cover canvas.
 *
 * @param {object}  opts
 * @param {number}  opts.pages            finished interior page count (even)
 * @param {string}  opts.trim             key of TRIMS, or pass trimW/trimH directly
 * @param {string}  opts.paper            key of PAPER_THICKNESS
 * @param {number} [opts.coverAllowance]  optional extra spine padding, in inches. NOT a KDP
 *                                        number — opt in only if you want a safety margin, and it
 *                                        is reported separately so it stays visible.
 */
export function coverSpec({ pages, trim = '6x9', paper = 'white', trimW, trimH, coverAllowance = 0 }) {
  const warnings = [];
  const errors = [];

  if (!Number.isFinite(pages) || pages <= 0) errors.push('pages must be a positive number');
  if (pages % 2 !== 0) warnings.push(`Page count ${pages} is odd. KDP interiors must have an even page count — the spine math will shift when you fix it.`);

  const t = TRIMS[trim];
  const W = trimW ?? t?.w;
  const H = trimH ?? t?.h;
  if (!W || !H) errors.push(`Unknown trim "${trim}". Use one of ${Object.keys(TRIMS).join(', ')}, or pass trimW/trimH.`);

  const caliper = PAPER_THICKNESS[paper];
  if (!caliper) errors.push(`Unknown paper "${paper}". Use one of ${Object.keys(PAPER_THICKNESS).join(', ')}.`);

  if (errors.length) return { ok: false, errors, warnings };

  const spineKdp = pages * caliper;
  const spine = spineKdp + coverAllowance;

  if (coverAllowance > 0) {
    warnings.push(`coverAllowance of ${coverAllowance}" was ADDED to the spine. This is not part of KDP's formula — KDP's own number is ${round(spineKdp)}". Verify against KDP's template before using the padded value.`);
  }

  const canvasW = BLEED + W + spine + W + BLEED;
  const canvasH = BLEED + H + BLEED;

  const spineTextAllowed = pages >= SPINE_TEXT_MIN_PAGES;
  if (!spineTextAllowed) {
    warnings.push(`${pages} pages is under KDP's ${SPINE_TEXT_MIN_PAGES}-page minimum for spine text. The spine must stay blank — no title, no author, no rules.`);
  }

  const spineTextWidth = spine - 2 * SPINE_TEXT_CLEARANCE;
  if (spineTextAllowed && spineTextWidth < 0.1) {
    warnings.push(`Spine is ${round(spine, 3)}" — after ${SPINE_TEXT_CLEARANCE}" clearance each side there is only ${round(spineTextWidth, 3)}" of usable height for spine type. Set it small, or leave the spine blank.`);
  }

  // Positions measured from the left edge of the full canvas.
  const backCoverX = BLEED;
  const spineX = BLEED + W;
  const frontCoverX = BLEED + W + spine;

  return {
    ok: true,
    warnings,
    errors: [],
    input: { pages, trim, trimW: W, trimH: H, paper, caliper, coverAllowance },

    spine: {
      inches: round(spine),
      mm: mm(spine),
      kdpFormulaInches: round(spineKdp),
      formula: `${pages} pages × ${caliper}" (${paper}) = ${round(spineKdp)}"`,
      textAllowed: spineTextAllowed,
      textClearance: SPINE_TEXT_CLEARANCE,
      usableTextWidth: round(Math.max(0, spineTextWidth)),
    },

    canvas: {
      widthInches: round(canvasW),
      heightInches: round(canvasH),
      widthMm: mm(canvasW),
      heightMm: mm(canvasH),
      widthPx: Math.round(canvasW * REQUIRED_DPI),
      heightPx: Math.round(canvasH * REQUIRED_DPI),
      dpi: REQUIRED_DPI,
      formula: `${BLEED} + ${W} + ${round(spine)} + ${W} + ${BLEED} = ${round(canvasW)}" wide · ${BLEED} + ${H} + ${BLEED} = ${round(canvasH)}" tall`,
    },

    // Every x is from the canvas left edge; every y from the canvas top edge.
    zones: {
      backCover: { x: round(backCoverX), y: BLEED, w: W, h: H },
      spine: { x: round(spineX), y: BLEED, w: round(spine), h: H },
      frontCover: { x: round(frontCoverX), y: BLEED, w: W, h: H },
      backCoverSafe: {
        x: round(backCoverX + SAFE_MARGIN), y: round(BLEED + SAFE_MARGIN),
        w: round(W - 2 * SAFE_MARGIN), h: round(H - 2 * SAFE_MARGIN),
      },
      frontCoverSafe: {
        x: round(frontCoverX + SAFE_MARGIN), y: round(BLEED + SAFE_MARGIN),
        w: round(W - 2 * SAFE_MARGIN), h: round(H - 2 * SAFE_MARGIN),
      },
      spineTextSafe: {
        x: round(spineX + SPINE_TEXT_CLEARANCE), y: round(BLEED + SAFE_MARGIN),
        w: round(Math.max(0, spineTextWidth)), h: round(H - 2 * SAFE_MARGIN),
      },
      // KDP overprints the barcode here. Keep it clear — ideally plain white.
      barcodeKeepClear: {
        x: round(backCoverX + W - BARCODE.fromTrimEdge - BARCODE.w),
        y: round(BLEED + H - BARCODE.fromTrimEdge - BARCODE.h),
        w: BARCODE.w, h: BARCODE.h,
      },
    },

    checklist: [
      `Canvas exactly ${round(canvasW)}" × ${round(canvasH)}" at ${REQUIRED_DPI} DPI (${Math.round(canvasW * REQUIRED_DPI)} × ${Math.round(canvasH * REQUIRED_DPI)} px).`,
      'Single PDF, one page, full wrap — back cover on the left, spine centre, front cover on the right.',
      `Background art runs to the canvas edge; nothing important within ${BLEED}" of it.`,
      `Keep all text ${SAFE_MARGIN}" inside the trim lines on front and back.`,
      spineTextAllowed
        ? `Spine text stays within ${round(Math.max(0, spineTextWidth))}" — ${SPINE_TEXT_CLEARANCE}" clear of each spine edge.`
        : `NO spine text — ${pages} pages is under KDP's ${SPINE_TEXT_MIN_PAGES}-page minimum.`,
      `Leave the barcode rectangle clear: ${BARCODE.w}" × ${BARCODE.h}", bottom-right of the back cover, ${BARCODE.fromTrimEdge}" in from the trim edges.`,
      'Embed every font, or outline the type.',
      'CMYK or greyscale; flatten transparency.',
      'Title and author on the cover must match the KDP metadata exactly, or the upload is rejected.',
      'Re-run this after ANY interior change — one added page moves the spine and shifts both covers.',
      "Download KDP's own template with the final page count and check this against it. Theirs is authoritative.",
    ],
  };
}

/** Human-readable markdown spec — this is what gets written into books/<slug>/export/. */
export function formatSpec(spec, { title = '', subtitle = '', author = '', slug = '' } = {}) {
  if (!spec.ok) return `# Cover spec — FAILED\n\n${spec.errors.map((e) => `- ${e}`).join('\n')}\n`;

  const { input, spine, canvas, zones } = spec;
  const z = (label, r) => `| ${label} | ${r.x}" | ${r.y}" | ${r.w}" | ${r.h}" |`;

  return `# Cover Spec — ${title || slug}

> **Dimensions only. This is not artwork.** Hand it to a designer, or use it as the document setup
> in Canva / Affinity / Illustrator.
>
> Numbers computed by \`app/export/cover-spec.js\` from KDP's published formula
> (kdp.amazon.com/en_US/help/topic/G201953020). **Re-run after any interior change** — one added
> page moves the spine and shifts both covers.

- **Book:** ${title}${subtitle ? ` — ${subtitle}` : ''}
- **Author:** ${author || '[AUTHOR NAME]'}
- **Interior:** ${input.pages} pages · ${input.trimW} × ${input.trimH} in · ${input.paper} paper

---

## The canvas

| | inches | mm | px @ ${canvas.dpi} DPI |
|---|---|---|---|
| **Full cover width** | **${canvas.widthInches}"** | ${canvas.widthMm} mm | ${canvas.widthPx} px |
| **Full cover height** | **${canvas.heightInches}"** | ${canvas.heightMm} mm | ${canvas.heightPx} px |
| Spine | ${spine.inches}" | ${spine.mm} mm | ${Math.round(spine.inches * canvas.dpi)} px |

\`\`\`
${canvas.formula}
\`\`\`

**Spine:** \`${spine.formula}\`
${input.coverAllowance ? `\n> ⚠️ A non-KDP cover allowance of ${input.coverAllowance}" was added. KDP's own figure is ${spine.kdpFormulaInches}".\n` : ''}
---

## Zones

All coordinates measured from the **top-left corner of the full canvas**, in inches.

| zone | x | y | width | height |
|------|---|---|-------|--------|
${z('Back cover (trim)', zones.backCover)}
${z('Back cover — safe area', zones.backCoverSafe)}
${z('Spine (trim)', zones.spine)}
${z('Spine — text safe', zones.spineTextSafe)}
${z('Front cover (trim)', zones.frontCover)}
${z('Front cover — safe area', zones.frontCoverSafe)}
${z('Barcode — KEEP CLEAR', zones.barcodeKeepClear)}

\`\`\`
├─${BLEED}"─┬──────── ${input.trimW}" ────────┬─${spine.inches}"─┬──────── ${input.trimW}" ────────┬─${BLEED}"─┤
  bleed         BACK COVER          SPINE        FRONT COVER        bleed
\`\`\`

**Spine text:** ${spine.textAllowed
    ? `allowed (${input.pages} ≥ ${SPINE_TEXT_MIN_PAGES} pages). Usable width **${spine.usableTextWidth}"** after ${spine.textClearance}" clearance each side.`
    : `**NOT ALLOWED** — ${input.pages} pages is under KDP's ${SPINE_TEXT_MIN_PAGES}-page minimum. The spine must be blank.`}

---

## Checklist

${spec.checklist.map((c) => `- [ ] ${c}`).join('\n')}

${spec.warnings.length ? `---\n\n## ⚠️ Warnings\n\n${spec.warnings.map((w) => `- ${w}`).join('\n')}\n` : ''}
---

## Before you send this to a designer

1. **Download KDP's own cover template** for ${input.trimW} × ${input.trimH}, ${input.pages} pages,
   ${input.paper} paper. It is free, it is authoritative, and it arrives as a PNG/PDF with the
   zones already drawn. Check every number above against it.
2. **Lock the interior first.** These numbers are a function of the page count. Re-run this after
   any manuscript change.
3. **Confirm the paper type matches** what you select at upload. Cream and white have different
   calipers, and picking the other one at checkout invalidates the spine.
`;
}

/* --- CLI ----------------------------------------------------------------- */

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n, d = null) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
  };

  const spec = coverSpec({
    pages: Number(arg('pages', 0)),
    trim: arg('trim', '6x9'),
    paper: arg('paper', 'white'),
    coverAllowance: Number(arg('allowance', 0)),
  });

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(spec, null, 2));
  } else {
    console.log(formatSpec(spec, { title: arg('title', ''), subtitle: arg('subtitle', ''), author: arg('author', '') }));
  }
  process.exit(spec.ok ? 0 : 1);
}
