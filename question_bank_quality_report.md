# Question Bank Quality Report

## Source bank

- PDF-derived source records: 730
- Verified practice records: 279 unique items
- Held for review: 451

## Verified practice rule

An item enters `public/verified-pdf-question-bank.json` only when:

- the prompt is non-empty
- at least three answer options were extracted, including True/False/Cannot Say formats
- the answer index is present in the source material
- the answer index points to an extracted option
- the normalized prompt is unique within the scored bank

No answer is guessed from the wording, position, or a generated model.

This is a source-integrity gate, not a substitute for expert human validation of every original publisher answer key. A zero-complaint guarantee cannot honestly be made from automated PDF extraction alone, especially where the source PDF contains charts, diagrams, OCR noise, or publisher errors.

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
