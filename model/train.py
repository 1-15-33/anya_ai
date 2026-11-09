"""Обучение Anya V3: 10M, посимвольный, контекст 256."""
import os
import time
import torch
from torch.utils.data import DataLoader

from model.tokenizer import Tokenizer
from model.transformer import AnyaTransformer
from model.dataset import TextDataset, load_corpus

def train():
    CORPUS_PATH = "data/corpus.txt"
    MAX_CHARS = 20_000_000      # 20 МБ
    SEQ_LEN = 256               # Контекст 256
    BATCH_SIZE = 32             # Быстро
    EPOCHS = 8
    LR = 5e-4
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    CKPT = "checkpoints/anya_v3_big.pt"
    TOK_PATH = "checkpoints/tokenizer_v3_big.json"

    print(f"Устройство: {DEVICE}")
    text = load_corpus(CORPUS_PATH, MAX_CHARS)
    tok = Tokenizer().build(text)
    tok.save(TOK_PATH)
    print(f"Словарь: {tok.vocab_size}")

    dataset = TextDataset(text, tok, SEQ_LEN)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True, drop_last=True)

    model = AnyaTransformer(
        vocab_size=tok.vocab_size,
        embed_dim=384,
        num_heads=8,
        num_layers=8,
        max_seq_len=SEQ_LEN,
    ).to(DEVICE)

    print(f"Параметров: {sum(p.numel() for p in model.parameters()):,}")
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR)
    os.makedirs("checkpoints", exist_ok=True)

    for epoch in range(1, EPOCHS + 1):
        model.train()
        total_loss = 0.0
        n_batches = 0
        start = time.time()

        for step, (x, y) in enumerate(loader, 1):
            x, y = x.to(DEVICE), y.to(DEVICE)
            logits, loss = model(x, y)

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            total_loss += loss.item()
            n_batches += 1

            if step % 100 == 0:
                avg = total_loss / n_batches
                elapsed = time.time() - start
                eta = elapsed / step * (len(loader) - step)
                print(f"[epoch {epoch}] step {step}/{len(loader)}  "
                      f"loss={avg:.4f}  elapsed={elapsed/60:.0f}m  eta={eta/60:.0f}m")

            if step % 500 == 0:
                torch.save(model.state_dict(), CKPT)
                print(f"  [Сохранение на шаге {step}]")

        avg = total_loss / max(n_batches, 1)
        print(f"=== epoch {epoch} завершён, avg loss = {avg:.4f} ===")
        torch.save(model.state_dict(), CKPT)

if __name__ == "__main__":
    train()