import sentencepiece as spm
import os

os.makedirs("checkpoints", exist_ok=True)

spm.SentencePieceTrainer.Train(
    input='data/corpus.txt',
    model_prefix='checkpoints/anya_bpe_2048', # Новое имя
    vocab_size=2048,                          # Было 1024, стало 2048
    model_type='bpe',
    character_coverage=1.0,
    max_sentence_length=100000,
    num_threads=4
)
print("BPE (2048) обучен: checkpoints/anya_bpe_2048.model")