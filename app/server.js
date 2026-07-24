/**
 * Book Factory — local control panel backend.
 *
 * A thin REST API over the books/ directory plus the export toolchain.
 * There is no database. Every endpoint is a file operation, and the files on disk are always
 * the source of truth — library.json is a cache that can be rebuilt by scanning books/.
 *
 * This server NEVER runs the Claude Code agents. It records approvals and edits into
 * decisions.json / the manuscript files; the Producer agent reads them on its next turn.
 * See README.md §"The handshake".
 */

import express from 'express';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { runExport, detectTools, INSTALL_HINTS } from './export/build.js';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = path.join(ROOT, 'books');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const ARCHIVE_DIR = path.join(BOOKS_DIR, '_archive');
const TRASH_DIR = path.join(BOOKS_DIR, '_trash');
const LIBRARY = path.join(BOOKS_DIR, 'library.json');

const PORT = process.env.PORT || 3000;

const PHASES = [
  'market', 'brief', 'voice', 'research', 'outline', 'drafting', 'qa', 'export', 'done',
];

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb', type: 'text/*' }));

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

const exists = (p) => fsSync.existsSync(p);

function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';
}

/**
 * Resolve a slug to its directory, refusing anything that escapes books/.
 * Guards against `../` traversal in every route that takes a :slug.
 */
function bookDir(slug, base = BOOKS_DIR) {
  const clean = path.basename(String(slug || ''));
  if (!clean || clean.startsWith('.')) throw httpError(400, 'Invalid slug');
  const dir = path.join(base, clean);
  if (!dir.startsWith(base + path.sep)) throw httpError(400, 'Invalid slug');
  return dir;
}

