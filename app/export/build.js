/**
 * Book Factory — export orchestration.
 *
 * Turns books/<slug>/manuscript/*.md into the three formats KDP accepts:
 *   • EPUB          — the primary Kindle ebook upload (pandoc)
 *   • DOCX          — clean Word manuscript, also KDP-accepted (pandoc)
 *   • Print PDF     — paperback interior at a real trim size (pandoc → HTML → weasyprint/
 *                     wkhtmltopdf, or calibre ebook-convert as a fallback)
 *   • Metadata pack — metadata.md + blurb.txt + keywords.txt
 *
 * Design rules:
 *   1. Never fail silently. If a tool is missing, say which one and give the install command.
 *   2. Validate the EPUB after building and surface errors.
 *   3. Fixed-layout books (journals/workbooks) cannot be expressed as markdown→PDF — ruled
 *      write-in areas, facing-page spreads, and fixed pagination need real layout control. If a
 *      book ships its own books/<slug>/export/build-interior.js, we delegate the print PDF to it.
 *
 * Usage as a CLI:
 *   node export/build.js --doctor
 *   node export/build.js --book ../books/tether --format all --trim 6x9
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------------------
 * Toolchain detection
 * ------------------------------------------------------------------------- */

export const INSTALL_HINTS = {
  darwin: 'brew install pandoc calibre  # and: brew install weasyprint (or use calibre for PDF)',
  linux: 'sudo apt-get install -y pandoc calibre weasyprint',
  win32: 'winget install --id JohnMacFarlane.Pandoc && winget install --id calibre.calibre',
  default: 'Install pandoc + calibre (and optionally weasyprint) from their project sites.',
};

/** Tools we look for, and what breaks without each. */
const TOOLCHAIN = [
  { key: 'pandoc', cmd: 'pandoc', args: ['--version'], needed_for: ['epub', 'docx', 'pdf'] },
  { key: 'ebook-convert', cmd: 'ebook-convert', args: ['--version'], needed_for: ['pdf (fallback)', 'epub validation'] },
  { key: 'weasyprint', cmd: 'weasyprint', args: ['--version'], needed_for: ['pdf (preferred)'] },
  { key: 'wkhtmltopdf', cmd: 'wkhtmltopdf', args: ['--version'], needed_for: ['pdf (alternate)'] },
  { key: 'epubcheck', cmd: 'epubcheck', args: ['--version'], needed_for: ['epub validation'] },
];

async function which(cmd, args) {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, { timeout: 15000 });
    const version = String(stdout || stderr).split('\n')[0].trim();
    return { installed: true, version };
  } catch {
    return { installed: false, version: null };
  }
}

export async function detectTools() {
  const out = {};
  await Promise.all(TOOLCHAIN.map(async (t) => {
    out[t.key] = { ...(await which(t.cmd, t.args)), needed_for: t.needed_for };
  }));
  return out;
}

/** The first available PDF engine, in preference order. */
function pickPdfEngine(tools) {
  if (tools.weasyprint?.installed) return 'weasyprint';
  if (tools.wkhtmltopdf?.installed) return 'wkhtmltopdf';
  if (tools['ebook-convert']?.installed) return 'ebook-convert';
  return null;
}

function missingToolMessage(names) {
  const hint = INSTALL_HINTS[process.platform] || INSTALL_HINTS.default;
  return `Missing required tool(s): ${names.join(', ')}.\nInstall with:\n  ${hint}`;
}

/* ---------------------------------------------------------------------------
 * Manuscript assembly
 * ------------------------------------------------------------------------- */

const exists = (p) => fsSync.existsSync(p);
const readIf = async (p) => (exists(p) ? fs.readFile(p, 'utf8') : '');

/** Strip YAML front matter, HTML comments, and any leftover writer scaffolding. */
function cleanChapter(md) {
  return String(md)
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\n/, '')
    .trimEnd();
}

/**
 * Concatenate front matter + chapters + back matter into one markdown file.
 * Chapter order is filename order, which is why chapters are named chNN-*.md.
 */
