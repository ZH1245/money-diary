# PDF Export

This project supports report export to PDF with two template paths:

- Markdown template: `docs/pdf/report-template.md`
- HTML print template: `docs/pdf/report-template.html`

## Preferred Path

Use the HTML template for polished layout and stable print output.

1. Copy `report-template.html` and fill report data.
2. Open in a browser.
3. Print -> Save as PDF.

## Markdown to PDF Option

Use `md-to-pdf` when content is primarily textual:

```bash
pnpm dlx md-to-pdf docs/pdf/report-template.md
```

This generates a PDF next to the source markdown file.

## Recommendation

- Use HTML template for dashboard-like reports and tables.
- Use Markdown template for requirement docs and plain reports.