/** Resolve a relative file path inside a book, refusing traversal. */
function bookFile(slug, relPath) {
  const dir = bookDir(slug);
  const target = path.resolve(dir, String(relPath || ''));
  if (target !== dir && !target.startsWith(dir + path.sep)) {
    throw httpError(400, 'Path escapes the book directory');
  }
  return target;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function readJSON(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJSON(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const nowISO = () => new Date().toISOString();

async function appendHistory(slug, line) {
  const file = path.join(bookDir(slug), 'history.log');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, `${nowISO()}  ${line}\n`, 'utf8');
}

async function listDirSafe(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Reading order, not filename order — front matter, then chapters, then back matter.
 * Plain alphabetical puts back-matter.md before front-matter.md, which is nonsense in a navigator.
 * Mirrors the ordering in app/export/build.js so the UI and the exports agree.
 */
function manuscriptOrder(names) {
  const front = names.filter((f) => /front[-_]?matter/i.test(f));
  const back = names.filter((f) => /back[-_]?matter/i.test(f));
  const body = names.filter((f) => !front.includes(f) && !back.includes(f));
  return [...front.sort(), ...body.sort(), ...back.sort()];
}

function countWords(text) {
  const body = String(text)
    .replace(/^---[\s\S]*?\n---\n/, '')      // strip YAML front matter
    .replace(/<!--[\s\S]*?-->/g, '')          // strip HTML comments
    .replace(/```[\s\S]*?```/g, '');          // strip fenced code
  const m = body.match(/[A-Za-z0-9’'\-]+/g);
  return m ? m.length : 0;
}

/* ---------------------------------------------------------------------------
 * Library scanning — library.json is a cache, books/ is the truth
 * ------------------------------------------------------------------------- */

async function scanBook(slug, base = BOOKS_DIR) {
  const dir = bookDir(slug, base);
  const meta = (await readJSON(path.join(dir, 'meta.json'), {})) || {};
  const decisions = (await readJSON(path.join(dir, 'decisions.json'), {})) || {};

  const chapters = (await listDirSafe(path.join(dir, 'manuscript')))
    .filter((d) => d.isFile() && d.name.endsWith('.md'))
    .map((d) => d.name)
    .sort();

  let words = 0;
  for (const name of chapters) {
    try {
      words += countWords(await fs.readFile(path.join(dir, 'manuscript', name), 'utf8'));
    } catch { /* unreadable file contributes nothing */ }
  }

  const qaFiles = (await listDirSafe(path.join(dir, 'qa')))
    .filter((d) => d.isFile() && /-report\.md$/.test(d.name))
    .map((d) => d.name);

  let qaPassed = 0;
  for (const name of qaFiles) {
    try {
      const t = await fs.readFile(path.join(dir, 'qa', name), 'utf8');
      if (/\*\*Verdict:\*\*\s*PASS/i.test(t)) qaPassed += 1;
    } catch { /* ignore */ }
  }

  const phase = meta.phase || 'market';
  const phaseIndex = Math.max(0, PHASES.indexOf(phase));
  const percent = Math.round((phaseIndex / (PHASES.length - 1)) * 100);

  let stat = null;
  try { stat = await fs.stat(dir); } catch { /* ignore */ }

  return {
    slug,
    title: meta.title || slug,
    subtitle: meta.subtitle || '',
    genre: meta.genre || 'unknown',
    topic: meta.topic || '',
    phase,
    percent,
    status: meta.status || (base === ARCHIVE_DIR ? 'archived' : 'active'),
    chapterCount: chapters.length,
    qaPassed,
    wordCount: words,
    currentCheckpoint: decisions.currentCheckpoint || phase,
    awaitingApproval: Boolean(decisions.awaitingApproval),
    created: meta.created || null,
    updated: meta.updated || (stat ? stat.mtime.toISOString() : null),
  };
}

async function rebuildLibrary() {
  await fs.mkdir(BOOKS_DIR, { recursive: true });
  const entries = (await listDirSafe(BOOKS_DIR))
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'));

  const books = [];
  for (const e of entries) books.push(await scanBook(e.name));

  const archived = [];
  for (const e of await listDirSafe(ARCHIVE_DIR)) {
    if (e.isDirectory()) archived.push(await scanBook(e.name, ARCHIVE_DIR));
  }

  const library = {
    generated: nowISO(),
    note: 'Cache. books/ is the source of truth — this file is rebuilt by scanning it.',
    books: books.sort((a, b) => String(b.updated).localeCompare(String(a.updated))),
    archived,
  };
  await writeJSON(LIBRARY, library);
  return library;
}

/* ---------------------------------------------------------------------------
 * Book scaffolding
 * ------------------------------------------------------------------------- */

async function copyTemplate(name, dest, vars = {}) {
  const src = path.join(TEMPLATES_DIR, name);
  if (!exists(src)) return false;
  let text = await fs.readFile(src, 'utf8');
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{{${k}}}`, v);
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, text, 'utf8');
  return true;
}

async function scaffoldBook({ title, genre, topic, subtitle = '' }) {
  const slug = slugify(title);
  const dir = path.join(BOOKS_DIR, slug);
  if (exists(dir)) throw httpError(409, `books/${slug} already exists`);

  for (const sub of ['market', 'research', 'manuscript', 'qa', 'export']) {
    await fs.mkdir(path.join(dir, sub), { recursive: true });
  }

  const vars = { TITLE: title, SLUG: slug, DATE: nowISO().slice(0, 10) };
  await copyTemplate('book-brief.md', path.join(dir, 'brief.md'), vars);
  await copyTemplate('voice-spec.md', path.join(dir, 'voice-spec.md'), vars);
  await copyTemplate('citations.md', path.join(dir, 'citations.md'), vars);
  await copyTemplate('qa-rubric.md', path.join(dir, 'qa', 'rubric.md'), vars);
  await copyTemplate('kdp-metadata.md', path.join(dir, 'export', 'metadata.md'), vars);
  await copyTemplate(
    genre === 'fiction' ? 'outline-fiction.md' : 'outline-selfhelp.md',
    path.join(dir, 'outline.md'),
    vars,
  );

  const meta = {
    slug,
    title,
    subtitle,
    genre,
    topic,
    phase: 'market',
    status: 'active',
    created: nowISO(),
    updated: nowISO(),
    kdp: { keywords: [], categories: [], comps: [], blurb: '', trim: '6x9' },
  };
  await writeJSON(path.join(dir, 'meta.json'), meta);
  await writeJSON(path.join(dir, 'decisions.json'), {
    slug,
    currentCheckpoint: 'market',
    awaitingApproval: false,
    decisions: [],
  });
  await fs.writeFile(
    path.join(dir, 'history.log'),
    `${nowISO()}  KICKOFF  "${title}" (${genre}) — ${topic}\n`,
    'utf8',
  );

  await rebuildLibrary();
  return { slug, meta };
}

/* ---------------------------------------------------------------------------
 * Citations parsing — for the sortable research table
 * ------------------------------------------------------------------------- */

function parseCitations(md) {
  const out = [];
  const blocks = String(md).split(/^### /m).slice(1);
  for (const block of blocks) {
    const idMatch = block.match(/^\[(C-[\w-]+)\]\s*(.*)/);
    if (!idMatch) continue;
    const field = (name) => {
      const re = new RegExp(`^-\\s*\\*\\*${name}:?\\*\\*\\s*(.*)$`, 'im');
      const m = block.match(re);
      return m ? m[1].trim() : '';
    };
    const confidence = field('Confidence');
    out.push({
      id: idMatch[1],
      label: idMatch[2].trim(),
      claim: field('Claim'),
      source: field('Source'),
      author: field('Author / Publisher') || field('Author'),
      date: field('Date'),
      url: (field('URL').match(/https?:\/\/\S+/) || [''])[0],
      tier: field('Tier'),
      confidence,
      usedIn: field('Used in'),
      unverified: /unverified/i.test(confidence) || /^low\b/i.test(confidence),
    });
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Routes — library
 * ------------------------------------------------------------------------- */

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', (_req, res) => res.json({ ok: true, root: ROOT }));

app.get('/api/tools', wrap(async (_req, res) => {
  res.json({ tools: await detectTools(), hints: INSTALL_HINTS, platform: process.platform });
}));

app.get('/api/library', wrap(async (_req, res) => res.json(await rebuildLibrary())));

app.post('/api/books', wrap(async (req, res) => {
  const { title, genre, topic, subtitle } = req.body || {};
  if (!title || !String(title).trim()) throw httpError(400, 'title is required');
  if (!['selfhelp', 'fiction', 'journal'].includes(genre)) {
    throw httpError(400, 'genre must be selfhelp, fiction, or journal');
  }
  const result = await scaffoldBook({
    title: String(title).trim(),
    genre,
    topic: String(topic || '').trim(),
    subtitle: String(subtitle || '').trim(),
  });
  res.status(201).json(result);
}));

/* ---------------------------------------------------------------------------
 * Routes — a single book
 * ------------------------------------------------------------------------- */

app.get('/api/books/:slug', wrap(async (req, res) => {
  const { slug } = req.params;
  const dir = bookDir(slug);
  if (!exists(dir)) throw httpError(404, 'Book not found');
  res.json({
    ...(await scanBook(slug)),
    meta: await readJSON(path.join(dir, 'meta.json'), {}),
    decisions: await readJSON(path.join(dir, 'decisions.json'), {}),
    phases: PHASES,
  });
}));

/** Full file tree for the book, for the file navigator. */
app.get('/api/books/:slug/files', wrap(async (req, res) => {
  const dir = bookDir(req.params.slug);
  if (!exists(dir)) throw httpError(404, 'Book not found');

  const walk = async (abs, rel = '') => {
    const out = [];
    for (const e of await listDirSafe(abs)) {
      if (e.name.startsWith('.')) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        out.push({ type: 'dir', path: r, name: e.name, children: await walk(path.join(abs, e.name), r) });
      } else {
        const st = await fs.stat(path.join(abs, e.name));
        out.push({ type: 'file', path: r, name: e.name, size: st.size, mtime: st.mtime.toISOString() });
      }
    }
    return out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  };

  res.json({ slug: req.params.slug, tree: await walk(dir) });
}));

/** Read one file. */
app.get('/api/books/:slug/file', wrap(async (req, res) => {
  const target = bookFile(req.params.slug, req.query.path);
  if (!exists(target)) throw httpError(404, 'File not found');
  const content = await fs.readFile(target, 'utf8');
  res.json({ path: req.query.path, content, words: countWords(content) });
}));

/** Write one file. Manuscript edits made here are authoritative — the Producer re-reads them. */
app.put('/api/books/:slug/file', wrap(async (req, res) => {
  const { slug } = req.params;
  const relPath = req.query.path;
  const target = bookFile(slug, relPath);
  const content = typeof req.body === 'string' ? req.body : req.body?.content;
  if (typeof content !== 'string') throw httpError(400, 'content (string) is required');

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
  await appendHistory(slug, `EDIT     ${relPath} (${countWords(content)} words) — via UI`);
  await touchBook(slug);
  res.json({ ok: true, path: relPath, words: countWords(content) });
}));

async function touchBook(slug) {
  const metaPath = path.join(bookDir(slug), 'meta.json');
  const meta = await readJSON(metaPath, null);
  if (meta) {
    meta.updated = nowISO();
    await writeJSON(metaPath, meta);
  }
  await rebuildLibrary();
}

/** Chapter list with per-chapter QA status, for the reader/editor navigator. */
app.get('/api/books/:slug/chapters', wrap(async (req, res) => {
  const { slug } = req.params;
  const dir = bookDir(slug);
  const names = manuscriptOrder(
    (await listDirSafe(path.join(dir, 'manuscript')))
      .filter((d) => d.isFile() && d.name.endsWith('.md'))
      .map((d) => d.name),
  );

  const chapters = [];
  for (const name of names) {
    const text = await fs.readFile(path.join(dir, 'manuscript', name), 'utf8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const num = (name.match(/ch(\d+)/i) || [])[1] || '';

    let qa = null;
    const qaFile = path.join(dir, 'qa', `ch${num}-report.md`);
    if (num && exists(qaFile)) {
      const q = await fs.readFile(qaFile, 'utf8');
      const v = q.match(/\*\*Verdict:\*\*\s*([A-Z()\s]+)/i);
      qa = { file: `qa/ch${num}-report.md`, verdict: v ? v[1].trim() : 'unknown' };
    }

    chapters.push({
      file: `manuscript/${name}`,
      name,
      number: num,
      title: titleMatch ? titleMatch[1].trim() : name.replace(/\.md$/, ''),
      words: countWords(text),
      status: (fm && (fm[1].match(/^status:\s*(.+)$/m) || [])[1]) || '',
      qa,
    });
  }
  res.json({ slug, chapters });
}));

/** Parsed citations, for the sortable research table. */
app.get('/api/books/:slug/citations', wrap(async (req, res) => {
  const file = path.join(bookDir(req.params.slug), 'citations.md');
  if (!exists(file)) return res.json({ entries: [], raw: '' });
  const raw = await fs.readFile(file, 'utf8');
  res.json({ entries: parseCitations(raw), raw });
}));

app.get('/api/books/:slug/history', wrap(async (req, res) => {
  const file = path.join(bookDir(req.params.slug), 'history.log');
  res.json({ lines: exists(file) ? (await fs.readFile(file, 'utf8')).trimEnd().split('\n') : [] });
}));

/* ---------------------------------------------------------------------------
 * Routes — checkpoints (the UI ↔ agent handshake)
 * ------------------------------------------------------------------------- */

/**
 * Record a checkpoint decision. This is the ONLY way the UI talks to the agents:
 * it writes the verdict to decisions.json, and the Producer reads it on its next turn.
 */
app.post('/api/books/:slug/decision', wrap(async (req, res) => {
  const { slug } = req.params;
  const { checkpoint, verdict, comment = '' } = req.body || {};
  if (!PHASES.includes(checkpoint)) throw httpError(400, `checkpoint must be one of ${PHASES.join(', ')}`);
  if (!['approved', 'changes_requested'].includes(verdict)) {
    throw httpError(400, 'verdict must be approved or changes_requested');
  }

  const file = path.join(bookDir(slug), 'decisions.json');
  const state = (await readJSON(file, null)) || { slug, currentCheckpoint: checkpoint, decisions: [] };

  state.decisions.push({ checkpoint, verdict, comment: String(comment), at: nowISO() });
  state.currentCheckpoint = checkpoint;
  // Cleared either way: an approval unblocks the next phase, a change request unblocks a rerun.
  state.awaitingApproval = false;
  await writeJSON(file, state);

  await appendHistory(slug, `DECISION ${checkpoint} → ${verdict}${comment ? ` — "${comment}"` : ''}`);
  await touchBook(slug);

  res.json({
    ok: true,
    state,
    next: 'Return to Claude Code and say "continue" — the Producer reads decisions.json first.',
  });
}));

/* ---------------------------------------------------------------------------
 * Routes — management (all plain file operations)
 * ------------------------------------------------------------------------- */

app.patch('/api/books/:slug', wrap(async (req, res) => {
  const { slug } = req.params;
  const metaPath = path.join(bookDir(slug), 'meta.json');
  const meta = await readJSON(metaPath, null);
  if (!meta) throw httpError(404, 'Book not found');

  for (const key of ['title', 'subtitle', 'topic', 'genre', 'phase', 'status']) {
    if (req.body?.[key] !== undefined) meta[key] = req.body[key];
  }
  if (req.body?.kdp) meta.kdp = { ...(meta.kdp || {}), ...req.body.kdp };
  meta.updated = nowISO();

  await writeJSON(metaPath, meta);
  await appendHistory(slug, `UPDATE   meta.json — ${Object.keys(req.body || {}).join(', ')}`);
  await rebuildLibrary();
  res.json({ ok: true, meta });
}));

app.post('/api/books/:slug/duplicate', wrap(async (req, res) => {
  const { slug } = req.params;
  const src = bookDir(slug);
  if (!exists(src)) throw httpError(404, 'Book not found');

  const newTitle = String(req.body?.title || `${slug} copy`).trim();
  const newSlug = slugify(newTitle);
  const dest = path.join(BOOKS_DIR, newSlug);
  if (exists(dest)) throw httpError(409, `books/${newSlug} already exists`);

  // Structure and voice carry over; drafts, QA, and exports do not.
  const structureOnly = Boolean(req.body?.structureOnly ?? true);
  await fs.cp(src, dest, { recursive: true });

  if (structureOnly) {
    for (const sub of ['manuscript', 'qa', 'export', 'research']) {
      await fs.rm(path.join(dest, sub), { recursive: true, force: true });
      await fs.mkdir(path.join(dest, sub), { recursive: true });
    }
    await copyTemplate('qa-rubric.md', path.join(dest, 'qa', 'rubric.md'), { TITLE: newTitle });
    await copyTemplate('kdp-metadata.md', path.join(dest, 'export', 'metadata.md'), { TITLE: newTitle });
  }

  const meta = (await readJSON(path.join(dest, 'meta.json'), {})) || {};
  Object.assign(meta, {
    slug: newSlug,
    title: newTitle,
    phase: structureOnly ? 'brief' : meta.phase,
    status: 'active',
    created: nowISO(),
    updated: nowISO(),
    duplicatedFrom: slug,
  });
  await writeJSON(path.join(dest, 'meta.json'), meta);
  await writeJSON(path.join(dest, 'decisions.json'), {
    slug: newSlug, currentCheckpoint: meta.phase, awaitingApproval: false, decisions: [],
  });
  await fs.writeFile(path.join(dest, 'history.log'), `${nowISO()}  DUPLICATE from ${slug}\n`, 'utf8');

  await rebuildLibrary();
  res.status(201).json({ ok: true, slug: newSlug });
}));

app.post('/api/books/:slug/archive', wrap(async (req, res) => {
  const { slug } = req.params;
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  const dest = path.join(ARCHIVE_DIR, path.basename(slug));
  if (exists(dest)) throw httpError(409, 'A book with that slug is already archived');
  await fs.rename(bookDir(slug), dest);
  await rebuildLibrary();
  res.json({ ok: true, movedTo: `books/_archive/${slug}` });
}));

app.post('/api/books/:slug/unarchive', wrap(async (req, res) => {
  const { slug } = req.params;
  const src = bookDir(slug, ARCHIVE_DIR);
  if (!exists(src)) throw httpError(404, 'Not in archive');
  const dest = path.join(BOOKS_DIR, path.basename(slug));
  if (exists(dest)) throw httpError(409, 'An active book already uses that slug');
  await fs.rename(src, dest);
  await rebuildLibrary();
  res.json({ ok: true });
}));

/** Soft delete only — moves to books/_trash/, never unlinks. */
app.delete('/api/books/:slug', wrap(async (req, res) => {
  const { slug } = req.params;
  const src = bookDir(slug);
  if (!exists(src)) throw httpError(404, 'Book not found');
  await fs.mkdir(TRASH_DIR, { recursive: true });
  const stamp = nowISO().replace(/[:.]/g, '-');
  const dest = path.join(TRASH_DIR, `${path.basename(slug)}--${stamp}`);
  await fs.rename(src, dest);
  await rebuildLibrary();
  res.json({ ok: true, movedTo: `books/_trash/${path.basename(dest)}`, note: 'Nothing was deleted from disk.' });
}));

/** Zip the whole book folder for backup. */
app.post('/api/books/:slug/backup', wrap(async (req, res) => {
  const { slug } = req.params;
  const dir = bookDir(slug);
  if (!exists(dir)) throw httpError(404, 'Book not found');
  const outDir = path.join(dir, 'export');
  await fs.mkdir(outDir, { recursive: true });
  const zipName = `${slug}-backup.zip`;
  const zipPath = path.join(outDir, zipName);
  await fs.rm(zipPath, { force: true });

  try {
    // -x excludes the zip itself from a rerun's archive.
    await execFileAsync('zip', ['-r', '-q', zipPath, '.', '-x', `export/${zipName}`], { cwd: dir });
  } catch (e) {
    throw httpError(500, `zip failed: ${e.message}`);
  }
  await appendHistory(slug, `BACKUP   export/${zipName}`);
  res.json({ ok: true, file: `export/${zipName}`, download: `/api/books/${slug}/download?path=export/${zipName}` });
}));

/** Absolute path, so the UI can offer a "Reveal in folder" hint. */
app.get('/api/books/:slug/reveal', wrap(async (req, res) => {
  res.json({ path: bookDir(req.params.slug) });
}));

/* ---------------------------------------------------------------------------
 * Routes — export
 * ------------------------------------------------------------------------- */

app.post('/api/books/:slug/export', wrap(async (req, res) => {
  const { slug } = req.params;
  const dir = bookDir(slug);
  if (!exists(dir)) throw httpError(404, 'Book not found');

  const format = String(req.body?.format || 'all');
  const trim = String(req.body?.trim || '6x9');
  if (!['epub', 'docx', 'pdf', 'metadata', 'all'].includes(format)) {
    throw httpError(400, 'format must be epub, docx, pdf, metadata, or all');
  }

  const result = await runExport({ bookDir: dir, slug, format, trim, appDir: __dirname });
  await appendHistory(slug, `EXPORT   ${format} (${trim}) — ${result.ok ? 'ok' : 'FAILED'}`);
  await touchBook(slug);
  res.json(result);
}));

app.get('/api/books/:slug/download', wrap(async (req, res) => {
  const target = bookFile(req.params.slug, req.query.path);
  if (!exists(target)) throw httpError(404, 'File not found');
  res.download(target);
}));

/* ---------------------------------------------------------------------------
 * Static frontend + error handling
 * ------------------------------------------------------------------------- */

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[book-factory]', err);
  res.status(status).json({ error: err.message || 'Server error' });
});

await fs.mkdir(BOOKS_DIR, { recursive: true });
await rebuildLibrary();

app.listen(PORT, () => {
  console.log(`\n  Book Factory control panel`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → books:  ${BOOKS_DIR}\n`);
  detectTools().then((tools) => {
    const missing = Object.entries(tools).filter(([, v]) => !v.installed).map(([k]) => k);
    if (missing.length) {
      console.log(`  Export toolchain missing: ${missing.join(', ')}`);
      console.log(`  Install: ${INSTALL_HINTS[process.platform] || INSTALL_HINTS.default}\n`);
    } else {
      console.log(`  Export toolchain: all present\n`);
    }
  });
});
