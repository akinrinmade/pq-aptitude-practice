import json
from pathlib import Path

from build_bundled_question_bank import parse_corpus

BASE_DIR = Path(__file__).parent
OUTPUT = BASE_DIR / "public" / "pdf-question-bank.json"

if __name__ == "__main__":
    questions = parse_corpus()
    OUTPUT.write_text(json.dumps(questions, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
    print(f"PDF-source questions bundled: {len(questions)}")
    print(f"Output: {OUTPUT}")
