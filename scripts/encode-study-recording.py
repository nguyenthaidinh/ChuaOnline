"""Encode actual CUA screenshots as VFR video using their captured timestamps."""
import argparse
import json
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('captures', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--capture-description', default='Actual CUA browser screenshots at 0.25x authoring playback; VFR timestamps, no audio')
    args = parser.parse_args()
    captures = args.captures.resolve()
    output = args.output.resolve()
    rows = json.loads(captures.read_text(encoding='utf-8'))
    if not rows or any(not (captures.parent / row['file']).is_file() for row in rows):
        raise SystemExit('Missing captured frames.')
    if any(b['at'] <= a['at'] for a, b in zip(rows, rows[1:])):
        raise SystemExit('Capture timestamps must increase.')
    lines = ['ffconcat version 1.0']
    for index, row in enumerate(rows):
        path = (captures.parent / row['file']).as_posix().replace("'", "'\\''")
        duration = (rows[index + 1]['at'] - row['at']) / 1000 if index + 1 < len(rows) else .2
        lines += [f"file '{path}'", f'duration {duration:.6f}']
    lines.append(lines[-2])
    sequence = captures.parent / 'sequence.ffconcat'
    sequence.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
                    '-i', str(sequence), '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-fps_mode', 'vfr', '-c:v', 'libx264', '-preset', 'fast',
                    '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'quiet', '-show_entries',
                      'format=duration,size:stream=width,height,codec_name', '-of', 'json', str(output)],
                     text=True, encoding='utf-8'))
    report = {
        'captureMethod': args.capture_description,
        'capturedFrames': len(rows), 'capturedMs': rows[-1]['at'] - rows[0]['at'],
        'observedPoses': sorted({pose for row in rows for pose in
                                ([row['pose']] if 'pose' in row else
                                 [actor.get('source','') for actor in row.get('actors',[])])}),
        'last': rows[-1], 'video': probe,
        'limit': 'Screenshot sampling is not continuous video and may omit brief poses; see the related review for test scope.',
    }
    output.with_suffix('.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'capturedFrames': len(rows), 'capturedMs': report['capturedMs'], 'video': probe}))


if __name__ == '__main__':
    main()
