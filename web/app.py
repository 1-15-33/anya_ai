"""FastAPI-сервер Anya: принимает текст, возвращает ответ модели v3."""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import torch

app = FastAPI(title="Anya AI")

STATIC = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC), name="static")

# ==== загрузка модели v3 (посимвольный, loss 1.55) ====
from model.tokenizer import Tokenizer
from model.transformer import AnyaTransformer

TOK_PATH = "checkpoints/tokenizer_v3_1.json"
CKPT_PATH = "checkpoints/anya_v3_1.pt"

tok = Tokenizer.load(TOK_PATH) if os.path.exists(TOK_PATH) else None
model = None

if tok is not None and os.path.exists(CKPT_PATH):
    model = AnyaTransformer(
        vocab_size=tok.vocab_size,
        embed_dim=192,
        num_heads=6,
        num_layers=6,
        max_seq_len=128,
    )
    model.load_state_dict(torch.load(CKPT_PATH, map_location="cpu"))
    model.eval()
    print(f"Anya v3 загружена: vocab={tok.vocab_size}")
else:
    print("Модель v3 не найдена — будет заглушка")


class ChatRequest(BaseModel):
    message: str
    mode: str = "character"


@app.get("/")
def index():
    return FileResponse(os.path.join(STATIC, "index.html"))


@app.post("/chat")
def chat(req: ChatRequest):
    if model is None or tok is None:
        return {"reply": "Модель не загружена. Проверь checkpoints/anya_v3_1.pt и tokenizer_v3_1.json."}

    prompt = req.message
    ids = tok.encode(prompt)
    if len(ids) == 0:
        return {"reply": "Пустой запрос."}

    idx = torch.tensor([ids], dtype=torch.long)
    with torch.no_grad():
        out = model.generate(idx, max_new_tokens=120, temperature=0.8)

    reply = tok.decode(out[0].tolist())
    # убираем эхо промпта
    if reply.startswith(prompt):
        reply = reply[len(prompt):].strip()
    if not reply:
        reply = "..."

    return {"reply": reply}


@app.get("/health")
def health():
    return {"status": "ok", "name": "Anya AI", "model_loaded": model is not None}