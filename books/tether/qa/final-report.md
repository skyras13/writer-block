# QA Report — Full Manuscript: Tether

**Verdict:** PASS (notes) · **Loop:** 1 · **Date:** 2026-07-24
**Scope:** front matter, 90 prompts across 13 weeks, 13 Weekly Tethers, back matter, and the
generated 6 × 9 interior.

| dimension | verdict | blocking | notes |
|---|---|---|---|
| A. Citation audit | **PASS** | 0 | 3 claims, 3 primary sources, all correctly scaled |
| B. Voice conformance | **PASS (notes)** | 0 | 1 non-blocking finding (prompt-form run) |
| C. Continuity / consistency | **PASS** | 0 | — |
| D. Structure / promise delivery | **PASS** | 0 | — |
| E. Readability | **PASS** | 0 | — |
| F. Originality / AI-tells | **PASS (notes)** | 0 | 1 permitted quotation flagged for the record |

**Overall: PASS.** No blocking findings. Two non-blocking items below, one of which needs a human
decision because it touches content the human specified verbatim.

---

## A. Citation audit — sentence by sentence

Tether asserts facts in exactly one place: the ~400-word front-matter essay "The Tether." The 90
prompts ask questions and assert nothing. Every factual sentence in the essay was checked
individually.

| sentence | entry | supports at this strength? |
|---|---|---|
| "In a set of studies published in 2012, people who felt more appreciated by their partners were more appreciative in return — and the more appreciative partners were also more responsive…, more committed, and more likely to still be there later." | [C-001] Gordon et al. 2012, *JPSP* 103(2) | ✅ Mirrors the abstract's own structure. No causal verb used. |
| "That is a correlation, not a promise. It doesn't say gratitude keeps people together." | — | ✅ Not a factual claim; it is the book **disclaiming** one. Exemplary handling. |
| "In 2006, researchers asked one partner in each of eighty-six dating couples to write for twenty minutes a day, three days running… Three months later, the couples in the writing group were more likely to still be together." | [C-003] Slatcher & Pennebaker 2006, *Psych Science* 17(8) | ✅ n, duration, design, and follow-up window all stated correctly in the prose. |
| "One study, eighty-six couples, twenty years ago. Not proof of anything." | — | ✅ Self-limiting. The book states its own evidence's weakness in the text. |
| "In 2013, partners who expressed gratitude to each other in a laboratory task — out loud, to the person's face — showed better relationship quality six months on, and what predicted it was whether the listener felt *understood*." | [C-002] Algoe, Fredrickson & Gable 2013, *Emotion* 13(4) | ✅ "Felt understood" is a fair plain-English rendering of perceived responsiveness. |
| Back matter: the Tether app "works the same way: you write alone, and when both of you have answered, the words unlock side by side." | [C-004] tether.skdaddle.com | ✅ Direct quotation of first-party copy, attributed in context. |

**Checks run:**
- Every `[C-xxx]` in the manuscript exists in `citations.md`. ✅ (C-001, C-002, C-003, C-004)
- Every entry has a fetched URL and a publication date. ✅
- No `UNVERIFIED` entry supports a bare factual claim. ✅ (the one flagged entry, [C-006], is cut)
- No bare numbers, no "studies show," no unnamed experts. ✅
- No invented reviews, endorsements, or awards. ✅ None appear.
- Citation IDs stripped from the print PDF, verified by text extraction: `grep -c 'C-00'` → **0**. ✅

**Two famous figures were cut and stayed cut**, both verified absent from the manuscript:
- Gottman's "86% vs 33%" bids statistic — real, attributable to the Gottman Institute, but no
  primary source giving sample size or publication was locatable. A laundered number.
- "77% were still dating" attached to [C-003] — appears in 2006 secondary coverage, not in the
  abstract, full text paywalled.

Cutting the two most quotable numbers available to this book is the correct call and the reason
this dimension passes.

## B. Voice-spec conformance

**Mechanical checks (grepped, not eyeballed):**

