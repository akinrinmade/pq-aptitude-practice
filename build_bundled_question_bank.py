import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent
OUTPUT = BASE_DIR / "public" / "question-bank.json"


def difficulty(value):
    value = value.lower()
    return "Easy" if value == "easy" else "Hard" if value in {"hard", "d4", "d5"} else "Medium"


def section_for_source(source):
    name = source.lower()
    if "verbal" in name or "pwc" in name:
        return "Verbal"
    if "numerical" in name or "shl" in name or "math" in name:
        return "Numerical"
    if "cognitive" in name or "critical" in name:
        return "Logical"
    return "Logical"


def parse_answer(text, options):
    match = re.search(r"(?i)(?:correct\s+answer|answer)\s*(?:is|:)\s*\(?([A-E])\)?", text)
    if match:
        return "ABCDE".index(match.group(1).upper())
    for index, option in enumerate(options):
        escaped = re.escape(option)
        if re.search(rf"(?i)(?:^|\n)\s*{escaped}\s*[-:]", text):
            return index
    return None


def parse_options(content, labeled_matches):
    if labeled_matches:
        return [match.group(2).strip() for match in labeled_matches][:5]

    lines = [line.strip() for line in content.splitlines() if line.strip()]
    verbal_options = ["True", "False", "Cannot say"]
    if all(re.search(rf"(?i)\b{re.escape(option)}\b", content) for option in verbal_options):
        return verbal_options

    candidates = []
    for line in lines:
        if len(line) <= 80 and not re.search(r"[.!?]$", line) and not line.lower().startswith(("source", "solution", "explanation")):
            candidates.append(line)
    if len(candidates) >= 5 and re.fullmatch(r"\d+", candidates[-1]):
        candidates.pop()
    return candidates[-5:] if len(candidates) >= 5 else candidates[-4:] if len(candidates) >= 4 else []


def parse_corpus():
    path = BASE_DIR / "question_bank_corpus.md"
    text = path.read_text(encoding="utf-8")
    entries = []
    source_headers = list(re.finditer(r"^## (.+)$", text, flags=re.MULTILINE))
    question_blocks = list(re.finditer(r"^### Question \d+$", text, flags=re.MULTILINE))
    for index, question_match in enumerate(question_blocks):
        next_question = question_blocks[index + 1].start() if index + 1 < len(question_blocks) else len(text)
        block = text[question_match.start():next_question]
        if not block.startswith("### Question"):
            continue
        source = "Extracted PDF bank"
        for source_match in source_headers:
            if source_match.start() < question_match.start():
                source = source_match.group(1)
            else:
                break
        lines = block.splitlines()
        source_page_match = re.search(r"^Source page: (\d+)$", block, flags=re.MULTILINE)
        source_page = source_page_match.group(1) if source_page_match else ""
        content = "\n".join(line for line in lines if not line.startswith("### Question") and not line.startswith("Source page:" )).strip()
        option_matches = list(re.finditer(r"(?m)^\s*\(?([A-E])\)?[.)]\s+(.+)$", content))
        options = parse_options(content, option_matches)
        if option_matches:
            question_end = option_matches[0].start()
        elif options:
            first_option = re.search(rf"(?im)^\s*{re.escape(options[0])}\s*$", content)
            question_end = first_option.start() if first_option else content.find(options[0])
        else:
            question_end = len(content)
        prompt = content[:question_end].strip()
        if not prompt:
            prompt = content.strip()
        if not prompt:
            continue
        entry = {
            "id": f"source-{index + 1:04d}",
            "type": section_for_source(source),
            "difficulty": "Medium",
            "prompt": prompt,
            "options": options[:5] or ["Review source item"],
            "answerIndex": parse_answer(content, options),
            "explanation": f"Source: {source}. This item is preserved from the extracted PDF corpus.",
        }
        if "76284431-SHL" in source and source_page in {"4", "5"}:
            entry["image_url"] = "/source-pages/shl-page-4.png"
        entries.append(entry)
    return entries


def parse_visual():
    path = BASE_DIR / "visual_reasoning_bank_10k.md"
    text = path.read_text(encoding="utf-8")
    entries = []
    for index, block in enumerate(re.split(r"(?=^Q-\d+ \|)", text, flags=re.MULTILINE)):
        if not block.startswith("Q-"):
            continue
        lines = block.splitlines()
        title = lines[0].strip()
        question = next((line.removeprefix("Question: ").strip() for line in lines if line.startswith("Question:")), title)
        answer_line = next((line for line in lines if line.startswith("Correct answer:")), "")
        answer = answer_line.split(":", 1)[1].strip() if ":" in answer_line else "A"
        options = [line[3:].strip() for line in lines if re.match(r"^[A-E]\. ", line)]
        visual_index = next((i for i, line in enumerate(lines) if line == "Visual:"), None)
        visual = lines[visual_index + 1] if visual_index is not None and visual_index + 1 < len(lines) else ""
        if len(options) != 5:
            continue
        entries.append({
            "id": f"visual-{index + 1:05d}",
            "type": "Abstract",
            "difficulty": "Hard",
            "prompt": f"{question}\n\n{visual}",
            "options": options,
            "answerIndex": "ABCDE".index(answer),
            "explanation": next((line.removeprefix("Rule: ").strip() for line in lines if line.startswith("Rule:")), "Apply the visual rule described in the item."),
        })
    return entries


def parse_tech():
    path = BASE_DIR / "public" / "tech_question_bank.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    entries = []
    for item in raw:
        options = [item[key] for key in ("option_a", "option_b", "option_c", "option_d", "option_e") if item.get(key)]
        entries.append({
            "id": item["id"],
            "type": "Tech",
            "difficulty": difficulty(item.get("difficulty", "hard")),
            "prompt": f"{item.get('passage', '').strip()}\n\n{item['question']}".strip(),
            "options": options,
            "answerIndex": "ABCDE".index(item["correct_option"]),
            "explanation": item.get("explanation", ""),
        })
    return entries


if __name__ == "__main__":
    entries = parse_corpus() + parse_visual() + parse_tech()
    OUTPUT.write_text(json.dumps(entries, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
    answered = sum(item["answerIndex"] is not None for item in entries)
    print(f"Bundled questions: {len(entries)}")
    print(f"Scored questions: {answered}")
    print(f"Review-only questions: {len(entries) - answered}")
    print(f"Output: {OUTPUT}")