export async function assembleManuscript(bookDir) {
  const msDir = path.join(bookDir, 'manuscript');
  if (!exists(msDir)) throw new Error(`No manuscript/ directory in ${bookDir}`);

  const all = (await fs.readdir(msDir)).filter((f) => f.endsWith('.md')).sort();
  const front = all.filter((f) => /front[-_]?matter/i.test(f));
  const back = all.filter((f) => /back[-_]?matter/i.test(f));
  const chapters = all.filter((f) => !front.includes(f) && !back.includes(f));

  const parts = [];
  for (const f of [...front, ...chapters, ...back]) {
    const body = cleanChapter(await fs.readFile(path.join(msDir, f), 'utf8'));
    if (body.trim()) parts.push(body);
  }
  if (!parts.length) throw new Error('Manuscript is empty — nothing to export.');

  return {
    markdown: parts.join('\n\n\\newpage\n\n'),
    chapterCount: chapters.length,
    files: [...front, ...chapters, ...back],
  };
}

/** Pandoc metadata block, driven by meta.json. */
async function buildMetadataYaml(bookDir) {
  let meta = {};
  try { meta = JSON.parse(await fs.readFile(path.join(bookDir, 'meta.json'), 'utf8')); } catch { /* defaults */ }
  const esc = (s) => `"${String(s || '').replace(/"/g, '\\"')}"`;
  const lines = [
    '---',
    `title: ${esc(meta.title || meta.slug || 'Untitled')}`,
    meta.subtitle ? `subtitle: ${esc(meta.subtitle)}` : null,
    `author: ${esc(meta.author || meta.kdp?.author || '')}`,
    `lang: ${esc(meta.language || 'en-US')}`,
    `date: ${esc(new Date().getFullYear())}`,
    meta.kdp?.blurb ? `description: ${esc(meta.kdp.blurb.slice(0, 400))}` : null,
    'toc-title: "Contents"',
    '---',
    '',
  ].filter(Boolean);
  return { yaml: lines.join('\n'), meta };
}

/* ---------------------------------------------------------------------------
 * Trim sizes
 * ------------------------------------------------------------------------- */

/**
 * KDP paperback interiors. Gutter grows with page count; these are safe defaults for
 * 150–300 page books. Confirm against KDP's margin table before publishing a long book.
 */
export const TRIMS = {
  '5x8':     { w: 5,   h: 8,   inside: 0.75, outside: 0.5,  top: 0.6, bottom: 0.6 },
  '5.5x8.5': { w: 5.5, h: 8.5, inside: 0.8,  outside: 0.55, top: 0.6, bottom: 0.6 },
  '6x9':     { w: 6,   h: 9,   inside: 0.85, outside: 0.6,  top: 0.7, bottom: 0.7 },
};

/* ---------------------------------------------------------------------------
 * Individual exporters
 * ------------------------------------------------------------------------- */

async function exportEpub({ bookDir, outDir, appDir, tools }) {
  if (!tools.pandoc.installed) return { ok: false, error: missingToolMessage(['pandoc']) };

  const { markdown } = await assembleManuscript(bookDir);
  const { yaml } = await buildMetadataYaml(bookDir);
  const src = path.join(outDir, '.build.epub.md');
  await fs.writeFile(src, yaml + markdown, 'utf8');

  const out = path.join(outDir, 'book.epub');
  const css = path.join(appDir, 'export', 'epub.css');
  const cover = ['cover.jpg', 'cover.png'].map((f) => path.join(bookDir, 'export', f)).find(exists);

  const args = [
    src, '-o', out,
    '--from', 'markdown+smart',
    '--to', 'epub3',
    '--toc', '--toc-depth=2',
    '--split-level=1',
    '--css', css,
  ];
  if (cover) args.push('--epub-cover-image', cover);

  try {
    await execFileAsync('pandoc', args, { cwd: bookDir, timeout: 180000 });
  } catch (e) {
    return { ok: false, error: `pandoc failed: ${e.stderr || e.message}` };
  } finally {
    await fs.rm(src, { force: true });
  }

  const validation = await validateEpub(out, tools);
  return {
    ok: true,
    file: 'export/book.epub',
    bytes: (await fs.stat(out)).size,
    cover: cover ? path.basename(cover) : null,
    validation,
    warnings: cover ? [] : ['No cover image found. Drop cover.jpg into export/ to embed one.'],
  };
}

