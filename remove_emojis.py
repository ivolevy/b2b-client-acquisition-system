import re
import sys
from pathlib import Path


EMOJI_PATTERN = re.compile(
    "["  # Start character class
    "\U0001F300-\U0001F5FF"  # Misc Symbols and Pictographs
    "\U0001F600-\U0001F64F"  # Emoticons
    "\U0001F680-\U0001F6FF"  # Transport & Map
    "\U0001F700-\U0001F77F"  # Alchemical Symbols
    "\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
    "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
    "\U0001FA00-\U0001FA6F"  # Chess Symbols to Signs and Symbols Extended-A
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "\u2600-\u26FF"          # Misc symbols
    "\u2700-\u27BF"          # Dingbats
    "]+",
    flags=re.UNICODE,
)

# Variation selector used by many emojis; remove if present
VS16_PATTERN = re.compile("\uFE0F")


ALLOWED_EXTENSIONS = {
    ".py",
    ".jsx",
    ".js",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".md",
    ".txt",
    ".sh",
    ".bat",
}


def file_should_process(path: Path) -> bool:
    if path.is_dir():
        return False
    if any(part.startswith(".") for part in path.parts):
        return False
    if any(skip in path.parts for skip in ("node_modules", ".venv", "dist", "build", "logs", "data")):
        return False
    return path.suffix in ALLOWED_EXTENSIONS


def remove_emojis_from_text(text: str) -> str:
    text = VS16_PATTERN.sub("", text)
    text = EMOJI_PATTERN.sub("", text)
    return text


def process_file(path: Path) -> tuple[int, int]:
    try:
        original = path.read_text(encoding="utf-8")
    except Exception:
        return 0, 0
    cleaned = remove_emojis_from_text(original)
    if cleaned != original:
        path.write_text(cleaned, encoding="utf-8")
        return len(original), len(cleaned)
    return 0, 0


def main() -> int:
    root = Path(__file__).resolve().parent
    total_changed = 0
    files_modified = 0
    for path in root.rglob("*"):
        if not file_should_process(path):
            continue
        before, after = process_file(path)
        if after:
            files_modified += 1
            total_changed += before - after
            print(f"Cleaned: {path}")
    print(f"Done. Modified files: {files_modified}, bytes removed: {total_changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())


