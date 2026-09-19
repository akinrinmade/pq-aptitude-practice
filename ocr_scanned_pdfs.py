import json
import re
from pathlib import Path

import fitz
import pytesseract
from PIL import Image

BASE_DIR = Path(__file__).parent
OUTPUT = BASE_DIR / "ocr_question_corpus.md"
CHECKPOINT = BASE_DIR / "ocr_pages.jsonl"
OCR_FILES = [
    "gtb second assessment.pdf",
    "Jobberman Access Physical 2 (1).pdf",
    "Jobberman Access Physical 2.pdf",
    "jobberman cognitive (1).pdf",
    "PRACTISE.pdf",
    "PWC-Verbal-Past-Question-and-Answer 2.pdf",
]
TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT


def ocr_page(page):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.0, 1.0), colorspace=fitz.csGRAY, alpha=False)
    image = Image.frombytes("L", [pixmap.width, pixmap.height], pixmap.samples)
    return pytesseract.image_to_string(image, config="--psm 6")


def looks_like_question(text):
    return bool(re.search(r"(?im)^\s*(?:q\s*\d+|\d{1,3}[.)])\s+", text)) or "?" in text


def main():
    completed = {}
    if CHECKPOINT.exists():
        for line in CHECKPOINT.read_text(encoding="utf-8").splitlines():
            item = json.loads(line)
            completed[(item["file"], item["page"])] = item["text"]

    lines = ["# OCR Question Corpus", "", "Generated from image-only or low-text PDFs using Tesseract OCR.", ""]
    total_pages = 0
    question_pages = 0
    for filename in OCR_FILES:
        path = BASE_DIR / filename
        if not path.exists():
            continue
        document = fitz.open(path)
        lines.extend([f"## {filename}", ""])
        for page_number, page in enumerate(document, 1):
            total_pages += 1
            key = (filename, page_number)
            text = completed.get(key)
            if text is None:
                text = ocr_page(page)
                with CHECKPOINT.open("a", encoding="utf-8") as checkpoint:
                    checkpoint.write(json.dumps({"file": filename, "page": page_number, "text": text}, ensure_ascii=False) + "\n")
            if looks_like_question(text):
                question_pages += 1
            lines.extend([f"### Page {page_number}", "", text.strip(), ""])
            print(f"{filename}: page {page_number}/{len(document)}")
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"OCR pages: {total_pages}")
    print(f"Question-like pages: {question_pages}")
    print(f"Output: {OUTPUT}")


if __name__ == "__main__":
    main()