| check | result |
|---|---|
| `CLAUDE.md` §7 banned list across all manuscript files | **1 hit** — see F1 below, permitted |
| Tether's own ban list (cherish, treasure, soulmate, journey, spark, hold space, love language, attachment, authentic, "reflect on", "think about a time when"…) | **0 hits** |
| Exclamation marks | **0** (the 9 grep hits are all `<!-- PAGE: -->` markers) |
| Gendered or role-assuming language in the 90 prompts (husband/wife/he/she/his/her/boyfriend/girlfriend) | **0 hits** — they/them throughout |
| Closed questions answerable with yes/no (Is/Are/Do/Did/Have/Can/Will/Should openers) | **0** |
| Prompt length | min 7, median 11, max 18 words — inside the 8–22 band except one 7-word prompt (#70, "When did they love you at your least lovable?"), which is deliberate and lands |
| Exact duplicate prompts | **0** |

**POV/tense:** second person throughout; partner is always they/them. Front matter takes the one
permitted first-person aside. ✅
**Reading level:** grade 8 target. No psychology vocabulary anywhere — *responsiveness*,
*validation*, *attachment*, and *emotional labor* appear zero times in reader-facing text. ✅
**Against the gold-standard samples:** the essay opening matches Sample A's move (object first,
short third sentence, refuse the abstraction, close on the shortest line). "How to Use" matches
Sample B — instructional without a single imperative about feelings. ✅
**Failure modes:** checked all five. No saccharine drift (no adjective arrives before its noun in
any prompt). No therapy-speak. No vagueness — every prompt is time-bound or instance-bound. Not
preachy — the book asks and never teaches. ✅

### 🔸 B1 — NON-BLOCKING, needs a human decision
**Prompts 85–89 all open with "What."** Five consecutive prompts sharing a form. The voice spec
(§4) says "a run of five questions in a row is a defect," and the outline's form-variation rule says
no three consecutive prompts share a form.

```
85. What are you most looking forward to doing together?
86. What do you want more of in the next ninety days?
87. What promise do you want to make — quietly — starting today?
88. What have these pages taught you to notice?
89. What will you keep doing, now that you've seen how it feels?
```

Across the other 84 prompts, no run of three exists. This is the only one, and it's in the final
week, where a reader is most likely to feel the metronome.

**Why this is not blocked:** these are the human's own prompts, specified verbatim in Appendix A,
with an explicit instruction to use them rather than regenerate them. QA's job is to flag, not to
overrule the author.

**Proposed minimal fix — two prompts, form only, meaning unchanged:**
- 86 → *"Name what you want more of in the next ninety days."*
- 88 → *"These pages taught you to notice something. Say what."*

That breaks the run to two-then-two and keeps every prompt original and on-voice.
**Awaiting the human's call.** Nothing else in the book depends on it.

## C. Continuity and consistency

- **Terminology:** "One" and "Two" used identically in the front matter, all 180 write-in pages, and
  the generator. "The Weekly Tether" named identically in all 13 instances. ✅
- **The rule is stated once** (How to Use) and never restated, exactly as the voice spec's
  structural signature requires. ✅
- **Prompt numbering:** continuous 1–90, no restarts, no gaps. Verified against the PDF. ✅
- **Week counts:** 7 prompts × 12 weeks + 6 = 90. ✅
- **The title word "Tether"** appears in exactly the three sanctioned places plus the recurring
  device name. ✅
