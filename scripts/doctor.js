#!/usr/bin/env node
/**
 * Book Factory — preflight.
 *
 *   npm run doctor
 *
 * Checks that the factory is actually runnable, and that each book is in the state its phase
 * claims. Written to be honest about the difference between:
 *
 *   ✗ BROKEN   — the system will not work; fix before doing anything
 *   ⚠ DEGRADED — some capability is missing; the system runs without it
 *   · NOTE     — a launch-gate item that is the author's call, not a defect
 *
 * Exit code is non-zero only for BROKEN. A book that needs an author decision is not a failure.
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { detectTools, INSTALL_HINTS } from '../app/export/build.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOKS = path.join(ROOT, 'books');

const exists = (p) => fsSync.existsSync(p);
const readJSON = async (p, d = null) => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return d; } };

const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', blue: '\x1b[36m' };
const broken = [];
const degraded = [];

const ok = (m, d = '') => console.log(`  ${C.green}✓${C.reset} ${m}${d ? ` ${C.dim}${d}${C.reset}` : ''}`);
const bad = (m, fix) => { broken.push({ m, fix }); console.log(`  ${C.red}✗${C.reset} ${C.bold}${m}${C.reset}\n      ${C.dim}fix:${C.reset} ${fix}`); };
const warn = (m, fix) => { degraded.push({ m, fix }); console.log(`  ${C.yellow}⚠${C.reset} ${m}${fix ? `\n      ${C.dim}fix:${C.reset} ${fix}` : ''}`); };
const note = (m) => console.log(`  ${C.dim}·${C.reset} ${C.dim}${m}${C.reset}`);
const head = (t) => console.log(`\n${C.bold}${t}${C.reset}\n${C.dim}${'─'.repeat(t.length)}${C.reset}`);

/* --- 1. Runtime + dependencies ------------------------------------------- */

head('Runtime');

const major = Number(process.versions.node.split('.')[0]);
if (major >= 18) ok(`node ${process.versions.node}`);
else bad(`node ${process.versions.node} is too old`, 'Install Node 18 or newer.');

// pdfkit lives at the ROOT because book-local interior generators resolve up the tree from
// books/<slug>/export/. Installing only in app/ leaves fixed-layout books broken — which is
// exactly the trap a clean clone falls into.
try {
  require.resolve('pdfkit');
  ok('pdfkit (root)', 'fixed-layout interior generators');
} catch {
  bad('pdfkit is not installed at the repo root', 'npm run setup   (or: npm install)');
}

try {
  require.resolve(path.join(ROOT, 'app', 'node_modules', 'express'));
  ok('express (app/)', 'control panel');
} catch {
  bad('express is not installed in app/', 'npm run setup   (or: npm --prefix app install)');
}

/* --- 2. Factory files ----------------------------------------------------- */

head('Factory');

const AGENTS = ['producer', 'market-scout', 'researcher', 'voice-architect',
  'storyboarder', 'writer', 'editor', 'qa', 'cover-spec'];
const missingAgents = AGENTS.filter((a) => !exists(path.join(ROOT, '.claude/agents', `${a}.md`)));
if (!missingAgents.length) ok(`${AGENTS.length} agent definitions`);
else bad(`missing agents: ${missingAgents.join(', ')}`, 'git checkout .claude/agents/');

const TEMPLATES = ['book-brief', 'voice-spec', 'outline-selfhelp', 'outline-fiction',
  'chapter-template', 'citations', 'qa-rubric', 'kdp-metadata', 'source-coverage'];
const missingTemplates = TEMPLATES.filter((t) => !exists(path.join(ROOT, 'templates', `${t}.md`)));
if (!missingTemplates.length) ok(`${TEMPLATES.length} templates`);
else bad(`missing templates: ${missingTemplates.join(', ')}`, 'git checkout templates/');

for (const f of ['CLAUDE.md', 'README.md', 'app/server.js', 'app/export/build.js',
  'app/export/cover-spec.js', 'app/export/epub.css', 'app/export/print.css']) {
  if (!exists(path.join(ROOT, f))) bad(`missing ${f}`, `git checkout ${f}`);
}
if (!broken.length) ok('core files present');

/* --- 3. Export toolchain -------------------------------------------------- */

head('Export toolchain');

const tools = await detectTools();
for (const [name, t] of Object.entries(tools)) {
  if (t.installed) ok(name, t.version);
  else warn(`${name} missing — ${t.needed_for.join(', ')}`, null);
}
if (Object.values(tools).some((t) => !t.installed)) {
  console.log(`      ${C.dim}install:${C.reset} ${INSTALL_HINTS[process.platform] || INSTALL_HINTS.default}`);
  note('Fixed-layout books (journals) use their own generator and do not need these.');
}

/* --- 4. Books ------------------------------------------------------------- */

head('Books');

