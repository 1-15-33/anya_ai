"""Датасет Anya с BPE-токенизатором."""
import torch
from torch.utils.data import Dataset


class TextDataset(Dataset):
    def __init__(self, text: str, tokenizer, seq_len: int = 128):
        self.seq_len = seq_len
        self.ids = tokenizer.encode(text)
        self.n_chunks = (len(self.ids) - 1) // seq_len
        if self.n_chunks <= 0:
            raise ValueError("Текст слишком короткий")

    def __len__(self):
        return self.n_chunks

    def __getitem__(self, idx):
        start = idx * self.seq_len
        chunk = self.ids[start:start + self.seq_len + 1]
        x = torch.tensor(chunk[:-1], dtype=torch.long)   # вход
        y = torch.tensor(chunk[1:], dtype=torch.long)    # цель
        return x, y


def load_corpus(path: str, max_chars: int = 10_000_000) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read(max_chars)