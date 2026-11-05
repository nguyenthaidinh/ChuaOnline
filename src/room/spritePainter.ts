import type { DecodedSprite } from './imageLoader.ts';
import type { ArtworkFrame } from './modernArtworkTypes.ts';

type SpriteFrame = Pick<ArtworkFrame, 'image' | 'columns' | 'rows' | 'atlasCell'>;

/** Stage the next frame offscreen and replace the visible pixels only on success. */
export class SpritePainter {
  private staging: HTMLCanvasElement;
  private key = '';
  constructor(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')) {
    this.staging = createCanvas();
  }
  paint(target: HTMLCanvasElement, source: DecodedSprite | undefined,
    frame: SpriteFrame, width: number, height: number): boolean {
    if (!source || ('complete' in source && !source.complete)) return false;
    const sourceWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const sourceHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;
    if (!sourceWidth || !sourceHeight) return false;
    if (!Number.isInteger(frame.atlasCell) || frame.atlasCell < 0 || frame.atlasCell >= frame.columns * frame.rows
      || !Number.isInteger(frame.columns) || !Number.isInteger(frame.rows)
      || frame.columns < 1 || frame.rows < 1 || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
    const key = `${frame.image}:${frame.atlasCell}:${frame.columns}:${frame.rows}:${width}:${height}`;
    if (key === this.key) return true;
    const context = this.staging.getContext('2d');
    const visible = target.getContext('2d');
    if (!context || !visible) return false;
    const cellWidth = sourceWidth / frame.columns;
    const cellHeight = sourceHeight / frame.rows;
    // Fixed backing size avoids reallocating surfaces as walk/passing atlases alternate.
    // CSS retains logical actor size; 192×256 matches the main movement banks.
    width = Math.min(width, 192);
    height = Math.min(height, 256);
    if (this.staging.width !== width) this.staging.width = width;
    if (this.staging.height !== height) this.staging.height = height;
    context.clearRect(0, 0, width, height);
    try {
      context.drawImage(source, (frame.atlasCell % frame.columns) * cellWidth,
        Math.floor(frame.atlasCell / frame.columns) * cellHeight, cellWidth, cellHeight, 0, 0, width, height);
    } catch { return false; }
    // The visible canvas is never cleared while waiting for a source image.
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
    visible.globalCompositeOperation = 'copy';
    visible.drawImage(this.staging, 0, 0);
    visible.globalCompositeOperation = 'source-over';
    this.key = key;
    return true;
  }
}
