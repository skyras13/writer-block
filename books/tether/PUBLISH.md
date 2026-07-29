# PUBLISH — Tether

Exactly what to upload to KDP, and what to fix first.

**Built:** 2026-07-24 · **Interior:** 222 pages · **Trim:** 6 × 9 · **Set in:** EB Garamond (OFL)

---

## ✅ Done since the last build

- **Interior font swapped to EB Garamond** (SIL Open Font License, `fsType 0` — Installable
  Embedding, no restriction). Static cuts from the upstream project, not the variable build Google
  Fonts ships — pdfkit embeds a variable font's default instance only, so a `[wght]` file would
  have rendered bold at weight 400. Files and `OFL.txt` are in `export/fonts/`; the licence has to
  travel with the font, so it is committed alongside.
- **Author name set** to Skyler Rasmussen — title page, copyright page, imprint.
- **Type resized for Garamond.** Its x-height is smaller than Georgia's, so the sizes tuned for the
  old font read light on a 6 × 9 page. Body 10.5 → 11.5 pt, prompts 12.5 → 13.5 pt.
- **Fixed markdown emphasis printing its asterisks.** `*understood*` and seven other instances —
  including the journal names in the reference list — were reaching paper with literal `*`.
  The renderer now sets them as real italic runs.
- **Fixed the reference list running together** as one block with visible `- ` separators.
- **Removed printed placeholders.** `[ISBN]` and `[AUTHOR CONTACT]` no longer appear on the page;
  both are now HTML comments, visible in the editor, invisible in print.

---

## 🚧 Two things left before you upload

Neither is a manuscript defect.

### 1. Add the ISBN
KDP assigns it at upload. Then paste it into the copyright page in
`manuscript/front-matter.md` (there is a comment marking the spot) and rebuild.
A free KDP ISBN is fine unless you plan to print elsewhere later.

### 2. Run the KDP pricing calculator
222 pages, 6 × 9, black & white, cream paper. KDP derives a minimum list price from page count;
$14.99 is a recommendation, not a verified-viable number.

**Also recommended, non-blocking:** confirm the gutter against KDP's current margin table (the
interior uses 0.85" inside / 0.6" outside, correct for the 151–300 page band), and the USPTO search
on "Tether" in class 16 from `market/originality.md` §e.

---

## 📕 Paperback — the main event

**Upload this file:**

```
books/tether/export/book-6x9.pdf
```

**KDP paperback settings**

| field | value |
|-------|-------|
| Trim size | **6 × 9 in** |
| Bleed | **No bleed** — all content sits inside the margins |
| Paper | **Cream** — warmer, standard for journals, easier on the eye when writing |
| Interior | **Black & white** |
| Page count | **222** (even, as KDP requires) |
| Cover finish | **Matte** |
| Language | English |
| Adult content | No |

**Title / subtitle / description / keywords / categories:** all in `export/metadata.md`.
`blurb.txt` and `keywords.txt` are paste-ready.

**Cover:** artwork is not built here, but the exact canvas is.

| file | what it is |
|------|-----------|
| `export/cover-spec.md` | **The numbers.** Full wrap **12.805" × 9.25" at 300 DPI** (3842 × 2775 px), spine **0.555"**, every zone coordinate, barcode keep-clear rectangle, checklist. Generated from KDP's published formula at 222 pages / cream. |
| `export/cover-brief.md` | **The direction.** One executable concept, typography, palette with hex values, back-cover layout, spine text, and a category-specific "do not" list. |
| `export/cover-spec.json` | Same numbers, machine-readable. |

Hand both to a designer, or execute the brief yourself in Canva — the spec is the document setup.

⚠️ **The spine is a function of the page count.** At 222 pages it's 0.555"; every ~10 pages moves it
about 0.025", which is enough to push spine type onto the front cover. If the interior changes,
regenerate:

```bash
node app/export/cover-spec.js --pages <new count> --trim 6x9 --paper cream --title "Tether" > books/tether/export/cover-spec.md
```

Also download **KDP's own cover template** for 6 × 9 / 222 pages / cream. It's free and arrives with
the zones drawn. Our numbers come from KDP's published formula, but their generator is what the
upload is validated against — if the two ever disagree, theirs wins.

---

## 📖 Ebook — recommended: **don't ship one**

No EPUB was built, and that's a decision, not an omission.

Tether is a fill-in journal. Its entire mechanic is physical: two facing pages, one question, each
partner holding a side, ruled space for handwriting. **Reflowable EPUB has no facing pages, no
fixed pagination, and no write-in space.** An ebook edition would be 90 questions in a list — which
is a worse version of the free prompt lists already all over the internet, sold under our name.

If you want a digital edition anyway, there are two honest options:

1. **Point people at the app.** tether.skdaddle.com already does the digital version of this
   mechanic properly — private writing, then a side-by-side reveal. That's the digital product.
2. **Ship a clearly-labeled companion**, subtitled something like *"a reading companion to the
   paperback"* — the essay, the instructions, and the 90 prompts to read, with the paperback named
   as the thing you actually write in. If you go this way:

   ```bash
   cd app && npm install
   brew install pandoc            # required
   # then use the Export panel, or:
   node app/export/build.js --book books/tether --format epub
   ```

   Upload `books/tether/export/book.epub`. **Set expectations in the description** so nobody buys
   it expecting a journal. A one-star review that says "there's nowhere to write" is a fair review
   of a product that shouldn't have shipped.

`export/book.docx` is likewise unbuilt. Build it (`--format docx`) only if you want an editable
manuscript for a human editor — it is not a useful KDP upload for this book.

---

## What was verified in this build

From `export/interior-report.json` and `qa/final-report.md`:

- ✅ **90/90 facing-page spreads correct** — One on verso, Two on recto. **0 parity errors.** This
  is the mechanic's single point of failure; it was checked page by page, not assumed.
- ✅ 222 pages, even total
- ✅ Mirrored margins confirmed on rendered pages — the gutter faces the spine on both sides
- ✅ Running heads: title on verso, week theme on recto; suppressed on openers and front matter
- ✅ 11 ruled lines per write-in page, 42pt apart
- ✅ All 13 week openers land on rectos; all 13 Weekly Tethers on their own page
- ✅ 90 prompts, 0 duplicates, 0 closed (yes/no) questions, 0 gendered pronouns
- ✅ 0 hits on the AI-tell ban list (one permitted quotation, logged in the QA report)
- ✅ Citation IDs stripped from the print PDF — verified by text extraction
- ✅ No dates anywhere in the interior
- ✅ Cover canvas computed from the interior's actual page count (222), not an estimate

**QA verdict: PASS**, no open manuscript items. The one finding that needed your ruling (prompts
85–89 sharing an opening word) was accepted and applied on 2026-07-24 — see `qa/final-report.md`
§B1.

---

## Rebuilding

```bash
# interior only (fast — this is the one you'll rerun)
node books/tether/export/build-interior.js --trim 6x9

# other trims
node books/tether/export/build-interior.js --trim 5.5x8.5

# everything, through the factory exporter
node app/export/build.js --book books/tether --format all --trim 6x9
```

Edits made in the control panel's manuscript editor flow straight into the next build — the
generator reads `manuscript/*.md`, not a snapshot.
