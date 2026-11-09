"""Токенизатор Anya: посимвольный (для V1-V3)."""
import json
import os

BASE_CHARS = (
    " .,!?;:-—–()\"'«»\n\t"
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
    "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"
)

class Tokenizer:
    def __init__(self):
        self.char2id = {}
        self.id2char = {}
        self.pad_id = 0
        self.unk_id = 1

    def build(self, text: str):
        chars = sorted(set(text) | set(BASE_CHARS))
        self.char2id = {c: i + 2 for i, c in enumerate(chars)}
        self.char2id["<pad>"] = self.pad_id
        self.char2id["<unk>"] = self.unk_id
        self.id2char = {i: c for c, i in self.char2id.items()}
        return self

    @property
    def vocab_size(self) -> int:
        return len(self.char2id)

    def encode(self, text: str) -> list[int]:
        return [self.char2id.get(c, self.unk_id) for c in text]

    def decode(self, ids: list[int]) -> str:
        return "".join(self.id2char.get(i, "") for i in ids)

    def save(self, path: str):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "char2id": self.char2id,
                "pad_id": self.pad_id,
                "unk_id": self.unk_id
            }, f, ensure_ascii=False)

    @classmethod
    def load(cls, path: str):
        t = cls()
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        t.char2id = {k: int(v) for k, v in data["char2id"].items()}
        t.id2char = {i: c for c, i in t.char2id.items()}
        t.pad_id = data.get("pad_id", 0)
        t.unk_id = data.get("unk_id", 1)
        return t