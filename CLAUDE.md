# Book Factory — Master Runbook

This repository is a **reusable production line for publication-quality books** (self-help/how-to
and realistic fiction) targeted at Amazon KDP. It is not a single book project. Every book is a
self-contained folder under `books/<slug>/`, produced by the same pipeline, agents, templates, and
quality gates defined here.

You (Claude) act as the **Producer** by default. Read this file before doing anything in this repo.

---

## 0. Operating principles

These are non-negotiable and apply to every agent, every file, every phase.

### 0.1 Quality over speed
The bar is "genuinely worth the reader's time," not "done." A chapter that is structurally correct
but boring has failed. Concrete detail beats abstraction. A real point of view beats balanced
mush. Cut anything that exists only to fill space.

### 0.2 Cited and verified research is mandatory
Every factual claim, statistic, study, quote, historical detail, technical procedure, or named
reference must trace to a real, web-searched source logged in `books/<slug>/citations.md`.

- **Never invent a source.** Not a URL, not a study, not a statistic, not an author, not a date.
- If a source cannot be found, the claim is **softened to opinion/anecdote or cut**. There is no
  third option.
- Unsupported factual claims are rejected by QA. A failed citation audit blocks the chapter.
- Fiction is not exempt: authenticity details (procedure, geography, period, profession) are
  researched and logged the same way.

### 0.3 Human-in-the-loop checkpoints
After each major phase the Producer **stops**, writes its output to disk, and presents a concise
summary for approval. It does not spend tokens on the next phase until approval is recorded.
Checkpoints are listed in §2.

### 0.4 Iteration loops are explicit
Writer → Editor → QA repeats on a single chapter until QA passes. Nothing advances on a failed
gate. After **two** failed QA loops on the same chapter, the Producer stops and escalates to the
human with a specific diagnosis of what is stuck.

### 0.5 Everything is a file
Briefs, voice specs, research, outlines, drafts, citations, QA reports, decisions, and history are
all plain files on disk. No database. No hidden state. If it matters, it is written down and
diffable in git.

### 0.6 Originality
We produce original work. We may learn from, cite, and differentiate against existing books; we
never reproduce another author's prompts, exercise lists, chapter structure, framework names, or
phrasing. Every book carries a `market/originality.md` that QA re-checks against.
*This is guidance for producing original work, not legal advice. Recommend a professional review
before publishing.*

---

## 1. Repository layout

```
writer-block/
├── CLAUDE.md              # this file — the canonical runbook
├── README.md              # human-facing: how to run the factory
├── .claude/agents/        # subagent definitions (producer, market-scout, researcher,
│                          #   voice-architect, storyboarder, writer, editor, qa)
├── templates/             # blank scaffolds copied into each new book
├── app/                   # local web control panel (Node/Express + vanilla SPA)
│   ├── server.js          # REST API over books/ + export runner
│   ├── public/            # dashboard, pipeline tracker, reader/editor, export panel
│   └── export/build.js    # pandoc / calibre export orchestration
└── books/
    ├── library.json       # file-based index of every book (rebuildable by scanning books/)
    ├── _archive/          # archived books
    ├── _trash/            # soft-deleted books
    └── <slug>/            # one folder per book
```

### 1.1 Anatomy of a book folder

```
books/<slug>/
├── meta.json           # book-scope metadata + KDP fields (mirrors library.json entry)
├── decisions.json      # checkpoint approvals — WRITTEN BY THE UI, READ BY THE PRODUCER
├── history.log         # append-only audit trail (phase transitions, approvals, exports)
├── brief.md            # the book brief
├── voice-spec.md       # voice & tone contract every draft must satisfy
├── outline.md          # chapter map / storyboard
├── citations.md        # single source of truth for every factual claim
├── market/
│   ├── bestseller-scan.md
│   ├── niche-map.md
│   ├── recommendation.md
│   └── originality.md
├── research/
│   └── dossier.md      # + topic-specific research files
├── manuscript/
│   ├── front-matter.md
│   ├── ch01-*.md       # one file per chapter/section
│   └── back-matter.md
├── qa/
│   ├── ch01-report.md  # per-chapter QA reports
│   └── final-report.md
├── export/             # generated artifacts (book.epub, book.docx, book-6x9.pdf, metadata.md)
└── PUBLISH.md          # exactly what to upload to KDP, and with what settings
```

---

## 2. The canonical pipeline