- **No cross-week repetition.** All 11 risk pairs from the outline's repetition audit re-checked
  against the final text. The closest pair (#12 rest-over-convenience / #14 comfort-over-theirs)
  remains distinguishable: #12 names rest specifically, #14 is a general trade. Kept. ✅
- **Front matter promises match the body:** "two facing pages and one question," "three minutes
  each," "a page called The Weekly Tether at the end of every week," "no dates in this book" — all
  four verified true of the generated interior. ✅

## D. Structure and promise delivery

**The brief's promise:** *not more romance — more attention.* Delivered as a practice, never as an
outcome. Checked against the actual text, not the outline.

| success criterion (brief §8) | result |
|---|---|
| 1. 90 distinct prompts, none answerable in one word | ✅ 90 present; 0 closed questions; 0 duplicates |
| 2. The arc is legible without being announced | ✅ Week 1 asks what you almost didn't notice; week 10 asks what you want to forgive in yourself; week 13 asks what you most want them to know. Nothing anywhere tells the reader "the book is getting deeper now." |
| 3. Research cited and correctly scaled, no promised outcomes | ✅ See dimension A |
| 4. Voice holds across all 90 prompts | ✅ See dimension B (one non-blocking note) |
| 5. Interior genuinely print-ready | ✅ See below |
| 6. Non-assuming language throughout | ✅ 0 gendered hits |

**Interior verification — checked page by page, not assumed:**
- 222 pages, even total (KDP requirement) ✅
- **90/90 facing-page spreads correct: One on verso, Two on recto. 0 parity errors.** This is the
  mechanic's single point of failure and it holds across every spread. ✅
- Mirrored margins confirmed on rendered pages: inside 0.85", outside 0.6". Verso and recto mirror
  correctly — the gutter always faces the spine. ✅
- Running heads: book title on verso, week theme on recto, suppressed on openers and front matter.✅
- 11 ruled lines per write-in page, 42pt apart. ✅
- 13 week openers all land on rectos. ✅
- All 13 Weekly Tethers on their own page. ✅
- No dates anywhere in the interior. ✅
- Page count 222 against a brief target of 200–240. ✅

## E. Readability

- **Prompt length variance is real:** 7 to 18 words, median 11. Not a metronome.
- **Form mix across 90:** 74 questions, 9 descriptive instructions (Describe/Name/Recall), 4
  sentence stems, 3 with an internal turn. Only one run of same-form prompts exists (B1).
- **Front matter reads aloud cleanly.** No stumbles. The essay's shortest sentence — "This journal
  is ninety days of looking up." — lands where the voice spec says a section should close.
- **Opens cold.** "A tether is the line that keeps two things joined when one of them drifts." No
  throat-clearing, no "in this book."
- **No end-of-section summaries.** The back matter's "Keep Noticing" is a turn, not a recap — it
  tells the reader the book wasn't the point, which is a different move than restating it.
- **Transitions carry meaning.** "Two other findings shaped how this book works" earns its position.

## F. Originality and AI-tell scan

- **Compliant with every binding rule** in `market/originality.md` §d. ✅
- **All 90 prompts checked individually** against comps and the free-worksheet layer. This category
  is where prompt lists get copied, so each was read rather than sampled. ✅
- **Web spot-check** on distinctive phrasings ("Describe the exact sound of their laugh," "When did
  you catch them being kind to someone who wasn't watching") returned **no exact matches** in any
  existing work. ✅
- **§7 banned list grepped**, not read. One hit, below. ✅
- No reflexive tricolons. ✅ · "It's not X, it's Y" used **zero** times. ✅ · No over-signposting. ✅
- No listicle-brain paragraphs. ✅
- No invented reviews, endorsements, or awards. ✅
- **Machine-made judgment:** no. The specificity carries it — coffee, Tuesday, "cover your side with
  your hand," "eleven seconds." Concrete nouns doing the work abstractions would do worse.

### 🔹 F1 — NON-BLOCKING, for the record
The word **"unlock"** (on the §7 ban list) appears once, in the back matter:

> "you write alone, and when both of you have answered, the words unlock side by side"

This is a **direct quotation of the Tether app's own copy**, cited [C-004] and attributed in
context. Quoting a source's actual words is permitted; the ban targets the word as *our* diction.
No change required. Flagged so a future QA pass doesn't re-open it.

---

## Required fixes (blocking)

**None.**

## Recommended (non-blocking)

1. **[B1]** Break the "What" run at prompts 85–89. Two-word-level edits proposed above. **Human
   decision — these are author-specified prompts.**
2. **[Production]** The interior currently embeds Georgia, a system font not licensed for
   commercial embedding. Drop an OFL serif (EB Garamond, Crimson Pro, Libre Baskerville) into
   `export/fonts/` and rerun before publishing. Carried into `PUBLISH.md` as a blocker there.
3. **[Market]** Fill the unverified price/rating/review fields in `market/bestseller-scan.md` before
   launch. Doesn't affect the manuscript; does affect the launch decision.
4. **[Legal]** USPTO check on "Tether" in class 16 and on the exact subtitle, per
   `market/originality.md` §e.

## Routing

→ **Producer: advance to export.** Items 2–4 are launch-gate items tracked in `PUBLISH.md`, not
manuscript defects. Item 1 awaits the human.
