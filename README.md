# Book Factory

A reusable production line for publication-quality books — self-help/how-to, realistic fiction, and
journals/workbooks — built for Amazon KDP.

This is **not** a single book project. It's the factory. Every book you make lives in its own
folder under `books/`, produced by the same agents, templates, and quality gates. Nothing needs
rebuilding between books.

Two halves:

- **The pipeline** — nine specialist Claude Code agents (Producer, Market Scout, Researcher, Voice
  Architect, Storyboarder, Writer, Editor, QA, Cover Spec) that run a gated assembly line from
  market research to KDP-ready files.
- **The control panel** — a local web app for reading, editing, approving, and exporting, so you're
  not driving the whole thing through chat.

Everything is a plain file on disk. No database, no cloud service, no lock-in. `git diff` works.
Backing up a book is copying a folder.

---

## Quick start

```bash
cd app && npm install && npm start
```

Then open **http://localhost:3000**.

To start writing a book, open Claude Code in the repo root and type:

```
Start a new book: Tether / journal / A daily couples gratitude journal built on a write-apart, reveal-together ritual
```

Format: `Start a new book: <title> / <selfhelp|fiction|journal> / <topic or premise>`

The Producer scaffolds `books/<slug>/`, dispatches the Market Scout, and stops at the first
checkpoint for you.

---

## The handshake — how the UI and the agents talk

**This is the part to understand.** The web app never runs the agents. It's a file editor and a
decision recorder. The agents run in Claude Code. They meet on disk.

```
   Claude Code                          The UI (localhost:3000)
   ───────────                          ───────────────────────
   Producer finishes a phase
   writes artifacts to disk
   sets decisions.json:
     currentCheckpoint: "brief"
     awaitingApproval: true
   STOPS  ──────────────────────────►   Checkpoint card appears
                                        You read brief.md
                                        You click ✓ Approve  (or ✎ Request changes + comment)
                                        UI appends to decisions.json
                                          { checkpoint, verdict, comment, at }
                                          awaitingApproval: false
   ◄──────────────────────────────────
   You say "continue" in Claude Code
   Producer re-reads decisions.json
   approved          → next phase
   changes_requested → redo this phase, addressing your comment
```

Three consequences worth internalizing:

1. **Clicking Approve doesn't start anything.** You have to go back to Claude Code and say
   `continue`. The button records a decision; the agent acts on it.
2. **Edits you make in the manuscript editor are authoritative.** The Producer re-reads chapter
   files from disk before using them, so if you rewrite a paragraph, that's what the Editor sees.
3. **You can skip the UI entirely.** It's a convenience layer over files. Approving in chat works
   the same way — the Producer just writes the decision itself.

---

## The pipeline

```
Start a new book: <title> / <genre> / <topic>
      ↓
1. Market Scout       bestseller scan · niche map · originality clearance   ──► you pick the niche
2. Producer           book brief, seeded by the chosen niche                ──► you approve
3. Voice Architect    voice spec + 3 gold-standard sample paragraphs        ──► you approve
4. [Sources]          YOU supply material → Researcher verifies + logs it   ──► you review the gaps
                      (skipped entirely when the book asserts no facts)
5. Storyboarder       outline / storyboard / content map                    ──► you approve
6. Writer→Editor→QA   per chapter, looping until QA passes                  ──► you approve each section
7. QA                 full-manuscript pass: arc, citations, originality
8. Producer           KDP export + metadata pack                            ──► final review
```

Nothing advances on a failed gate. Two failed QA loops on one chapter escalates to you with a
diagnosis instead of silently trying a third time.

### The nine agents

| agent | what it does |
|-------|--------------|
| **Producer** | Orchestrates. Enforces gates, runs the drafting loop, surfaces checkpoints. Never writes prose. |
| **Market Scout** | Finds the underserved pocket to compete in, and clears the concept for originality. |
| **Researcher** | Fact-checks the material **you** supply, logs `citations.md`, and reports the gaps. Never goes hunting, never adds a source you didn't give it. |
| **Voice Architect** | Writes the binding voice contract — POV, cadence, diction, ban lists, samples. |
| **Storyboarder** | Builds the skeleton — argument architecture, scene map, or content map. |
| **Writer** | Drafts one chapter at a time from the outline. Marks gaps `[NEEDS SOURCE]` for you rather than guessing. |
| **Editor** | Developmental + line edit. Strips AI tells and filler. Doesn't approve. |
| **QA** | The gate. Six-dimension rubric. Defaults to FAIL. |
| **Cover Spec** | Computes the exact KDP cover canvas from the final page count, and writes the design brief. Dimensions and direction — not artwork. |

