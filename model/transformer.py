"""Архитектура Anya: трансформер (decoder-only, как у GPT).
Пока каркас — соберём и обучим по шагам."""
import torch
import torch.nn as nn
import math


class PositionalEncoding(nn.Module):
    """Добавляет информацию о позиции токена в последовательности."""
    def __init__(self, embed_dim: int, max_seq_len: int, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)

        pe = torch.zeros(max_seq_len, embed_dim)
        position = torch.arange(0, max_seq_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, embed_dim, 2).float() * (-math.log(10000.0) / embed_dim)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # (1, max_seq_len, embed_dim)
        self.register_buffer("pe", pe)

    def forward(self, x):
        # x: (B, T, embed_dim)
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


class AnyaTransformer(nn.Module):
    """Decoder-only трансформер: предсказывает следующий токен."""
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 256,
        num_heads: int = 4,
        num_layers: int = 4,
        max_seq_len: int = 256,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.max_seq_len = max_seq_len

        self.token_emb = nn.Embedding(vocab_size, embed_dim)
        self.pos_enc = PositionalEncoding(embed_dim, max_seq_len, dropout)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dim_feedforward=embed_dim * 4,
            dropout=dropout,
            batch_first=True,
            activation="gelu",
        )
        self.blocks = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        self.ln_f = nn.LayerNorm(embed_dim)
        self.head = nn.Linear(embed_dim, vocab_size, bias=False)

        self._init_weights()

    def _init_weights(self):
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def _causal_mask(self, T: int, device):
        # запрещает смотреть в будущее: токен видит только себя и прошлые
        mask = torch.triu(torch.ones(T, T, device=device), diagonal=1).bool()
        return mask

    def forward(self, x, targets=None):
        """
        x: (B, T) — входные токены
        targets: (B, T) — правильные следующие токены (для обучения)
        Возвращает: logits (B, T, vocab_size), loss (если targets даны)
        """
        B, T = x.shape
        if T > self.max_seq_len:
            raise ValueError(f"Длина {T} больше max_seq_len={self.max_seq_len}")

        h = self.token_emb(x)              # (B, T, E)
        h = self.pos_enc(h)                # (B, T, E)
        mask = self._causal_mask(T, x.device)
        h = self.blocks(h, mask=mask)      # (B, T, E)
        h = self.ln_f(h)
        logits = self.head(h)              # (B, T, V)

        loss = None
        if targets is not None:
            loss = nn.functional.cross_entropy(
                logits.reshape(-1, self.vocab_size),
                targets.reshape(-1),
            )
        return logits, loss

    @torch.no_grad()
    def generate(self, idx, max_new_tokens: int = 50, temperature: float = 1.0):
        """Генерация текста по начальному контексту idx (B, T)."""
        self.eval()
        for _ in range(max_new_tokens):
            idx_cond = idx[:, -self.max_seq_len:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :] / temperature
            probs = torch.softmax(logits, dim=-1)
            next_id = torch.multinomial(probs, num_samples=1)
            idx = torch.cat([idx, next_id], dim=1)
        return idx