/** Validate with epubcheck if present, else fall back to calibre's parser. */
async function validateEpub(file, tools) {
  if (tools.epubcheck?.installed) {
    try {
      await execFileAsync('epubcheck', [file], { timeout: 120000 });
      return { ran: true, tool: 'epubcheck', valid: true, messages: [] };
    } catch (e) {
      const text = String(e.stdout || '') + String(e.stderr || '');
      return {
        ran: true,
        tool: 'epubcheck',
        valid: false,
        messages: text.split('\n').filter((l) => /ERROR|WARNING/.test(l)).slice(0, 40),
      };
    }
  }
  if (tools['ebook-convert']?.installed) {
    try {
      await execFileAsync('ebook-meta', [file], { timeout: 60000 });
      return { ran: true, tool: 'ebook-meta', valid: true, messages: ['Parsed by calibre. Install epubcheck for a full conformance check.'] };
    } catch (e) {
      return { ran: true, tool: 'ebook-meta', valid: false, messages: [String(e.message).slice(0, 500)] };
    }
  }
  return { ran: false, tool: null, valid: null, messages: ['No validator installed. `brew install epubcheck` for full EPUB conformance checking.'] };
}

async function exportDocx({ bookDir, outDir, tools }) {
  if (!tools.pandoc.installed) return { ok: false, error: missingToolMessage(['pandoc']) };

  const { markdown } = await assembleManuscript(bookDir);
  const { yaml } = await buildMetadataYaml(bookDir);
  const src = path.join(outDir, '.build.docx.md');
  await fs.writeFile(src, yaml + markdown, 'utf8');

  const out = path.join(outDir, 'book.docx');
  const reference = path.join(bookDir, 'export', 'reference.docx');
  const args = [src, '-o', out, '--from', 'markdown+smart', '--to', 'docx', '--toc', '--toc-depth=2'];
  if (exists(reference)) args.push('--reference-doc', reference);

  try {
    await execFileAsync('pandoc', args, { cwd: bookDir, timeout: 180000 });
  } catch (e) {
    return { ok: false, error: `pandoc failed: ${e.stderr || e.message}` };
  } finally {
    await fs.rm(src, { force: true });
  }
  return { ok: true, file: 'export/book.docx', bytes: (await fs.stat(out)).size };
}

/**
 * Print interior.
 *
 * If the book ships its own build-interior.js, that wins — fixed-layout books (journals,
 * workbooks) need real layout control that markdown→PDF cannot give.
 */
