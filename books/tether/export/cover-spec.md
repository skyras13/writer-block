# Cover Spec — Tether

> **Dimensions only. This is not artwork.** Hand it to a designer, or use it as the document setup
> in Canva / Affinity / Illustrator.
>
> Numbers computed by `app/export/cover-spec.js` from KDP's published formula
> (kdp.amazon.com/en_US/help/topic/G201953020). **Re-run after any interior change** — one added
> page moves the spine and shifts both covers.

- **Book:** Tether — A Couples Gratitude Journal for Noticing Why
- **Author:** [AUTHOR NAME]
- **Interior:** 222 pages · 6 × 9 in · cream paper

---

## The canvas

| | inches | mm | px @ 300 DPI |
|---|---|---|---|
| **Full cover width** | **12.805"** | 325.25 mm | 3842 px |
| **Full cover height** | **9.25"** | 234.95 mm | 2775 px |
| Spine | 0.555" | 14.1 mm | 167 px |

```
0.125 + 6 + 0.555 + 6 + 0.125 = 12.805" wide · 0.125 + 9 + 0.125 = 9.25" tall
```

**Spine:** `222 pages × 0.0025" (cream) = 0.555"`

---

## Zones

All coordinates measured from the **top-left corner of the full canvas**, in inches.

| zone | x | y | width | height |
|------|---|---|-------|--------|
| Back cover (trim) | 0.125" | 0.125" | 6" | 9" |
| Back cover — safe area | 0.25" | 0.25" | 5.75" | 8.75" |
| Spine (trim) | 6.125" | 0.125" | 0.555" | 9" |
| Spine — text safe | 6.1875" | 0.25" | 0.43" | 8.75" |
| Front cover (trim) | 6.68" | 0.125" | 6" | 9" |
| Front cover — safe area | 6.805" | 0.25" | 5.75" | 8.75" |
| Barcode — KEEP CLEAR | 3.875" | 7.675" | 2" | 1.2" |

```
├─0.125"─┬──────── 6" ────────┬─0.555"─┬──────── 6" ────────┬─0.125"─┤
  bleed         BACK COVER          SPINE        FRONT COVER        bleed
```

**Spine text:** allowed (222 ≥ 79 pages). Usable width **0.43"** after 0.0625" clearance each side.

---

## Checklist

- [ ] Canvas exactly 12.805" × 9.25" at 300 DPI (3842 × 2775 px).
- [ ] Single PDF, one page, full wrap — back cover on the left, spine centre, front cover on the right.
- [ ] Background art runs to the canvas edge; nothing important within 0.125" of it.
- [ ] Keep all text 0.125" inside the trim lines on front and back.
- [ ] Spine text stays within 0.43" — 0.0625" clear of each spine edge.
- [ ] Leave the barcode rectangle clear: 2" × 1.2", bottom-right of the back cover, 0.25" in from the trim edges.
- [ ] Embed every font, or outline the type.
- [ ] CMYK or greyscale; flatten transparency.
- [ ] Title and author on the cover must match the KDP metadata exactly, or the upload is rejected.
- [ ] Re-run this after ANY interior change — one added page moves the spine and shifts both covers.
- [ ] Download KDP's own template with the final page count and check this against it. Theirs is authoritative.


---

## Before you send this to a designer

1. **Download KDP's own cover template** for 6 × 9, 222 pages,
   cream paper. It is free, it is authoritative, and it arrives as a PNG/PDF with the
   zones already drawn. Check every number above against it.
2. **Lock the interior first.** These numbers are a function of the page count. Re-run this after
   any manuscript change.
3. **Confirm the paper type matches** what you select at upload. Cream and white have different
   calipers, and picking the other one at checkout invalidates the spine.