Definitions live in `.claude/agents/`. The master runbook is `CLAUDE.md` — read that if you want to
change how the factory behaves.

---

## What the factory guarantees

**You do the topic research; the factory does the niches and the writing.** This is a deliberate
split. The factory never goes off and decides what your book's evidence base should be. You drop
material into `books/<slug>/research/source-material/` — papers, PDFs, links, notes, your own
expertise written out — and the Researcher verifies it, logs it, and hands you back a gap list.

**Every factual claim is still cited.** Because the rule that matters isn't "do research," it's
**never invent a source.** A claim with nothing behind it gets softened to explicitly-marked
opinion or cut. QA audits sentence by sentence. That rule costs you nothing when you're the one
supplying the material, and it's the only thing standing between you and a book containing a
confident, plausible, entirely fictional statistic.

**Books that assert nothing skip the phase entirely.** Journals, prompt books, workbooks, and most
fiction never touch it — the stepper shows it struck through, and the pipeline goes brief → voice →
outline.

**No AI slop.** `CLAUDE.md` §7 is an explicit ban list — generic openers, hedge padding,
over-signposting, reflexive tricolons, empty abstractions, listicle-brain prose. The Editor hunts
them, QA greps for them.

**Original work.** Every book carries `market/originality.md`: title/trademark collision checks,
comp-by-comp differentiation, and binding rules the Writer follows. QA re-checks the manuscript
against it. *(Guidance for producing original work, not legal advice — have a professional review
the manuscript, title, and cover before publishing.)*

**You stay in control.** Eight checkpoints. Nothing expensive happens without your approval.

---

## The control panel

`cd app && npm install && npm start` → http://localhost:3000

- **Library** — cards per book with phase, progress, word count, and whether it's waiting on you.
  `+ New Book` scaffolds a folder. Per-book management: rename, duplicate, archive, trash, backup.
- **Pipeline tracker** — a stepper showing exactly where the book is.
- **Checkpoint controls** — ✓ Approve / ✎ Request changes, with a comment box, wired to
  `decisions.json`.
- **Manuscript reader/editor** — chapter navigator with QA status dots, a serif reading view, an
  editable pane that saves straight back to the markdown, and side panels for the QA report,
  citations used in that chapter, and the voice spec.
- **Research & citations** — sortable, filterable table (claim → source → URL → date → confidence).
  Unverified rows flagged red. Plus the rendered dossier.
- **Export** — one button per format, with build logs, EPUB validation results, and download links.
- **History** — the append-only audit trail.

Keyboard: `⌘S` save · `⌘E` toggle edit · `j`/`k` previous/next chapter · `Esc` leave edit mode.

---

## Export & KDP

Three publishable formats from one manuscript source:

| button | output | what it's for |
|--------|--------|---------------|
| 📖 Export Kindle ebook | `book.epub` | **The Kindle ebook upload.** Reflowable, with TOC and metadata. Validated after build. |
| 📄 Export Word manuscript | `book.docx` | KDP also accepts this for ebooks; it's also what you hand a human editor. |
| 🖨️ Export paperback interior | `book-6x9.pdf` | **The paperback interior upload.** Mirrored margins, gutter, running heads. Trim: 5×8, 5.5×8.5, 6×9. |
| 🧾 Export metadata pack | `metadata.md`, `blurb.txt`, `keywords.txt` | Paste-ready KDP listing fields. |
| (agent) Cover spec | `cover-spec.md`, `cover-brief.md` | Exact cover canvas + design brief. |
| 📦 Export all | zipped `export/` | Everything, one download. |

Each book also gets a `PUBLISH.md` saying exactly which file to upload where, and with what
settings.

### Toolchain

Exports shell out to real tools. The app detects what's installed and tells you what's missing
rather than failing silently — the status is in the top bar and on the Export tab.

```bash
brew install pandoc calibre weasyprint     # macOS
sudo apt-get install -y pandoc calibre weasyprint   # Debian/Ubuntu
```

`weasyprint` is the one that matters for paperbacks — it's the only engine here that implements CSS
Paged Media properly, which is what gives you mirrored margins and running heads. calibre works as
a fallback but can't do a real gutter.

Check anytime:

