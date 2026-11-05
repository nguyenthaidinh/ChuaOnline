/** A bounded, deduplicated download/decode queue shared by scene and character art. */
export class ImageQueue {
  private pending = new Map<string, Promise<void>>();
  private jobs: Array<() => void> = [];
  private active = 0;
  private load: (url: string) => Promise<void>;
  private concurrency: number;
  constructor(load: (url: string) => Promise<void>, concurrency = 3) {
    this.load = load; this.concurrency = concurrency;
  }
  request(url: string): Promise<void> {
    const cached = this.pending.get(url);
    if (cached) return cached;
    const promise = new Promise<void>((resolve, reject) => {
      this.jobs.push(() => {
        this.active++;
        void this.load(url).then(resolve, error => {
          this.pending.delete(url);
          reject(error);
        }).finally(() => { this.active--; this.drain(); });
      });
    });
    this.pending.set(url, promise);
    this.drain();
    return promise;
  }
  private drain() {
    while (this.active < this.concurrency && this.jobs.length) this.jobs.shift()!();
  }
}

// Keep the actual decoded source, not only its fulfilled Promise. The renderer
// can paint synchronously without replacing a CSS image during a walking step.
export type DecodedSprite = HTMLImageElement | ImageBitmap;
const decodedSources = new Map<string, DecodedSprite>();
export const decodedImage = (url: string) => decodedSources.get(url);

function loadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = (error?: Error, source: DecodedSprite = image) => {
      if (settled) { if ('close' in source) source.close(); return; }
      settled = true;
      clearTimeout(timer);
      image.onload = image.onerror = null;
      if (error) { image.src = ''; reject(error); }
      else {
        decodedSources.set(url, source);
        if (source !== image) image.src = '';
        resolve();
      }
    };
    const timer = setTimeout(() => finish(new Error(`Image timeout: ${url}`)), 20000);
    image.onload = () => { void image.decode().then(async () => {
      let source: DecodedSprite = image;
      // A bitmap owns decoded pixels independently of the browser's CSS image cache.
      if (typeof createImageBitmap === 'function' && /animation-v3|atlas|seating-direction/.test(url)) {
        try { source = await createImageBitmap(image); } catch { /* Decoded image fallback. */ }
      }
      finish(undefined, source);
    }, () => finish(new Error(`Image decode: ${url}`))); };
    image.onerror = () => finish(new Error(`Image unavailable: ${url}`));
    image.src = url;
  });
}
const images = new ImageQueue(loadImage);
export const decodeImage = (url: string) => images.request(url);