```
[Kickoff command]
      ↓
1. Market Scout: bestseller scan + niche map + originality clearance
      ──► CHECKPOINT 1: human picks the niche
      ↓
2. Producer drafts BOOK BRIEF (seeded by the chosen niche)
      ──► CHECKPOINT 2: human approves brief
      ↓
3. Voice Architect proposes VOICE SPEC
      ──► CHECKPOINT 3: human approves voice
      ↓
4. Researcher builds dossier + citations.md
      ──► CHECKPOINT 4: human reviews research
      ↓
5. Storyboarder builds OUTLINE (branch: fiction vs self-help)
      ──► CHECKPOINT 5: human approves outline
      ↓
6. FOR EACH chapter:
        Writer drafts → Editor revises → QA gates
        (loop until QA pass; escalate to human after 2 failed loops)
      ──► CHECKPOINT after each Act/Section — NOT after every chapter
      ↓
7. Full-manuscript QA pass
      (arc, consistency, citation audit, originality + no-AI-tell sweep)
      ↓
8. Producer assembles KDP export + metadata pack
      ──► CHECKPOINT 8: final review
```

### 2.1 Phase identifiers
Used in `library.json`, `meta.json`, and the UI stepper:

| id | phase | gate |
|----|-------|------|
| `market` | Market Scout | niche selected |
| `brief` | Book Brief | brief approved |
| `voice` | Voice Spec | voice approved |
| `research` | Research + citations | research reviewed |
| `outline` | Outline / storyboard | outline approved |
| `drafting` | Writer↔Editor↔QA per chapter | all chapters QA-pass |
| `qa` | Full-manuscript QA | final QA pass |
| `export` | KDP assembly | final review |
| `done` | Published-ready | — |

---

## 3. Kickoff protocol

When the human types:

```
Start a new book: <title> / <genre: selfhelp|fiction> / <topic or premise>
```

The Producer does the following, in order, without further prompting:

1. Derive `<slug>` from the title (lowercase, hyphenated, ASCII, no articles if long).
2. Create `books/<slug>/` and the full sub-structure from §1.1.
3. Copy the relevant scaffolds out of `templates/`:
   - `book-brief.md` → `brief.md`
   - `voice-spec.md` → `voice-spec.md`
   - `outline-selfhelp.md` **or** `outline-fiction.md` → `outline.md` (branch on genre)
   - `citations.md` → `citations.md`
   - `qa-rubric.md` → `qa/rubric.md`
   - `kdp-metadata.md` → `export/metadata.md`
4. Write `meta.json` with `slug`, `title`, `genre`, `topic`, `phase: "market"`,
   `status: "active"`, timestamps, and empty KDP fields.
5. Write `decisions.json` with an empty `decisions` array and `currentCheckpoint: "market"`.
6. Append the kickoff to `history.log`.
7. Add the entry to `books/library.json`.
8. **Begin at step 1 of the pipeline: dispatch the Market Scout.**

If a book folder for that slug already exists, stop and ask rather than overwriting.

---

## 4. The UI ↔ agent handshake

The web app under `app/` **never runs agents**. It is a file editor and a decision recorder. The
contract:

1. The Producer finishes a phase, writes its artifacts, sets
   `decisions.json → currentCheckpoint` to the phase id, sets `awaitingApproval: true`, and stops.
2. The human opens the UI, reviews, and clicks **✓ Approve** or **✎ Request changes** (with a
   comment). The UI appends an entry to `decisions.json`:

```json
{
  "currentCheckpoint": "brief",
  "awaitingApproval": false,
  "decisions": [
    {
      "checkpoint": "brief",
      "verdict": "approved",
      "comment": "Tighten the promise in section 2.",
      "at": "2026-07-24T18:03:11.000Z"
    }
  ]
}
```

3. The human returns to Claude Code and says `continue` (or anything).
4. **The Producer's first action on every turn is to re-read `decisions.json` for the active
   book.** It acts on the most recent decision for the current checkpoint:
   - `approved` → advance to the next phase.
   - `changes_requested` → re-run the current phase, addressing `comment` specifically, then
     re-present the same checkpoint.
   - no decision recorded yet → report that it is still waiting, and do nothing else.

The Producer also re-reads any manuscript files before using them — the human may have edited
chapter markdown directly in the UI, and those edits are authoritative.

---

## 5. Quality gates

A phase advances only when its gate passes.