```bash
cd app && npm run doctor
```

### Covers

The factory produces a cover **spec and brief**, not artwork — a KDP cover is mostly arithmetic and
typography discipline, and the spine width is a function of the final page count.

```bash
node app/export/cover-spec.js --pages 222 --trim 6x9 --paper cream --title "Tether"
```

Gives you the full-wrap canvas, every zone coordinate, the barcode keep-clear rectangle, and a
checklist. Constants come from KDP's published formula. **Re-run it after any interior change** —
one added page moves the spine and shifts both covers.

Note: several popular third-party KDP calculators add `+0.06"` to the spine as a "cover allowance."
That is not in KDP's formula and this tool does not add it. Pass `--allowance` if you want it, and
it's reported as a separate line so it can't be mistaken for Amazon's number.

**Fixed-layout books.** Journals and workbooks can't go through markdown→PDF — ruled write-in
areas, facing-page spreads, and fixed pagination need real layout control. Those books ship their
own `books/<slug>/export/build-interior.js`, and the exporter delegates to it automatically. See
`books/tether/` for a working example.

---

## Storage

No database. Ever.

```
books/
├── library.json          # index/manifest — a CACHE, rebuilt by scanning books/
├── _archive/             # archived books
├── _trash/               # soft-deleted books (nothing is ever hard-deleted)
└── <slug>/
    ├── meta.json         # book metadata + KDP fields
    ├── decisions.json    # ← the UI writes here, the Producer reads here
    ├── history.log       # append-only audit trail
    ├── brief.md
    ├── voice-spec.md
    ├── outline.md
    ├── citations.md
    ├── market/           # bestseller-scan, niche-map, recommendation, originality
    ├── research/
    │   ├── source-material/  # ← YOU put sources here
    │   └── coverage.md       # ← what's covered, and the gap list to act on
    ├── manuscript/       # one markdown file per chapter
    ├── qa/               # per-chapter reports, changelogs, final report
    ├── export/           # generated KDP files
    └── PUBLISH.md        # exactly what to upload
```

`library.json` can never get permanently out of date — the server rebuilds it by scanning `books/`
on every request. Delete it and it comes back.

Backing up a book: copy the folder, or hit **Export/Backup** for a zip. Version control: it's all
text, so `git` does what you'd expect.

---

## Repo layout

```
writer-block/
├── CLAUDE.md              # master runbook — principles, pipeline, gates, kickoff protocol
├── README.md              # this file
├── .claude/agents/        # the eight agent definitions
├── templates/             # scaffolds copied into each new book
├── app/                   # the control panel
│   ├── server.js          # REST API over books/ + export runner
│   ├── public/            # dashboard, tracker, reader/editor, research view, export panel
│   └── export/
│       ├── build.js       # pandoc/calibre orchestration + toolchain detection
│       ├── epub.css       # ebook styling
│       └── print.css      # 6×9 paperback interior styling
└── books/                 # your books
```

---

## Typical session

1. `cd app && npm start`, leave it running.
2. In Claude Code: `Start a new book: <title> / <genre> / <topic>`.
3. Claude runs the Market Scout and stops. Read `market/` in the UI, click **Approve**.
4. Back in Claude Code: `continue`. It drafts the brief and stops. Approve.
5. Repeat through voice. At the sources gate, either drop your material into
   `research/source-material/` and let the Researcher check it, or let Claude skip the phase if the
   book asserts no facts. Then outline.
6. Drafting runs chapter by chapter with Writer→Editor→QA loops, checkpointing at each section.
7. Full-manuscript QA, then export.
8. Open **Export**, build EPUB + print PDF + metadata, read `PUBLISH.md`, upload to KDP.

If you want to change something mid-flight, use **✎ Request changes** with a specific comment. The
Producer re-runs that phase against your note rather than plowing ahead.

---

## Notes and limits

- **The research bar is real.** If the Researcher can't verify a claim, it gets softened or cut.
  This will occasionally make a chapter less punchy than an unsourced version. That's the deal.
- **Originality checks are guidance, not legal advice.** Have a professional review the manuscript,
  title, and cover before you publish.
- **No invented social proof.** The factory won't write fake reviews, endorsements, or awards.
- **Covers are not generated here.** You get cover copy and a design brief; the artwork is a
  separate job.
- **KDP margin tables change.** The trim defaults here are sane for 150–300 page books. Check the
  current KDP requirements before uploading a long one.
