import json
from pathlib import Path

BASE_DIR = Path(__file__).parent
SOURCE = BASE_DIR / "public" / "pdf-question-bank.json"
OUTPUT = BASE_DIR / "public" / "verified-pdf-question-bank.json"

if __name__ == "__main__":
    questions = json.loads(SOURCE.read_text(encoding="utf-8"))
    verified = [
        question for question in questions
        if question.get("answerIndex") is not None
        and isinstance(question.get("options"), list)
        and len(question["options"]) >= 3
        and question["answerIndex"] < len(question["options"])
        and question.get("prompt", "").strip()
    ]
    OUTPUT.write_text(json.dumps(verified, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
    print(f"Source questions: {len(questions)}")
    print(f"Verified practice questions: {len(verified)}")
    print(f"Held for review: {len(questions) - len(verified)}")
    print(f"Output: {OUTPUT}")
