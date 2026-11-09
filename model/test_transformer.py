"""Тест трансформера Anya: проверяет, что модель запускается и выдаёт logits."""
import torch
from model.transformer import AnyaTransformer
from model.tokenizer import Tokenizer


def main():
    text = "Привет, мир! Я Anya. Я учусь говорить: 123, 456? Да!"
    tok = Tokenizer().build(text)
    vocab_size = tok.vocab_size

    print("=== СОЗДАНИЕ МОДЕЛИ ===")
    model = AnyaTransformer(
        vocab_size=vocab_size,
        embed_dim=64,      # маленькие размеры для теста
        num_heads=4,
        num_layers=2,
        max_seq_len=64,
    )
    n_params = sum(p.numel() for p in model.parameters())
    print(f"Параметров: {n_params:,}")
    print(f"Словарь:   {vocab_size}")

    print("\n=== ПРОБНЫЙ ПРОГОН ===")
    sample = "Привет, Anya!"
    ids = tok.encode(sample)
    x = torch.tensor([ids])  # (1, T)
    targets = torch.tensor([ids[1:] + [tok.pad_id]])  # сдвиг на 1

    logits, loss = model(x, targets)
    print(f"Вход:      {sample}")
    print(f"Форма logits: {tuple(logits.shape)}  (B, T, vocab)")
    print(f"Loss:      {loss.item():.4f}")

    print("\n=== ГЕНЕРАЦИЯ (случайная, модель не обучена) ===")
    start = torch.tensor([tok.encode("При")])
    out = model.generate(start, max_new_tokens=10, temperature=1.0)
    print(f"Сгенерировано: {tok.decode(out[0].tolist())!r}")
    print("(модель не обучена — текст будет мусорным, это нормально)")

    print("\n=== ВСЁ РАБОТАЕТ ===")
    print("Трансформер готов. Можно готовить данные и обучение.")


if __name__ == "__main__":
    main()