async function exportPdf({ bookDir, slug, outDir, appDir, tools, trim }) {
  const custom = path.join(bookDir, 'export', 'build-interior.js');
  if (exists(custom)) {
    try {
      const mod = await import(`${custom}?t=${Date.now()}`);
      const fn = mod.buildInterior || mod.default;
      if (typeof fn !== 'function') {
        return { ok: false, error: `${slug}/export/build-interior.js exports no buildInterior() function.` };
      }
      const result = await fn({ bookDir, outDir, trim, TRIMS });
      return { ok: true, engine: 'book-local generator', custom: true, ...result };
    } catch (e) {
      return { ok: false, error: `book-local interior generator failed: ${e.stack || e.message}` };
    }
  }

  if (!tools.pandoc.installed) return { ok: false, error: missingToolMessage(['pandoc']) };
  const engine = pickPdfEngine(tools);
  if (!engine) {
    return { ok: false, error: missingToolMessage(['weasyprint (or wkhtmltopdf, or calibre)']) };
  }

  const t = TRIMS[trim] || TRIMS['6x9'];
  const { markdown } = await assembleManuscript(bookDir);
  const { yaml, meta } = await buildMetadataYaml(bookDir);

  // Trim-specific @page rules are injected ahead of print.css so one stylesheet serves all trims.
  const pageCss = [
    '@page {',
    `  size: ${t.w}in ${t.h}in;`,
    `  margin: ${t.top}in ${t.outside}in ${t.bottom}in ${t.inside}in;`,
    '}',
    '@page :left  {',
    `  margin-left: ${t.outside}in; margin-right: ${t.inside}in;`,
    `  @bottom-left  { content: counter(page); }`,
    `  @top-left     { content: "${(meta.title || '').replace(/"/g, '')}"; }`,
    '}',
    '@page :right {',
    `  margin-left: ${t.inside}in; margin-right: ${t.outside}in;`,
    `  @bottom-right { content: counter(page); }`,
    `  @top-right    { content: string(chaptertitle); }`,
    '}',
    '@page :first { @top-left { content: none } @top-right { content: none } }',
  ].join('\n');

  const printCss = await readIf(path.join(appDir, 'export', 'print.css'));
  const cssFile = path.join(outDir, '.build.print.css');
  await fs.writeFile(cssFile, `${pageCss}\n\n${printCss}`, 'utf8');

  const mdFile = path.join(outDir, '.build.pdf.md');
  await fs.writeFile(mdFile, yaml + markdown, 'utf8');

  const htmlFile = path.join(outDir, '.build.print.html');
  const out = path.join(outDir, `book-${trim}.pdf`);

  try {
    await execFileAsync('pandoc', [
      mdFile, '-o', htmlFile,
      '--from', 'markdown+smart', '--to', 'html5',
      '--standalone', '--toc', '--toc-depth=2',
      '--css', path.basename(cssFile),
      '--metadata', `title=${meta.title || slug}`,
    ], { cwd: outDir, timeout: 180000 });

    if (engine === 'weasyprint') {
      await execFileAsync('weasyprint', [htmlFile, out], { cwd: outDir, timeout: 300000 });
    } else if (engine === 'wkhtmltopdf') {
      await execFileAsync('wkhtmltopdf', [
        '--page-width', `${t.w}in`, '--page-height', `${t.h}in`,
        '--margin-top', `${t.top}in`, '--margin-bottom', `${t.bottom}in`,
        '--margin-left', `${t.inside}in`, '--margin-right', `${t.outside}in`,
        '--enable-local-file-access', htmlFile, out,
      ], { cwd: outDir, timeout: 300000 });
    } else {
      await execFileAsync('ebook-convert', [
        htmlFile, out,
        '--paper-size', 'letter',
        `--custom-size=${t.w}x${t.h}`,
        '--unit', 'inch',
        `--pdf-page-margin-top=${t.top * 72}`,
        `--pdf-page-margin-bottom=${t.bottom * 72}`,
        `--pdf-page-margin-left=${t.inside * 72}`,
        `--pdf-page-margin-right=${t.outside * 72}`,
        '--pdf-page-numbers',
      ], { cwd: outDir, timeout: 300000 });
    }
  } catch (e) {
    return { ok: false, error: `PDF build failed (${engine}): ${e.stderr || e.message}` };
  } finally {
    await fs.rm(mdFile, { force: true });
    await fs.rm(htmlFile, { force: true });
    await fs.rm(cssFile, { force: true });
  }

  return {
    ok: true,
    file: `export/book-${trim}.pdf`,
    engine,
    trim,
    bytes: (await fs.stat(out)).size,
    warnings: engine === 'ebook-convert'
      ? ['calibre does not do mirrored margins. For a paperback with a real gutter, install weasyprint.']
      : [],
  };
}

