"""Тест токенизатора Anya. Проверяет кодирование, декодирование, сохранение."""
from model.tokenizer import Tokenizer


def main():
    # текст для проверки (корпус пока не нужен), с пунктуацией и цифрами
    text = "Привет, мир! Я Anya. Я учусь говорить: 123, 456? Да!"

    print("=== СТРОЙКА СЛОВАРЯ ===")
    tok = Tokenizer().build(text)
    print(f"Размер словаря: {tok.vocab_size}")

    print("\n=== КОДИРОВАНИЕ ===")
    sample = "Привет, Anya!"
    ids = tok.encode(sample)
    print(f"Текст:      {sample}")
    print(f"Числа:      {ids}")

    print("\n=== ДЕКОДИРОВАНИЕ ===")
    back = tok.decode(ids)
    print(f"Обратно:    {back}")
    assert back == sample, f"ОШИБКА: декодирование не совпало! {back!r} != {sample!r}"
    print("Совпало:    ДА")

    print("\n=== НЕИЗВЕСТНЫЙ СИМВОЛ ===")
    unknown = "Привет, 漢字!"
    uids = tok.encode(unknown)
    uback = tok.decode(uids)
    print(f"Текст:      {unknown}")
    print(f"Числа:      {uids}")
    print(f"Обратно:    {uback}")
    print("(неизвестные символы заменены на <unk>, не падает)")

    print("\n=== СОХРАНЕНИЕ/ЗАГРУЗКА ===")
    path = "checkpoints/tokenizer_test.json"
    tok.save(path)
    tok2 = Tokenizer.load(path)
    print(f"Словарь совпадает: {tok.char2id == tok2.char2id}")
    assert tok.char2id == tok2.char2id, "ОШИБКА: словарь после загрузки не совпал!"

    print("\n=== ВСЁ РАБОТАЕТ ===")
    print("Токенизатор готов. Можно строить модель.")


if __name__ == "__main__":
    main()