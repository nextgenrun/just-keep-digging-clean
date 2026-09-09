"""Read source pixels to measure frames; never rewrite or resample image data."""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image

for source in sys.argv[1:]:
    image = Image.open(source).convert('RGB')
    pixels = np.asarray(image)
    bright = pixels.max(axis=2) > 60
    bands = []
    start = None
    for y, count in enumerate(bright.sum(axis=1)):
        if count > 35 and start is None:
            start = y
        if count <= 35 and start is not None:
            if y - start > 3:
                bands.append([start, y - 1])
            start = None
    if start is not None:
        bands.append([start, image.height - 1])
    print(json.dumps({'file': str(Path(source)), 'size': image.size, 'rowBands': bands}))
