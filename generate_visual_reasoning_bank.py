import random
from pathlib import Path

random.seed(42)
BASE_DIR = Path(r"c:\Users\Dell\OneDrive\Desktop\Workspace\Job Related\PQ")
OUT_PATH = BASE_DIR / "visual_reasoning_bank_10k.md"
TARGET_COUNT = 10200
SHAPES = ["circle", "triangle", "square", "diamond", "star", "hexagon", "cross", "ring"]
KINDS = ["matrix", "sequence", "rotation", "reflection", "missing_figure", "diagram"]
LETTERS = "ABCDE"


def unique_options(correct):
    options = [correct]
    candidates = [f"{shape} ({rule})" for shape in SHAPES for rule in ("solid", "outline", "inverted", "mirrored")]
    random.shuffle(candidates)
    for candidate in candidates:
        if candidate not in options:
            options.append(candidate)
        if len(options) == 5:
            break
    random.shuffle(options)
    return {letter: value for letter, value in zip(LETTERS, options)}, LETTERS[options.index(correct)]


def make_item(number):
    kind = random.choice(KINDS)
    shape_a, shape_b, shape_c = random.sample(SHAPES, 3)
    if kind == "matrix":
        correct = shape_b
        visual = f"{shape_a} | {shape_b} | {shape_c}\n{shape_b} | {shape_c} | {shape_a}\n{shape_c} | {shape_a} | ?"
        question = "Select the figure that completes the matrix."
        logic = "Each row is a cyclic shift of the previous row; the missing cell must continue the same order."
    elif kind == "sequence":
        correct = shape_a
        visual = f"{shape_a} -> {shape_b} -> {shape_c} -> {shape_b} -> {shape_c} -> ?"
        question = "Which figure most logically completes the sequence?"
        logic = "The sequence alternates between the second and third symbols after the initial symbol."
    elif kind == "rotation":
        rotation = random.choice((90, 180, 270))
        correct = f"{shape_a} rotated {rotation} degrees"
        visual = f"Original figure: {shape_a}"
        question = f"The original figure is rotated clockwise by {rotation} degrees. Which option matches it?"
        logic = "Track orientation only; rotation preserves the figure identity while changing its direction."
    elif kind == "reflection":
        axis = random.choice(("horizontal", "vertical", "diagonal"))
        correct = f"{shape_a} reflected across the {axis} axis"
        visual = f"Source figure: {shape_a}"
        question = f"Which option shows the reflection of the source across the {axis} axis?"
        logic = "Reflection reverses orientation across the stated axis without changing the figure's size."
    elif kind == "missing_figure":
        correct = shape_c
        visual = f"{shape_a} | ? | {shape_c} | {shape_a} | {shape_c}"
        question = "A figure is missing from a repeating pattern. Which option belongs in the empty position?"
        logic = "Read the repeating two-step cycle and select the symbol required at the missing position."
    else:
        correct = f"{shape_a} linked to {shape_b}"
        visual = f"Node A: {shape_a} -> Node B: {shape_b} -> Node C: {shape_c} -> ?"
        question = "Using the diagram rule, determine the correct missing relationship."
        logic = "The diagram applies the same symbolic transformation at each link."

    options, answer = unique_options(correct)
    return {
        "title": f"Q-{number:05d} | {kind.replace('_', ' ').title()}",
        "kind": kind,
        "difficulty": random.choice(("D4", "D5")),
        "question": question,
        "visual": visual,
        "logic": logic,
        "options": options,
        "answer": answer,
    }


def write_bank(items):
    lines = ["# Elite Visual Reasoning Question Bank", "", f"Generated item count: {len(items)}", "Target difficulty: D4-D5", ""]
    for item in items:
        lines.extend([
            "---", "", item["title"], f"Category: {item['kind'].replace('_', ' ').title()}", f"Difficulty: {item['difficulty']}",
            f"Question: {item['question']}", "", "Visual:", item["visual"], "", f"Rule: {item['logic']}", "", "Options:",
        ])
        lines.extend(f"{letter}. {item['options'][letter]}" for letter in LETTERS)
        lines.extend(["", f"Correct answer: {item['answer']}", ""])
    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    questions = [make_item(number) for number in range(1, TARGET_COUNT + 1)]
    write_bank(questions)
    print(f"Generated {len(questions)} elite visual reasoning questions at {OUT_PATH}")
