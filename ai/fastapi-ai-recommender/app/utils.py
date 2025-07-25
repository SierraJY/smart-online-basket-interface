import numpy as np


def to_idx(val, vocab):
    idx = np.where(vocab == val)[0]
    return int(idx[0]) if len(idx) > 0 else 0
