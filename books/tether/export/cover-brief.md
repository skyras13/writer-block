# Cover Brief — Tether

> Design direction. Dimensions live in `cover-spec.md` — **canvas 12.805" × 9.25" at 300 DPI,
> spine 0.555"** (222 pages, cream). Regenerate both if the interior page count changes.
>
> No artwork is produced by this factory. This is what you hand a designer, or execute yourself.

---

## 1. The one-line job

On a search results page full of hearts and scripts, look like the one a grown-up would buy — then
give one reason to click: **you write apart, not together.**

## 2. The thumbnail test

**At 100px wide, "Tether" must be readable and the cover must not read as generic.** That's the
pass/fail. Most buyers never see it larger. Design at thumbnail size first and scale up; if you
design at full size and shrink, you'll lose it.

Second test: squint at it next to the three comps below. If you can't tell it apart in half a
second, start over.

## 3. Category conventions — and the one to break

From `market/bestseller-scan.md`, near-universal in this category:

- a heart, an infinity symbol, or two interlocking rings
- watercolour florals or botanical wreaths
- hand-lettered script for the title
- a silhouetted couple, often at sunset
- pastel pink, blush, or dusty rose ground
- the words "gratitude journal for couples" set large and plain

**The one to break: no image at all.** Not a heart, not a couple, not a flower. A single thin
horizontal line — the tether — running across the cover and connecting two small marks. One idea,
enormous white space, title in a warm serif.

Why this helps rather than just being different: it makes the book look like a keepsake rather than
a novelty gift, which is exactly the buyer we're targeting in `market/recommendation.md` — someone
in a 3+ year relationship who has already been given a pastel journal and didn't open it. The
restraint *is* the positioning.

## 4. Concept

A warm off-white field. A single hairline rule crosses the lower third, horizon-like, with two
small solid marks sitting on it — near the left, near the right — not touching, joined by the line.
"Tether" sits above in a large warm serif; the subtitle sits small beneath the rule.

That's the whole cover. **No illustration, no photograph, no texture, no border.** The two marks
and the line between them do all the work, and they read at 100px.

The back cover uses the same off-white with the blurb set in a single column and the same hairline
rule repeated once, short, above it.

## 5. Typography

- **Title:** transitional or old-style serif — the same family as the interior if you can license
  it (EB Garamond, Crimson Pro, and Libre Baskerville are all OFL and free for commercial use, and
  the interior already needs one of them). Large, roman, **title case, not all-caps, not script.**
  Generous letter-spacing.
- **Subtitle:** same family, small, italic or regular, roughly 22–25% of the title size, set below
  the rule.
- **"90 Days · Write Apart, Reveal Together":** small caps or letter-spaced uppercase, quiet, near
  the bottom. **This line is the differentiator — it must be legible but must not shout.**
- **Author:** small, bottom-centre, same family.
- Hierarchy: title ≫ subtitle > mechanic line > author.

⚠️ **The title and author on the cover must match the KDP metadata exactly**, or the upload is
rejected. Title: `Tether`. Subtitle: `A Couples Gratitude Journal for Noticing Why`.

## 6. Palette

Three values, no more:

| role | hex | note |
|------|-----|------|
| Ground | `#F7F3EC` | warm off-white; matches the cream interior stock |
| Ink | `#1F1B16` | near-black, warm. **Not `#000`** — pure black is harsh in CMYK and looks digital |
| Accent | `#9C6B4F` | dusty terracotta, for the rule and the two marks only |

Alternative accent if terracotta feels too warm: deep sage `#5F6F5A`. Pick one; don't use both.

Prints **CMYK**. The near-black will shift slightly and the off-white ground will pick up warmth
from the cream stock — that's fine and intended, but proof it before a large print run.

## 7. Back cover

Layout, top to bottom, inside the safe area (`0.25"` in from trim on all sides):

1. **Hook**, two lines, slightly larger than body: *"You already know why you love them."*
2. **Blurb** — from `export/metadata.md` §8, single column, generous leading, ragged right
3. **The mechanic**, set apart: *One writes on the left. Two writes on the right.*
4. **Author line**, small
5. **Barcode keep-clear rectangle** — **2" × 1.2", bottom-right, 0.25" in from the trim edges.**
   KDP overprints here. Leave it plain ground colour, no art, no text.

## 8. Spine

**Spine text is allowed** — 222 pages is well over KDP's 79-page minimum. Usable width after
clearance: **0.43"**.

Reads, top to bottom (the convention for English-language books):

```
TETHER   ·   A Couples Gratitude Journal        [AUTHOR NAME]
```

Set in the ink colour on the ground colour, small caps or letter-spaced, centred in the spine.
Keep everything **0.0625" clear of each spine edge** — binding shifts by a hair, and type that
touches the fold looks like a printing error.

## 9. Do not

Specific to this category, drawn from the scan. Every one of these appears on multiple comps:

- ❌ hearts, in any form
- ❌ infinity symbols, interlocking rings, knots
- ❌ watercolour florals, botanical wreaths, eucalyptus
- ❌ hand-lettered or brush script for the title
- ❌ silhouetted couples, sunsets, beaches, park benches
- ❌ blush pink, dusty rose, or lavender as the ground
- ❌ stock photography of any kind
- ❌ more than one accent colour
- ❌ a border or frame around the cover
- ❌ badges, starbursts, or "Bestselling Author" flashes — we have no such claim and won't invent one

## 10. Deliverable

- **Single PDF, one page**, full wrap: back cover left, spine centre, front cover right
- **Exactly 12.805" × 9.25"** at **300 DPI** (3842 × 2775 px)
- Background runs to the canvas edge; nothing important within `0.125"` of it
- All text `0.25"` inside the trim lines on front and back
- Fonts **embedded or outlined**
- **CMYK**, transparency flattened
- Barcode rectangle left clear

**Regenerate `cover-spec.md` and revisit this brief if the interior page count changes.** At 222
pages the spine is 0.555"; every 10 pages moves it about 0.025", which is enough to push spine type
onto the front cover.

---

## Before you brief a designer

Download **KDP's own cover template** for 6 × 9, 222 pages, cream paper. It's free, it arrives with
the zones already drawn, and it's what the upload is validated against. Check it against
`cover-spec.md` — the numbers here come from KDP's published formula, but if the two ever disagree,
theirs wins.
