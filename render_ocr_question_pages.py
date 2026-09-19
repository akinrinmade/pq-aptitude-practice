import json
import re
from pathlib import Path

import fitz

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "public" / "ocr-pages"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def safe_name(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def main():
    rendered = 0
    for line in (BASE_DIR / "ocr_pages.jsonl").read_text(encoding="utf-8").splitlines():
        item = json.loads(line)
        text = item["text"]
        if not re.search(r"(?im)^\s*(?:q\s*\d+|\d{1,3}[.)])\s+", text) and "?" not in text:
            continue
        source = BASE_DIR / item["file"]
        document = fitz.open(source)
        page = document[item["page"] - 1]
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3), alpha=False)
        filename = f"{safe_name(item['file'])}-page-{item['page']}.png"
        pixmap.save(OUTPUT_DIR / filename)
        rendered += 1
    print(f"Rendered OCR question pages: {rendered}")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
