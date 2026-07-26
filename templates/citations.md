# Citations — {{TITLE}}

> **The single source of truth for every factual claim in this book.**
>
> Maintained by the **Researcher**. Referenced inline by the **Writer** as `[C-xxx]`.
> Audited sentence-by-sentence by **QA**.
>
> **IDs are append-only and never reused or renumbered.** A `[C-014]` in a draft must mean the
> same thing forever.

- **Last updated:** {{DATE}}
- **Entries:** 0 · **Unverified:** 0

---

## Rules (binding)

**The factory does not go find sources — you do.** Drop material into
`research/source-material/`, and the Researcher verifies it, logs it here, and reports the gaps in
`research/coverage.md`. See `CLAUDE.md` §0.2 and §2.2.

1. **Never invent a source.** Not a URL, study, author, journal, date, or number. This is the rule
   that stops the factory fabricating a plausible-looking citation.
2. **Never add a source the human didn't supply.** Every entry carries a `Supplied by` line so the
   provenance is auditable.
3. **Open the source.** A filename or a pasted title is not verification. Fetching a *supplied* URL
   to confirm it says what it's claimed to say is exactly the job.
4. **Check the claim against the source, at strength.** A source saying "12% in one small study"
   cannot support "most people." Strength drift is the most common and most damaging error here.
5. **Record tier and publication date.** Flag anything older than ~10 years where currency matters.
6. **Trace to origin.** If a supplied article cites a study, the citation is the study.
7. **Disagreeing sources:** log both, note the disagreement, let the prose present it as contested.
8. **Laundered numbers** — widely repeated, no traceable origin in the supplied material — are
   marked `UNVERIFIED` no matter how famous.
9. **A claim with no source is softened to explicitly-marked opinion, or cut.** There is no third
   option. The author's own expertise, supplied as notes, is opinion unless a source comes with it —
   which is fine, it just has to read as the author speaking.

## Confidence scale
| value | meaning |
|-------|---------|
| `high` | primary or authoritative source, opened and read, cross-checked where warranted |
| `medium` | credible single source, or secondary reporting on a primary you couldn't reach |
| `low` | usable only as explicitly-hedged support; the prose must reflect the weakness |
| `UNVERIFIED` | **cannot support a factual claim.** Soften or cut. |

## Source tiers
`primary` · `authoritative-secondary` · `journalism` · `other` (pointer only — never the citation)

---

## Entry format

```markdown
### [C-001] Short label for the claim
- **Claim:** The precise assertion this entry supports, at the strength it supports it.
- **Source:** "Exact Title of the Source"
- **Author / Publisher:**
- **Date:** YYYY-MM-DD
- **URL:**
- **Tier:** primary
- **Supplied by:** human — `source-material/<filename>`
- **Accessed:** YYYY-MM-DD
- **Confidence:** high — reason
- **Cross-check:** [C-00x], or "not required — not surprising or high-stakes"
- **Used in:** ch03, ch07
- **Notes:** scope limits, sample caveats, anything that would make a broader claim wrong
```

---

## Entries

<!-- Append below. Never renumber. -->

---

## Unverified / flagged

Claims that could **not** be verified against the supplied material. These cannot appear as bare
facts in the manuscript.

| id | claim | why it failed | disposition |
|----|-------|---------------|-------------|
| | | | soften / cut / awaiting a source from the author |

## Gaps — open asks to the author

Mirrors `research/coverage.md`. What the book needs to assert that no supplied source covers.

| # | ch | what's needed | status |
|---|----|---------------|--------|
| 1 | | | open / supplied / softened / cut |

---

## Cut or softened

An audit trail of claims that didn't survive. Keeping this prevents re-litigating the same claim
three chapters later.

| claim | why | what replaced it |
|-------|-----|------------------|
| | | |
