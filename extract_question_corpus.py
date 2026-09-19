import re
from pathlib import Path

import fitz

BASE_DIR = Path(r"c:\Users\Dell\OneDrive\Desktop\Workspace\Job Related\PQ")
OUTPUT = BASE_DIR / "question_bank_corpus.md"


def clean(text: str) -> str:
    lines = []
    for line in text.replace("\r", "\n").splitlines():
        value = re.sub(r"\s+", " ", line).strip()
        if value:
            lines.append(value)
    return "\n".join(lines)


def extract_blocks(text: str):
    matches = list(re.finditer(r"(?i)\bQ\s*\d+\b", text))
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        block = text[match.start():end].strip()
        if len(block) >= 30:
            yield block


def main():
    pdfs = sorted(BASE_DIR.glob("*.pdf"))
    lines = ["# Consolidated Question Bank", "", f"Source PDFs: {len(pdfs)}", ""]
    total = 0

    for pdf_path in pdfs:
        document = fitz.open(pdf_path)
        lines.extend([f"## {pdf_path.name}", ""])
        page_texts = [clean(page.get_text("text")) for page in document]
        full_text = "\n\f\n".join(page_texts)
        for block in extract_blocks(full_text):
            total += 1
            question_start = full_text.find(block)
            source_page = full_text[:question_start].count("\f") + 1
            lines.extend([f"### Question {total}", f"Source page: {source_page}", "", block, ""])

    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"PDF files: {len(pdfs)}")
    print(f"Extracted question entries: {total}")
    print(f"Output: {OUTPUT}")


if __name__ == "__main__":
    main()
