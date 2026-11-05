"""Build the self-hosted Vietnamese serif from a pinned official Noto source.

Requires fontTools with WOFF2/Brotli support. No browser/runtime dependency.
"""
import hashlib
import json
import unicodedata
import urllib.request
from pathlib import Path

import fontTools
import brotli
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'artwork/fonts-v1'
PUBLIC = ROOT / 'public/assets/fonts'
COMMIT = '8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5'
UPSTREAM = f'https://raw.githubusercontent.com/google/fonts/{COMMIT}/ofl/notoserif/'
FILES = {'NotoSerif-variable.ttf': 'NotoSerif%5Bwdth,wght%5D.ttf', 'OFL.txt': 'OFL.txt'}
SOURCE_HASHES = {
    'NotoSerif-variable.ttf': '4d8e6761424656867019081a1a01336f3cb086982682698714054fc33f782713',
    'OFL.txt': 'cee9892f9f0cc8fe882c9e9537ee6a89621d86ee7ceaf70b02e2b2b1c25c061a',
}
RANGES = [(0x0000, 0x024F), (0x0300, 0x036F), (0x1E00, 0x1EFF), (0x2000, 0x206F)]
EXTRA = [0x20AB, 0x25CC]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    SOURCE.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    inputs = []
    for filename, upstream_name in FILES.items():
        destination = SOURCE / filename
        url = UPSTREAM + upstream_name
        if not destination.exists():
            with urllib.request.urlopen(url, timeout=40) as response:
                destination.write_bytes(response.read())
        if sha(destination) != SOURCE_HASHES[filename]:
            raise ValueError('Source differs from the pinned upstream: ' + filename)
        inputs.append({'file': destination.relative_to(ROOT).as_posix(), 'url': url,
                       'sha256': sha(destination), 'bytes': destination.stat().st_size})
    license_bytes = (SOURCE / 'OFL.txt').read_bytes()
    if b'SIL OPEN FONT LICENSE Version 1.1' not in license_bytes:
        raise ValueError('Expected the original SIL OFL license.')
    (PUBLIC / 'OFL.txt').write_bytes(license_bytes)

    font = TTFont(SOURCE / 'NotoSerif-variable.ttf', recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.name_legacy = True
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = True
    options.recalc_timestamp = False
    codepoints = set(EXTRA)
    for start, end in RANGES:
        codepoints.update(range(start, end + 1))
    compiler = subset.Subsetter(options=options)
    compiler.populate(unicodes=codepoints)
    compiler.subset(font)
    # Subset before axis restriction: fontTools4.58 may prune empty gvar entries
    # during instancing, which the later subsetter expects for format-control glyphs.
    instantiateVariableFont(font, {'wdth': 100, 'wght': (400, 400, 700)}, inplace=True)
    output = PUBLIC / 'noto-serif-vietnamese.woff2'
    font.flavor = 'woff2'
    font.save(output)
    font.close()

    decoded = TTFont(output)
    cmap = decoded.getBestCmap()
    catalog = (ROOT / 'src/data/blessingCatalog.ts').read_text(encoding='utf-8')
    regression = 'điều đều thiền nguyện bình ề ế ễ ể ệ ờ ớ ỡ ở ợ ằ ắ ẵ ẳ ặ'
    required = {ord(character) for character in unicodedata.normalize('NFC', catalog + regression)
                if character.isalpha() or character in '.,;:!?…–—↻₫'}
    missing = sorted(required - cmap.keys())
    if missing:
        raise ValueError('Missing catalog glyphs: ' + repr(missing))
    vietnamese_missing = [codepoint for codepoint in range(0x1EA0, 0x1EFA) if codepoint not in cmap]
    if vietnamese_missing:
        raise ValueError('Missing Vietnamese precomposed vowels: ' + repr(vietnamese_missing))
    # Real Vietnamese mark attachment requires the font's shaping tables.
    for table in ('GSUB', 'GPOS', 'GDEF', 'fvar'):
        if table not in decoded:
            raise ValueError('Lost required font table: ' + table)
    features = {record.FeatureTag for record in decoded['GPOS'].table.FeatureList.FeatureRecord}
    if not {'mark', 'mkmk'}.issubset(features):
        raise ValueError('Lost combining-mark attachment features.')
    combining = [0x0300, 0x0301, 0x0303, 0x0309, 0x0323, 0x0302, 0x0306, 0x031B]
    if any(codepoint not in cmap for codepoint in combining):
        raise ValueError('Missing decomposed Vietnamese accent glyph.')
    axes = {axis.axisTag: {'min': axis.minValue, 'default': axis.defaultValue, 'max': axis.maxValue}
            for axis in decoded['fvar'].axes}
    if axes != {'wght': {'min': 400.0, 'default': 400.0, 'max': 700.0}}:
        raise ValueError('Unexpected remaining font axes: ' + repr(axes))
    report = {
        'family': 'Noto Serif', 'license': 'SIL Open Font License 1.1',
        'officialRepository': 'https://github.com/google/fonts/tree/' + COMMIT + '/ofl/notoserif',
        'sourceCommit': COMMIT, 'sourceFiles': inputs,
        'fontToolsVersion': fontTools.__version__, 'brotliVersion': brotli.__version__,
        'operations': ['Subset Latin, Vietnamese, combining marks and punctuation',
                       'Pin wdth=100', 'Restrict wght to400..700', 'Encode WOFF2'],
        'output': {'file': output.relative_to(ROOT).as_posix(), 'sha256': sha(output),
                   'bytes': output.stat().st_size, 'style': 'normal', 'weightRange': [400, 700]},
        'validation': {'catalogNfcGlyphsChecked': len(required), 'missingGlyphs': missing,
                       'vietnamesePrecomposedBlock': 'U+1EA0..U+1EF9',
                       'missingVietnamesePrecomposedGlyphs': vietnamese_missing,
                       'combiningMarks': ['U+' + format(cp, '04X') for cp in combining],
                       'gposFeatures': sorted(features), 'axes': axes,
                       'glyphCount': len(decoded.getGlyphOrder()),
                       'note': 'Table/cmap checks; final rendered diacritic review belongs to browser QA.'},
    }
    decoded.close()
    (SOURCE / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n',
                                        encoding='utf-8', newline='\n')
    print(json.dumps(report['output']))


if __name__ == '__main__':
    main()
