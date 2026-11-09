"""Датасет Anya (посимвольный)."""
import torch
from torch.utils.data import Dataset

class TextDataset(Dataset):
    def __init__(self, text: str, tokenizer, seq_len: int = 256):
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
        x = torch.tensor(chunk[:-1], dtype=torch.long)
        y = torch.tensor(chunk[1:], dtype=torch.long)
        return x, y

def load_corpus(path: str, max_chars: int = 20_000_000) -> str:
    # errors='ignore' спасает от битых символов
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read(max_chars)