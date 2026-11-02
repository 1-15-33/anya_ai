"""Обучение Anya v4.1: BPE, LR=1e-3, batch=32."""
import os
import time
import torch
from torch.utils.data import DataLoader

from model.tokenizer import Tokenizer
from model.transformer import AnyaTransformer
from model.dataset import TextDataset, load_corpus


def train():
    CORPUS_PATH = "data/corpus.txt"
    MAX_CHARS = 10_000_000
    SEQ_LEN = 128
    BATCH_SIZE = 32              # было 16
    EPOCHS = 6
    LR = 1e-3                    # было 5e-4
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    CKPT = "checkpoints/anya_v4_1.pt"
    BPE_PATH = "checkpoints/anya_bpe.model"

    print(f"Устройство: {DEVICE}")
    if DEVICE == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    text = load_corpus(CORPUS_PATH, MAX_CHARS)
    print(f"Символов для обучения: {len(text):,}")

    tok = Tokenizer.load(BPE_PATH)
    print(f"Словарь BPE: {tok.vocab_size}")

    dataset = TextDataset(text, tok, SEQ_LEN)
    print(f"Примеров: {len(dataset):,}")

    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True, drop_last=True)

    model = AnyaTransformer(
        vocab_size=tok.vocab_size,
        embed_dim=192,
        num_heads=6,
        num_layers=6,
        max_seq_len=SEQ_LEN,
    ).to(DEVICE)

    n_params = sum(p.numel() for p in model.parameters())
    print(f"Параметров: {n_params:,}")

    optimizer = torch.optim.AdamW(model.parameters(), lr=LR)
    os.makedirs("checkpoints", exist_ok=True)

    start = time.time()
    for epoch in range(1, EPOCHS + 1):
        model.train()
        total_loss = 0.0
        n_batches = 0

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

        avg = total_loss / max(n_batches, 1)
        print(f"=== epoch {epoch} завершён, avg loss = {avg:.4f} ===")
        torch.save(model.state_dict(), CKPT)
        print(f"Сохранено: {CKPT}")

    print("Обучение завершено.")


if __name__ == "__main__":
    train()