/** Split metadata.md into the paste-ready side files. */
async function exportMetadata({ bookDir, outDir }) {
  const mdPath = path.join(outDir, 'metadata.md');
  if (!exists(mdPath)) {
    return { ok: false, error: 'export/metadata.md not found. The Producer writes it during the export phase.' };
  }
  const md = await fs.readFile(mdPath, 'utf8');
  const written = ['export/metadata.md'];

  // Blurb: the fenced block under "Book description".
  const blurb = md.match(/##\s*3\.\s*Book description[\s\S]*?```(?:\w*)?\n([\s\S]*?)```/i);
  if (blurb) {
    await fs.writeFile(path.join(outDir, 'blurb.txt'), blurb[1].trim() + '\n', 'utf8');
    written.push('export/blurb.txt');
  }

  // Keywords: the table rows under "Backend keywords".
  const kwSection = md.match(/##\s*4\.\s*Backend keywords[\s\S]*?(?=\n##\s|\n---)/i);
  if (kwSection) {
    const rows = [...kwSection[0].matchAll(/^\|\s*\d+\s*\|\s*([^|]+?)\s*\|/gm)].map((m) => m[1].trim());
    const keywords = rows.filter((k) => k && !/^-+$/.test(k));
    if (keywords.length) {
      await fs.writeFile(path.join(outDir, 'keywords.txt'), keywords.join('\n') + '\n', 'utf8');
      written.push('export/keywords.txt');
    }
  }

  let meta = {};
  try { meta = JSON.parse(await fs.readFile(path.join(bookDir, 'meta.json'), 'utf8')); } catch { /* ignore */ }
  const warnings = [];
  if (!blurb) warnings.push('No blurb found — metadata.md §3 needs a fenced code block with the description.');
  if (!meta.kdp?.categories?.length) warnings.push('meta.json has no KDP categories set.');

  return { ok: true, files: written, warnings };
}

/* ---------------------------------------------------------------------------
 * Orchestrator
 * ------------------------------------------------------------------------- */

export async function runExport({ bookDir, slug, format = 'all', trim = '6x9', appDir }) {
  const outDir = path.join(bookDir, 'export');
  await fs.mkdir(outDir, { recursive: true });
  const tools = await detectTools();
  appDir = appDir || path.resolve(__dirname, '..');

  const results = {};
  const run = {
    epub: () => exportEpub({ bookDir, outDir, appDir, tools }),
    docx: () => exportDocx({ bookDir, outDir, tools }),
    pdf: () => exportPdf({ bookDir, slug, outDir, appDir, tools, trim }),
    metadata: () => exportMetadata({ bookDir, outDir }),
  };

  const targets = format === 'all' ? ['epub', 'docx', 'pdf', 'metadata'] : [format];
  for (const t of targets) {
    try {
      results[t] = await run[t]();
    } catch (e) {
      results[t] = { ok: false, error: e.stack || e.message };
    }
  }

  // "Export all" also zips the export folder for one-click download.
  if (format === 'all') {
    const zipName = `${slug}-kdp-package.zip`;
    try {
      await fs.rm(path.join(outDir, zipName), { force: true });
      await execFileAsync('zip', ['-r', '-q', zipName, '.', '-x', zipName], { cwd: outDir });
      results.zip = { ok: true, file: `export/${zipName}` };
    } catch (e) {
      results.zip = { ok: false, error: `zip failed: ${e.message}` };
    }
  }

  const failed = Object.entries(results).filter(([, r]) => !r.ok).map(([k]) => k);
  return {
    ok: failed.length === 0,
    slug,
    format,
    trim,
    results,
    failed,
    tools,
    installHint: failed.length ? (INSTALL_HINTS[process.platform] || INSTALL_HINTS.default) : null,
  };
}

/* ---------------------------------------------------------------------------
 * CLI
 * ------------------------------------------------------------------------- */

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  if (process.argv.includes('--doctor')) {
    const tools = await detectTools();
    console.log('\n  Export toolchain\n  ────────────────');
    for (const [k, v] of Object.entries(tools)) {
      console.log(`  ${v.installed ? '✓' : '✗'} ${k.padEnd(14)} ${v.installed ? v.version : `missing — needed for ${v.needed_for.join(', ')}`}`);
    }
    const missing = Object.entries(tools).filter(([, v]) => !v.installed);
    if (missing.length) console.log(`\n  Install:\n    ${INSTALL_HINTS[process.platform] || INSTALL_HINTS.default}\n`);
    else console.log('\n  All present.\n');
  } else {
    const book = arg('book');
    if (!book) {
      console.error('Usage: node export/build.js --book <path> [--format epub|docx|pdf|metadata|all] [--trim 6x9]');
      process.exit(1);
    }
    const dir = path.resolve(book);
    const result = await runExport({
      bookDir: dir,
      slug: path.basename(dir),
      format: arg('format', 'all'),
      trim: arg('trim', '6x9'),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
}
