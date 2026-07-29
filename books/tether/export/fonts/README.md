# Interior fonts — EB Garamond

**EB Garamond**, SIL Open Font License 1.1 (`OFL.txt`, shipped alongside as the license requires).
`fsType` is 0 — *Installable Embedding, no restriction* — so it is cleared for embedding in a
commercially distributed print book.

Static cuts from the upstream project (github.com/octaviopardo/EBGaramond12), not the
variable-font build Google Fonts now ships. That matters: pdfkit embeds a variable font's
**default instance only**, so a `[wght]` file would render "bold" at weight 400 and nobody would
notice until it was printed.

The interior generator finds these automatically — `resolveFonts()` prefers `export/fonts/` over
system fonts. Rebuild with:

    node books/tether/export/build-interior.js --trim 6x9

A clean build reports these three filenames and **no font warnings**. If the report says Georgia,
the files are missing or misnamed.

These are committed to the repo on purpose. Reproducing the exact print PDF matters more than
1.9 MB, and OFL explicitly permits redistribution when the license travels with the font.
