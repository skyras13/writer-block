# QA Rubric — Tether

> Run by the **QA** agent on every chapter and on the full manuscript.
> **Default to FAIL.** A chapter passes when it demonstrably meets the bar, not when nothing
> obvious is wrong.
>
> Every finding quotes the text, names the location, and states the required fix.

---

## A. Citation audit — **hard gate**

Go **sentence by sentence** through everything that asserts a fact.

- [ ] Every factual sentence carries a `[C-xxx]` reference
- [ ] Every referenced ID exists in `citations.md`
- [ ] The entry actually supports **this** sentence **at this strength**
      *(watch for drift: "12% in one small study" ≠ "research shows most people")*
- [ ] No `UNVERIFIED` entry is used to support a bare factual claim
- [ ] No numbers without a source
- [ ] No "studies show" / "experts agree" without a named study or expert
- [ ] No historical, medical, legal, or technical claim without a citation
- [ ] No citation that is a blog citing a study, where the study was reachable
- [ ] Quotations short, marked, attributed, cited
- [ ] Fact / opinion / anecdote are clearly distinguished in the prose
- [ ] Composite examples are labeled as composites
- [ ] No invented reviews, endorsements, or awards

**Every finding here is blocking.** Required fix is one of: source it · soften to explicitly-marked
opinion · cut. There is no fourth option.

---

## B. Voice-spec conformance

- [ ] POV and tense as specified, throughout
- [ ] Reading level within the target band
- [ ] Sentence-length average and **variance** meet the spec
- [ ] Per-paragraph rhythm rule satisfied
- [ ] No three consecutive sentences of the same structure
- [ ] Paragraph length policy respected
- [ ] Embrace list present; ban list absent
- [ ] Contractions / profanity / figurative-language policy followed
- [ ] Banned metaphor families absent
- [ ] Structural signature followed (openings, closings, example handling)
- [ ] Holds up against the **gold-standard samples** — same book?
- [ ] None of the named **failure modes** have crept in

---

## C. Continuity and consistency

**Fiction**
- [ ] Names, spellings, ages, physical details match the continuity ledger
- [ ] Timeline is consistent (days, seasons, elapsed time, travel time)
- [ ] Locations consistent
- [ ] Objects introduced are tracked
- [ ] POV discipline — one POV per scene, no head-hopping
- [ ] Character voices stay distinct
- [ ] Established facts not contradicted

**Non-fiction**
- [ ] Terminology used consistently
- [ ] Framework parts named identically throughout
- [ ] No contradiction with other chapters
- [ ] Cross-references accurate
- [ ] No concept re-introduced as if new

**Both**
- [ ] Does not repeat a neighboring chapter

---

## D. Structure and promise delivery

- [ ] Every required outline field for this chapter is delivered

**Self-help**
- [ ] Exactly **one** big idea (not two wearing one title)
- [ ] Evidence present and load-bearing
- [ ] Story/example present, and belongs *here*
- [ ] The objection handled is the reader's strongest, not a strawman
- [ ] Action step is concrete and doable this week
- [ ] Reader moves from the stated entry state to the stated exit state

**Fiction**
- [ ] The scene turns
- [ ] Conflict is real, and between people where possible
- [ ] Stakes are on the page, not in the outline
- [ ] Nobody gets what they want too easily
- [ ] No unearned resolution; change comes through pressure, not narration

**Full-manuscript pass**
- [ ] Every component of the brief's promise is delivered **by the actual text**
- [ ] Arc holds across the whole book
- [ ] Front and back matter complete
- [ ] Brief's success criteria met

---

## E. Readability

- [ ] Real sentence-length variance — not a metronome
- [ ] No walls of text
- [ ] Reading level in band
- [ ] Opens cold and lands; doesn't warm up for 300 words or trail off
- [ ] **Read aloud** — no stumbles, no attention drift
- [ ] Transitions carry meaning, not just position
- [ ] No end-of-section summary restating what was just read

---

## F. Originality and AI-tell scan

- [ ] Complies with every binding rule in `market/originality.md`
- [ ] No reproduced prompts, exercise lists, checklists, structures, or framework names from comps
- [ ] **Journals/workbooks: every single prompt checked** — this is where copying happens
- [ ] Distinctive phrasings spot-checked via web search; no exact matches in other works
- [ ] **Grepped** (not just read) for the `CLAUDE.md` §7 banned list:
      "in today's" · "now more than ever" · "it's important to note" · "at the end of the day" ·
      "let's dive in" · "the truth is" · "delve" · "tapestry" · "testament to" · "realm" ·
      "landscape of" · "unlock" · "leverage" · "transformative" · "game-chang" · "holistic" ·
      "seamless" · "robust" · "truly" · "incredibly" · "profoundly" · "simply put"
- [ ] No reflexive tricolons used as rhythm crutches
- [ ] "It's not X, it's Y" used at most once in the book
- [ ] No over-signposting
- [ ] No listicle-brain paragraphs
- [ ] Judgment: does any page sound machine-made?

---

## Verdict rules

| condition | verdict |
|-----------|---------|
| Any dimension-A finding | **FAIL** (always blocking) |
| Any other blocking finding | **FAIL** |
| Only non-blocking observations | `PASS (notes)` |
| All six clean | **PASS** |

**Overall PASS requires every dimension at PASS or PASS (notes).**

Loop 2 failing for the same reason → escalate to the human. Include the diagnosis of *why* the fix
isn't landing; it's usually an outline or research problem wearing a writing problem's clothes.
