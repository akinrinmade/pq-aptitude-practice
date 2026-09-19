# PDF Question Bank Audit

Date: 2026-09-19

## Source inventory

- PDF files: 32
- Total pages: 1,520
- Current high-confidence corpus entries: 730
- Unified app bank: 10,966 items
  - 730 extracted PDF items
  - 10,200 generated visual reasoning items
  - 36 generated technical items

## What was verified

- The original PDF set is present in the project folder.
- The consolidated source corpus was rebuilt from all 32 PDFs.
- Questions that continue across PDF pages are now joined before extraction.
- The first SHL share-price group has all five options restored.
- The SHL source table is preserved as `public/source-pages/shl-page-4.png` and displayed for the dependent questions.
- The production JSON contains the expected category distribution.

## Important source limitations

Six PDFs are image-only/scanned in their text layer and return no extractable text:

- `gtb second assessment.pdf`
- `Jobberman Access Physical 2.pdf`
- `Jobberman Access Physical 2 (1).pdf`
- `jobberman cognitive (1).pdf`
- `PRACTISE.pdf`
- most of `PWC-Verbal-Past-Question-and-Answer 2.pdf` is topic/list material rather than structured MCQs

Several KPMG solution booklets use numbered questions such as `1.` rather than `Q1`. Their pages combine question text, options, solutions, and explanations. They require a separate numbered-question parser to avoid treating solution prose as new questions.

## Result

The deployed bank is a faithful, high-confidence self-contained bank. The 730 PDF-derived entries are not claimed to represent every image-only or solution-booklet item. The visual and technical banks are clearly separated and labeled in the application.