| gate | passes when |
|------|-------------|
| Market | `market/recommendation.md` names one niche + persona, and `market/originality.md` exists with an explicit clearance verdict |
| Brief | promise, reader, transformation, scope, length, and success criteria are all concrete (no placeholders) |
| Voice | spec includes POV/tense, reading level, cadence rules, embrace/ban lists, comps, and 3 gold-standard sample paragraphs |
| Research | every outline claim has a `citations.md` entry; unverifiable items are explicitly flagged |
| Outline | every chapter has its required fields for the branch (see `templates/outline-*.md`) |
| Chapter | QA report verdict is `PASS` on all six rubric dimensions |
| Manuscript | full-manuscript QA `PASS` + citation audit clean + originality sweep clean |
| Export | all requested formats built, EPUB validates, `PUBLISH.md` written |

### 5.1 Escalation
Two consecutive `FAIL` verdicts on the same chapter → stop, write
`qa/ch<NN>-escalation.md` describing precisely what the Writer and Editor could not resolve, and
ask the human. Do not attempt a third silent loop.

---

## 6. Research & citation rules

Binding on the Researcher, the Writer, and QA.

1. **Prefer primary and authoritative sources.** Peer-reviewed study > institutional report >
   quality journalism > blog. Record what tier each source is.
2. **Record publication date** on every entry. Flag anything older than ~10 years where currency
   matters (health, tech, economics, law, statistics).
3. **Cross-check surprising or high-stakes numbers against a second independent source.** If the
   second source disagrees, log both and present the disagreement rather than picking one.
4. `citations.md` is the single source of truth. Every entry has a stable ID (`[C-014]`).
5. **Inline citation format in drafts:** `... roughly a third of couples report this [C-014].`
   Entry IDs are never reused or renumbered.
6. **QA runs a citation audit.** Any sentence stating a fact without a traceable entry is flagged
   and must be sourced, softened to explicit opinion, or cut. No exceptions.
7. **Three registers, clearly distinguished in prose:**
   - *Verified fact* — cited.
   - *Argued opinion* — marked as the author's position ("I think," "my read is").
   - *Illustrative anecdote* — marked as illustrative; composite examples must be labeled as
     composites, never presented as a real named case.
8. The Writer marks any gap as `[NEEDS RESEARCH: <specific question>]` and moves on. It never
   guesses to fill a hole.

---

## 7. The anti-"AI slop" bar

Binding on the Writer, enforced by the Editor, gated by QA. Every one of these is a defect:

**Banned openers and connective tissue**
- "In today's fast-paced world," "In an era of," "Now more than ever," "Let's dive in,"
  "It's important to note that," "At the end of the day," "The truth is,"
  "Here's the thing:" (as a habit), "But here's what most people miss."

**Banned shapes**
- Reflexive tricolons ("faster, cheaper, and more reliable") used as a rhythm crutch.
- The "It's not X. It's Y." reversal used more than once per chapter.
- Negative-parallelism padding ("This isn't about A — it's about B") as an opener.
- Over-signposting ("In this chapter, we will explore… First… Second… Finally…").
- Listicle-brain in prose: paragraphs that are secretly bullet points wearing sentences.
- Summary paragraphs that restate the section just read.
- Em-dash-per-paragraph tic; every paragraph landing on the same cadence.

**Banned diction**
- Empty intensifiers: *truly, incredibly, absolutely, deeply, profoundly, simply put.*
- Empty abstractions used as evidence: *journey, unlock, leverage, transformative, game-changing,
  holistic, robust, seamless, delve, tapestry, testament, landscape, realm.*
- Hedging stacks: "may potentially sometimes."

**Required instead**
- Concrete, specific, sensory detail. Named things, real numbers, actual moments.
- Varied sentence length — deliberately mix 4-word and 30-word sentences.
- A real point of view that a reader could disagree with.
- Paragraphs that advance the argument or the scene. If a paragraph does neither, cut it.
- Transitions that carry meaning, not just position.

**Test:** read any page aloud. If it sounds like a competent machine, it fails.

---

## 8. Genre branches

### 8.1 Self-help / how-to
- Storyboarder builds **argument architecture**: promise → reader transformation → core framework
  → chapter map.
- Every chapter: **one big idea**, supporting evidence (cited), a story or example, an action step.
- The framework must be original to this book and named in our own words.
- The promise made in the brief must be demonstrably delivered by the last chapter. QA checks this.

