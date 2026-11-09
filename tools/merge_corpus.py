import os
import sys

CANDIDATES = ["RusLit/prose", "RusLit-main/prose", "RusLit-master/prose", "RusLit"]
source_dir = None
for c in CANDIDATES:
    if os.path.isdir(c):
        source_dir = c
        break

if source_dir is None:
    print("НЕ НАЙДЕНА папка RusLit. Что вижу:", os.listdir("."))
    sys.exit(1)

print("Использую папку:", source_dir)
OUTPUT = "data/corpus.txt"
os.makedirs("data", exist_ok=True)

ENCODINGS = ["utf-8", "cp1251", "koi8-r", "utf-16"]

count = 0
skipped = 0
total_bytes = 0
with open(OUTPUT, "w", encoding="utf-8") as out:
    for root, dirs, files in os.walk(source_dir):
        for fname in files:
            if not fname.endswith(".txt"):
                continue
            path = os.path.join(root, fname)
            text = None
            for enc in ENCODINGS:
                try:
                    with open(path, "r", encoding=enc) as f:
                        text = f.read()
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue
            if text is None:
                print("Пропуск (не смог прочитать):", path)
                skipped += 1
                continue
            out.write(text)
            out.write("\n\n")
            count += 1
            total_bytes += len(text.encode("utf-8"))

print(f"Файлов добавлено: {count}")
print(f"Пропущено: {skipped}")
print(f"Размер corpus.txt: {total_bytes / 1024 / 1024:.2f} МБ")
print("Готово:", OUTPUT)