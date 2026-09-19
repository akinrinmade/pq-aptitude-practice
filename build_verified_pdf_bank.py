import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent
SOURCE = BASE_DIR / "public" / "pdf-question-bank.json"
OUTPUT = BASE_DIR / "public" / "verified-pdf-question-bank.json"

if __name__ == "__main__":
    questions = json.loads(SOURCE.read_text(encoding="utf-8"))
    verified = []
    seen_prompts = set()
    for question in questions:
        prompt = question.get("prompt", "").strip()
        normalized_prompt = " ".join(prompt.lower().split())
        if not prompt or normalized_prompt in seen_prompts:
            continue
        if question.get("answerIndex") is None:
            continue
        if not isinstance(question.get("options"), list) or len(question["options"]) < 3:
            continue
        if question["answerIndex"] < 0 or question["answerIndex"] >= len(question["options"]):
            continue
        if len(prompt) > 360 or len(prompt.splitlines()) > 8:
            continue
        if re.search(r"(?i)gtbank|download more|current affairs|answer [a-e]:|solution booklet|this gives a total|the table above shows", prompt):
            continue
        if not re.search(r"[?!.]$", prompt):
            continue
        if any(not str(option).strip() or len(str(option)) > 180 for option in question["options"]):
            continue
        seen_prompts.add(normalized_prompt)
        verified.append(question)
    OUTPUT.write_text(json.dumps(verified, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
    print(f"Source questions: {len(questions)}")
    print(f"Verified practice questions: {len(verified)}")
    print(f"Held for review: {len(questions) - len(verified)}")
    print(f"Output: {OUTPUT}")