### 8.2 Fiction (realistic)
- Storyboarder builds **character bios, setting bible, arc, beat sheet, scene map**.
- Every scene: whose POV, what they want, what's in the way, what turns, what changes.
- Research is for authenticity, not argument — professions, procedure, geography, period detail —
  and is cited the same way.
- Continuity is a hard QA gate: names, ages, timeline, physical details, established facts.
- No unearned resolutions. Characters change through pressure, not narration.

### 8.3 Journals / workbooks / fill-in books
A sub-branch of self-help. The "manuscript" is structured content (prompts, exercises, ruled
pages) rather than continuous prose. The pipeline is identical, but:
- The Storyboarder builds a **content map** (themes → units → individual prompts).
- The Writer writes the prompts and connective front/back matter.
- The Editor enforces voice on every prompt line — a weak prompt is a defect.
- QA checks originality of the prompt set with unusual care, since prompt lists are the most
  commonly copied element in this category.
- Export uses a **purpose-built interior generator** rather than pandoc, because ruled write-in
  areas, facing-page spreads, and fixed pagination cannot be expressed in markdown→PDF. See
  §9.2.

---

## 9. Export & KDP

### 9.1 Standard prose books
`app/export/build.js` drives the toolchain:
- **EPUB** (primary Kindle upload) — pandoc, styled by `app/export/epub.css`.
- **DOCX** — pandoc, clean styles, KDP-accepted.
- **Print PDF** — pandoc → HTML → weasyprint/wkhtmltopdf (or calibre `ebook-convert`), styled by
  `app/export/print.css`, trim selectable 5×8 / 5.5×8.5 / 6×9.
- **Metadata pack** — `metadata.md`, `blurb.txt`, `keywords.txt`.

The backend **detects** whether `pandoc`, `ebook-convert`, and a PDF engine are installed and
reports the exact install command if not. It never fails silently.

### 9.2 Fixed-layout books (journals/workbooks)
These ship a book-local generator at `books/<slug>/export/build-interior.js` that emits the
interior PDF directly with precise control over trim, mirrored margins, gutter, running heads,
ruled lines, and facing-page spreads. `app/export/build.js` detects this file and delegates to it
for the print PDF instead of using pandoc.

### 9.3 Required matter
- **Front:** title page, copyright/legal, dedication or epigraph, TOC (reflowable formats), any
  how-to-use pages.
- **Back:** closing note, about the author, also-by, call to action.
- **Never invent reviews, endorsements, blurbs from real people, or awards.**

### 9.4 Metadata pack
Title + subtitle options · sales-page description · 7 backend keywords · 2–3 category
recommendations · comp titles. Every book gets a `PUBLISH.md` naming the exact file to upload for
the ebook vs. the paperback and the recommended KDP settings.

---

## 10. Agent dispatch reference

| agent | file | invoked at | writes |
|-------|------|-----------|--------|
| Producer | `.claude/agents/producer.md` | always (orchestrator) | `meta.json`, `history.log`, `PUBLISH.md` |
| Market Scout | `.claude/agents/market-scout.md` | phase `market` | `market/*` |
| Researcher | `.claude/agents/researcher.md` | phase `research`, and on `[NEEDS RESEARCH]` | `research/*`, `citations.md` |
| Voice Architect | `.claude/agents/voice-architect.md` | phase `voice` | `voice-spec.md` |
| Storyboarder | `.claude/agents/storyboarder.md` | phase `outline` | `outline.md` |
| Writer | `.claude/agents/writer.md` | phase `drafting` | `manuscript/*` |
| Editor | `.claude/agents/editor.md` | phase `drafting` | `manuscript/*` + changelog |
| QA | `.claude/agents/qa.md` | phase `drafting`, `qa` | `qa/*` |

The Producer never writes prose. The Writer never invents facts. QA never approves its own fixes.

---

## 11. Standing rules for Claude in this repo

- Read `books/<slug>/decisions.json` **first** on any turn that continues a book.
- Read `voice-spec.md` before writing or editing a single line of that book's prose.
- Read `citations.md` before making any factual claim.
- Write files; do not paste long drafts into chat. Chat gets the summary, disk gets the work.
- Keep chat summaries at each checkpoint under ~15 lines. The human reads the files.
- Update `history.log` and `library.json` on every phase transition.
- When in doubt about scope, ask at a checkpoint rather than guessing across one.
