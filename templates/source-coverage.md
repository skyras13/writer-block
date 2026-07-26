# Source Coverage — {{TITLE}}

> Written by the **Researcher** into `books/<slug>/research/coverage.md`.
> **This is the file the author actually acts on.** Everything else in the sources phase is
> bookkeeping; this is the ask.

- **Pass:** 1
- **Date:** {{DATE}}
- **Supplied files:** ___ in `research/source-material/`

---

## 1. What the book needs to assert

Walked from `outline.md`, chapter by chapter. Every factual claim the outline depends on.

| ch | claim the outline depends on | covered? | entry | note |
|----|------------------------------|----------|-------|------|
| | | ✅ / ⚠️ / ❌ | `[C-xxx]` | |

- ✅ **covered** — a supplied source supports it, at the strength the outline needs
- ⚠️ **partial** — supported, but weaker or narrower than the outline assumes. The prose has to
  come down to what the source says.
- ❌ **gap** — nothing supplied covers it

## 2. Gaps — what I need from you

Numbered, specific, phrased as *what would close it*. This is the shopping list.

State the consequence of not closing each one, so the author can decide rather than guess:
every gap ends as either a supplied source, an explicitly-marked opinion, or a cut.

1. **Ch _:** ______________________________
   *If no source: this becomes "in my experience, …" — your voice rather than evidence. Fine, but
   it stops being a claim the reader has to accept.*
2.

**If this list is empty, say so explicitly.** An absent gap list reads as an unfinished audit.

## 3. Misstatements found in the supplied notes

Where the author's own note doesn't match the source they attached. **Report these plainly — do not
soften them.** Catching this is the job.

| # | your note says | the source says | what it supports |
|---|----------------|-----------------|------------------|
| 1 | | | |

## 4. Strength ceilings

Claims that are supported, but not as strongly as the outline wants. The prose must not exceed the
right-hand column.

| entry | outline wants | source supports |
|-------|---------------|-----------------|
| `[C-xxx]` | | |

## 5. Currency flags

| entry | published | age | matters here? |
|-------|-----------|-----|---------------|
| `[C-xxx]` | | | yes — fast-moving field / no — stable |

## 6. Contested

Two supplied sources that disagree. Log both; let the prose present it as contested rather than
picking a winner silently.

| claim | source A | source B | how the prose should handle it |
|-------|----------|----------|-------------------------------|
| | | | |

## 7. Logged and clean

`[C-001]` … — verified against the source itself, tier and date recorded, `Supplied by` noted.

## 8. Unverifiable

Supplied, but could not be confirmed. **Cannot support a bare factual claim.**

| id | claim | why | disposition |
|----|-------|-----|-------------|
| | | | soften / cut / awaiting a better source |

---

## Definition of done

- [ ] Every file in `source-material/` read
- [ ] Every source verified against the source, not against the note about it
- [ ] §2 gap list written — explicitly empty if there are no gaps
- [ ] Every misstatement in §3 reported without softening
- [ ] Zero sources added that the author didn't supply
