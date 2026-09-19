# Question Bank Quality Report

## Source bank

- PDF-derived source records: 730
- Verified practice records: 166
- Held for review: 564

## Verified practice rule

An item enters `public/verified-pdf-question-bank.json` only when:

- the prompt is non-empty
- at least three answer options were extracted
- the answer index is present in the source material
- the answer index points to an extracted option

No answer is guessed from the wording, position, or a generated model.

## Held-for-review reasons

The remaining source records include one or more of:

- missing answer key in the supplied PDF text
- choices represented as diagrams or images rather than text
- answer choices split across pages or merged with page numbers
- scanned pages requiring OCR interpretation and manual validation
- solution-booklet formatting where question text and explanation are interleaved

Those records remain in `public/pdf-question-bank.json` and `question_bank_corpus.md` for audit/review, but are not used in scored practice.

## OCR visuals

Tesseract processed 670 scanned pages. Original images for 72 question-like pages are preserved under `public/ocr-pages/`. OCR text is in `ocr_question_corpus.md`. These assets preserve diagrams and unusual shapes without pretending OCR has correctly interpreted them.