const slugs = exists(BOOKS)
  ? (await fs.readdir(BOOKS, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name)
  : [];

if (!slugs.length) {
  note('No books yet. Start one in Claude Code:');
  note('  Start a new book: <title> / <selfhelp|fiction|journal> / <topic>');
}

for (const slug of slugs) {
  const dir = path.join(BOOKS, slug);
  const meta = await readJSON(path.join(dir, 'meta.json'), {});
  const decisions = await readJSON(path.join(dir, 'decisions.json'), {});
  const interior = await readJSON(path.join(dir, 'export', 'interior-report.json'), null);

  console.log(`\n  ${C.blue}${C.bold}${meta.title || slug}${C.reset} ${C.dim}(${slug}) — phase: ${meta.phase || '?'}${C.reset}`);

  const skipped = (decisions.decisions || []).filter((d) => d.verdict === 'skipped').map((d) => d.checkpoint);
  if (skipped.length) note(`skipped phases: ${skipped.join(', ')}`);
  if (decisions.awaitingApproval) note(`awaiting your decision at checkpoint: ${decisions.currentCheckpoint}`);

  // Interior integrity — the one thing that must never silently regress.
  if (interior) {
    const parity = interior.parityErrors?.length ?? 0;
    if (parity === 0) ok(`interior: ${interior.pages}pp, ${interior.spreads}/${interior.prompts} spreads, 0 parity errors`);
    else bad(`${slug}: ${parity} facing-page parity errors — the spread mechanic is broken`,
      `node books/${slug}/export/build-interior.js`);

    if (interior.pages % 2 !== 0) warn(`${slug}: ${interior.pages} pages is odd — KDP requires an even count`, 'rebuild the interior');

    // System fonts are fine for proofing and NOT licensed for commercial print.
    const sysFont = (interior.warnings || []).some((w) => /system font/i.test(w));
    if (sysFont) note('interior embeds a system font — fine to proof, swap for an OFL font before publishing');
  }

  // Placeholders that must not reach print.
  const placeholders = [];
  for (const rel of ['manuscript/front-matter.md', 'manuscript/back-matter.md', 'meta.json']) {
    const f = path.join(dir, rel);
    if (!exists(f)) continue;
    const text = await fs.readFile(f, 'utf8');
    for (const ph of ['[AUTHOR NAME]', '[ISBN]', '[AUTHOR CONTACT']) {
      if (text.includes(ph) && !placeholders.includes(ph)) placeholders.push(ph);
    }
  }
  if (placeholders.length) note(`unfilled placeholders: ${placeholders.join(', ')} — your call, blocks upload only`);

  // Open source-gaps the author still owes.
  let openGaps = 0;
  const msDir = path.join(dir, 'manuscript');
  if (exists(msDir)) {
    for (const f of await fs.readdir(msDir)) {
      if (!f.endsWith('.md')) continue;
      openGaps += ((await fs.readFile(path.join(msDir, f), 'utf8')).match(/\[NEEDS SOURCE:/gi) || []).length;
    }
  }
  if (openGaps) warn(`${slug}: ${openGaps} open [NEEDS SOURCE] marker(s)`, 'supply a source, or rule that the claim is softened or cut');

  // QA verdict.
  const finalQa = path.join(dir, 'qa', 'final-report.md');
  if (exists(finalQa)) {
    const v = (await fs.readFile(finalQa, 'utf8')).match(/\*\*Verdict:\*\*\s*([A-Z()\s]+)/i);
    const verdict = v ? v[1].trim() : 'unknown';
    if (/^PASS/i.test(verdict)) ok(`full-manuscript QA: ${verdict}`);
    else warn(`${slug}: full-manuscript QA is ${verdict}`, 'nothing ships on a failed gate');
  }

  // Cover spec staleness — the spine is a function of the page count.
  const coverSpec = await readJSON(path.join(dir, 'export', 'cover-spec.json'), null);
  if (coverSpec && interior && coverSpec.input?.pages !== interior.pages) {
    warn(`${slug}: cover spec was built for ${coverSpec.input?.pages}pp but the interior is now ${interior.pages}pp`,
      `node app/export/cover-spec.js --pages ${interior.pages} --trim ${interior.trim} --paper cream > books/${slug}/export/cover-spec.md`);
  } else if (coverSpec) {
    ok(`cover spec current (${coverSpec.input.pages}pp, spine ${coverSpec.spine.inches}")`);
  }
}

/* --- Summary -------------------------------------------------------------- */

head('Summary');

if (broken.length) {
  console.log(`  ${C.red}${C.bold}${broken.length} broken${C.reset} — the system will not work until these are fixed:`);
  broken.forEach((b) => console.log(`     ${C.dim}·${C.reset} ${b.m} → ${b.fix}`));
}
if (degraded.length) {
  console.log(`  ${C.yellow}${degraded.length} degraded${C.reset} — runs without these, some capability missing.`);
}
if (!broken.length && !degraded.length) {
  console.log(`  ${C.green}${C.bold}All clear.${C.reset}`);
}

console.log(`\n  ${C.dim}Start the control panel:${C.reset} npm start   ${C.dim}→ http://localhost:3000${C.reset}`);
console.log(`  ${C.dim}Start a book:${C.reset}            Start a new book: <title> / <genre> / <topic>\n`);

process.exit(broken.length ? 1 : 0);
