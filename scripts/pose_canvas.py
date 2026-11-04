"""Deterministic export geometry shared by animation source packers."""
import hashlib
from pathlib import Path

from PIL import Image

CANVAS = (384, 512)
GROUND_PIVOT = (192, 468)


def normalize_pose(path: Path, source_pivot=(628, 1235), scale_at_1280=0.33):
    with Image.open(path) as source:
        image = source.convert('RGBA')
    if image.width != image.height:
        raise ValueError(f'Review non-square source before normalization: {path.name}')
    alpha = image.getchannel('A')
    if alpha.getextrema()[0] != 0:
        raise ValueError(f'Source lacks transparent pixels: {path.name}')
    scale = scale_at_1280 * 1280 / image.width
    pivot = tuple(value * image.width / 1280 for value in source_pivot)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    offset = tuple(round(GROUND_PIVOT[i] - pivot[i] * scale) for i in range(2))
    bounds = resized.getchannel('A').point(lambda value: 255 if value > 24 else 0).getbbox()
    if not bounds:
        raise ValueError(f'Empty pose: {path.name}')
    target = tuple(bounds[i] + offset[i % 2] for i in range(4))
    if not (0 < target[0] < target[2] < CANVAS[0] and 0 < target[1] < target[3] < CANVAS[1]):
        raise ValueError(f'Clipped pose {path.name}: {target}')
    frame = Image.new('RGBA', CANVAS)
    frame.alpha_composite(resized, offset)
    return frame, {
        'sourceSize': list(image.size), 'sourcePivot': list(pivot), 'scale': scale,
        'bounds': list(target), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    }
