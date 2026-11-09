"""Генерация текста Anya V3 (10M, посимвольный)."""
import torch
from model.tokenizer import Tokenizer
from model.transformer import AnyaTransformer

def load_model(ckpt="checkpoints/anya_v3_big.pt", tok_path="checkpoints/tokenizer_v3_big.json"):
    tok = Tokenizer.load(tok_path)
    model = AnyaTransformer(
        vocab_size=tok.vocab_size,
        embed_dim=384,
        num_heads=8,
        num_layers=8,
        max_seq_len=256,
    )
    model.load_state_dict(torch.load(ckpt, map_location="cpu"))
    model.eval()
    return model, tok

def generate(prompt: str, max_new_tokens: int = 200, temperature: float = 0.8):
    model, tok = load_model()
    ids = tok.encode(prompt)
    idx = torch.tensor([ids], dtype=torch.long)
    out = model.generate(idx, max_new_tokens=max_new_tokens, temperature=temperature)
    return tok.decode(out[0].tolist())

if __name__ == "__main__":
    prompt = input("Начало текста: ") or "Девушка розовой калитки"
    print("\n--- Anya V3 генерирует ---")
    print(generate(prompt))