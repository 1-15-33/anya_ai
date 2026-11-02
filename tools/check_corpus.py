with open("data/corpus.txt", "r", encoding="utf-8") as f:
    text = f.read()
print("Символов:", len(text))
print("Первые 200 символов:")
print(text[:200])