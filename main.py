"""Anya AI — точка входа.
Запуск веба: python main.py
Обучение:   python -m model.train
"""
import uvicorn

if __name__ == "__main__":
    print("Anya AI: запускаю сервер...")
    uvicorn.run("web.app:app", host="127.0.0.1", port=8000, reload=True)