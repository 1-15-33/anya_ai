import sentencepiece as spm
import os

os.makedirs("checkpoints", exist_ok=True)

spm.SentencePieceTrainer.Train(
    input='data/corpus.txt',
    model_prefix='checkpoints/anya_bpe',
    vocab_size=1024,
    model_type='bpe',
    character_coverage=1.0,
    max_sentence_length=100000,
    num_threads=4
)
print("BPE обучен: checkpoints/anya_bpe.model")