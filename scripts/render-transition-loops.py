"""Create source-only review loops from the same compiled timelines used by the lab.

These are authored pose animations, not recordings of browser or production behavior.
No interpolation, body deformation, per-frame recentering or image repainting occurs.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'artwork/animation-v3/transitions-v2'


def main():
    manifest = json.loads((DIRECTORY / 'sequences.json').read_text(encoding='utf-8'))
    paths = {'walk': ROOT / 'artwork/animation-v3/walk-v1', 'transition': DIRECTORY}
    banks = {}
    for bank, atlas in manifest['atlases'].items():
        with Image.open(paths[bank] / atlas['image']) as source:
            image = source.convert('RGBA')
        frames = []
        for index in range(len(atlas['frames'])):
            x, y = index % atlas['columns'] * atlas['width'], index // atlas['columns'] * atlas['height']
            frames.append(image.crop((x, y, x + atlas['width'], y + atlas['height'])))
        banks[bank] = frames

    for name, clip in manifest['clips'].items():
        frames, durations = [], []
        for step in clip['steps']:
            frame = Image.new('RGBA', (384, 512), (42, 32, 24, 255))
            offset = step.get('rootOffset', {'x': 0, 'y': 0})
            frame.alpha_composite(banks[step['bank']][step['index']], (round(offset['x']), round(offset['y'])))
            frames.append(frame)
            durations.append(step['durationMs'])
        # Keep the completed pose readable before an explicit preview loop restart.
        durations[-1] += 600
        output = DIRECTORY / f'{name}-loop.webp'
        frames[0].save(output, save_all=True, append_images=frames[1:], duration=durations, loop=0, quality=93)
        print(f'{name}: {len(frames)} authored poses, {output.stat().st_size} bytes')


if __name__ == '__main__':
    main()
